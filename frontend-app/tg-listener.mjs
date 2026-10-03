import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const apiId = 24697673;
const apiHash = "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const session = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAULXpo//ar2SnhY50EXlbMjoRyak1cPvwTMmG/KZomUPL6U0vtpO/AjpRae2L1NlUEOrdFbKruILe5Q8UW9eQ2S8RutfY55rozrhD75ko6ap8O1l/g7GW1pvwUw7fNlCeYaFhkYnLLzphd4avmCJqyVDUHv/5qa1Au1XRJLMytvpnhH/3PxDHXsfZJbHvL9fzPLSiBL0/ieqOSPO6cRHuQM9STwtqHebDHvtNjRMKXpWGaxRQ0yyekj4TAyFsfFORf2batrqZpOO5RBO1J2A19rprS3/pjrHhuwhG1H5Pe92J3l8+FoDYbjVyFPEtIS/orwj7fKSePZVtu8LC4Xov1jk=");

const mediaDir = path.resolve(process.cwd(), "chat-storage");
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

async function start() {
  await client.connect();
  console.log("🟢 Telegram UserBot успешно запущен и слушает личные сообщения!");

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message.isPrivate) return;

    try {
      const sender = await message.getSender();
      const senderId = message.senderId ? message.senderId.toString() : "unknown";
      const senderName = [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") || sender?.username || "Клиент Telegram";
      const phone = sender?.phone ? `+${sender.phone}` : null;
      
      let rawText = message.text || message.message || "";

      // 1. Проверяем, является ли это ответом (reply/цитатой) на другое сообщение
      let replyPrefix = "";
      if (message.replyTo) {
        try {
          const repliedMsg = await message.getReplyMessage();
          if (repliedMsg) {
            const originalSender = (await repliedMsg.getSender())?.firstName || "сообщение";
            const quoteSnippet = (repliedMsg.text || repliedMsg.message || "[Медиа/Файл]").slice(0, 45);
            replyPrefix = `💬 [Ответ на «${quoteSnippet}»]:\n`;
          }
        } catch (e) {
          console.warn("Не удалось извлечь цитируемое сообщение:", e);
        }
      }

      let messageContent = replyPrefix + rawText;

      // 2. Обработка прикрепленных файлов (фото, видео, голосовые)
      if (message.media) {
        try {
          const buffer = await client.downloadMedia(message);
          if (buffer) {
            let ext = "jpg";
            let type = "photo";

            const mime = message.media.document?.mimeType || "";
            const isRoundVideo = message.media.document?.attributes?.some(
              (a) => a.className === "DocumentAttributeVideo" && a.roundMessage
            );
            const isVoice = message.media.document?.attributes?.some(
              (a) => a.className === "DocumentAttributeAudio" && a.voice
            );

            if (isRoundVideo) {
              type = "round_video";
              ext = "mp4";
            } else if (isVoice || mime.includes("ogg") || mime.includes("audio")) {
              type = "voice";
              ext = "ogg";
            } else if (mime.includes("video") || message.video) {
              type = "video";
              ext = "mp4";
            }

            const fileName = `tg_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const filePath = path.join(mediaDir, fileName);
            fs.writeFileSync(filePath, buffer);

            const fileUrl = `/api/media/${fileName}`;
            const caption = rawText ? ` ${rawText}` : "";
            messageContent = `${replyPrefix}[MEDIA:${type}:${fileUrl}]${caption}`;
          }
        } catch (mediaErr) {
          console.error("Ошибка сохранения медиафайла:", mediaErr);
          if (!messageContent) messageContent = `${replyPrefix}[Медиафайл]`;
        }
      }

      // Если в сообщении совсем нет текста и медиа (пустой реплай)
      if (!messageContent.trim()) {
        messageContent = `${replyPrefix}[Ответ на сообщение]`;
      }

      console.log(`📩 Новое сообщение от ${senderName} (${senderId}): ${messageContent}`);

      const conversation = await prisma.conversation.upsert({
        where: { externalId: senderId },
        update: {
          lastMessage: messageContent,
          lastActivity: new Date(),
          updatedAt: new Date(),
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
          lastMessage: messageContent,
          lastActivity: new Date(),
          updatedAt: new Date(),
          unreadCount: message.out ? 0 : 1,
        },
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: senderId,
          senderName: message.out ? "Менеджер" : senderName,
          senderType: message.out ? "MANAGER" : "CLIENT",
          text: messageContent,
          isIncoming: !message.out,
          timestamp: new Date(message.date * 1000),
        },
      });

      console.log(`✅ Сообщение сохранено в CRM для диалога ${conversation.id}`);
    } catch (err) {
      console.error("❌ Ошибка при обработке входящего сообщения:", err);
    }
  }, new NewMessage({}));
}

start().catch(console.error);
