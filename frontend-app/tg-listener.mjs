import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const apiId = 24697673;
const apiHash = "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const session = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAULXpo//ar2SnhY50EXlbMjoRyak1cPvwTMmG/KZomUPL6U0vtpO/AjpRae2L1NlUEOrdFbKruILe5Q8UW9eQ2S8RutfY55rozrhD75ko6ap8O1l/g7GW1pvwUw7fNlCeYaFhkYnLLzphd4avmCJqyVDUHv/5qa1Au1XRJLMytvpnhH/3PxDHXsfZJbHvL9fzPLSiBL0/ieqOSPO6cRHuQM9STwtqHebDHvtNjRMKXpWGaxRQ0yyekj4TAyFsfFORf2batrqZpOO5RBO1J2A19rprS3/pjrHhuwhG1H5Pe92J3l8+FoDYbjVyFPEtIS/orwj7fKSePZVtu8LC4Xov1jk=");

const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

async function start() {
  await client.connect();
  console.log("🟢 Telegram UserBot успешно запущен и подключен к базе данных!");

  client.addEventHandler(async (event) => {
    const message = event.message;

    // Ловим только личные сообщения от людей (игнорируем каналы и групповые чаты)
    if (!message.isPrivate) return;

    try {
      const sender = await message.getSender();
      const senderId = message.senderId ? message.senderId.toString() : "unknown";
      const senderName = [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") || sender?.username || "Клиент Telegram";
      const phone = sender?.phone ? `+${sender.phone}` : null;
      const text = message.text || (message.media ? "[Медиа/Файл]" : "");

      console.log(`📩 Новое сообщение от ${senderName} (${senderId}): ${text}`);

      // 1. Ищем существующий диалог с этим клиентом или создаем новый
      const conversation = await prisma.conversation.upsert({
        where: { externalId: senderId },
        update: {
          lastMessage: text,
          lastActivity: new Date(),
          unreadCount: { increment: message.out ? 0 : 1 },
          clientName: senderName,
          phone: phone || undefined,
        },
        create: {
          channel: "TELEGRAM",
          externalId: senderId,
          senderName: senderName,
          clientName: senderName,
          phone: phone,
          lastMessage: text,
          lastActivity: new Date(),
          unreadCount: message.out ? 0 : 1,
        },
      });

      // 2. Записываем само сообщение в историю диалога
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: senderId,
          senderName: message.out ? "Менеджер" : senderName,
          senderType: message.out ? "MANAGER" : "CLIENT",
          text: text,
          isIncoming: !message.out,
          timestamp: new Date(message.date * 1000),
        },
      });

      console.log(`✅ Сообщение успешно сохранено в CRM для диалога ${conversation.id}`);
    } catch (err) {
      console.error("❌ Ошибка при сохранении сообщения в базу:", err);
    }
  }, new NewMessage({}));
}

start().catch(console.error);
