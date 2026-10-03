import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";

const apiId = 24697673;
const apiHash = "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const session = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAULXpo//ar2SnhY50EXlbMjoRyak1cPvwTMmG/KZomUPL6U0vtpO/AjpRae2L1NlUEOrdFbKruILe5Q8UW9eQ2S8RutfY55rozrhD75ko6ap8O1l/g7GW1pvwUw7fNlCeYaFhkYnLLzphd4avmCJqyVDUHv/5qa1Au1XRJLMytvpnhH/3PxDHXsfZJbHvL9fzPLSiBL0/ieqOSPO6cRHuQM9STwtqHebDHvtNjRMKXpWGaxRQ0yyekj4TAyFsfFORf2batrqZpOO5RBO1J2A19rprS3/pjrHhuwhG1H5Pe92J3l8+FoDYbjVyFPEtIS/orwj7fKSePZVtu8LC4Xov1jk=");

const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

async function start() {
  await client.connect();
  console.log("🟢 Telegram UserBot успешно запущен и слушает личные сообщения!");

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message.isPrivate) return;

    const sender = await message.getSender();
    const senderId = message.senderId?.toString();
    const senderName = [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") || sender?.username || "Клиент Telegram";
    const text = message.text;

    console.log(`📩 Новое сообщение от ${senderName} (${senderId}): ${text}`);
  }, new NewMessage({}));
}

start().catch(console.error);
