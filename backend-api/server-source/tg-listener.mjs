cat << 'EOF' > tg-listener.mjs
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";

const apiId = parseInt(process.env.TELEGRAM_API_ID || "24697673", 10);
const apiHash = process.env.TELEGRAM_API_HASH || "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const session = new StringSession(process.env.TELEGRAM_SESSION || "");

const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

async function startTelegramListener() {
  await client.connect();
  console.log("🟢 Telegram UserBot успешно запущен и слушает входящие сообщения!");

  client.addEventHandler(async (event) => {
    const message = event.message;

    // Игнорируем сообщения из публичных каналов и групп, ловим только личные диалоги
    if (!message.isPrivate) return;

    const sender = await message.getSender();
    const senderId = message.senderId?.toString();
    const senderName = [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") || sender?.username || "Клиент Telegram";
    const text = message.text;

    console.log(`📩 Новое сообщение от ${senderName} (${senderId}): ${text}`);

    // Пересылка во внутренний эндпоинт CRM для сохранения в базу
    try {
      await fetch("http://localhost:3000/api/chat/telegram-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId,
          senderName,
          username: sender?.username || null,
          phone: sender?.phone || null,
          text,
          date: message.date,
          out: message.out, // исходящее или входящее
        }),
      });
    } catch (err) {
      console.error("Ошибка передачи сообщения в базу CRM:", err.message);
    }
  }, new NewMessage({}));
}

startTelegramListener().catch(console.error);
EOF
