import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';
import fs from 'fs';
import path from 'path';

const apiId = 24697673;
const apiHash = "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const session = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAULXpo//ar2SnhY50EXlbMjoRyak1cPvwTMmG/KZomUPL6U0vtpO/AjpRae2L1NlUEOrdFbKruILe5Q8UW9eQ2S8RutfY55rozrhD75ko6ap8O1l/g7GW1pvwUw7fNlCeYaFhkYnLLzphd4avmCJqyVDUHv/5qa1Au1XRJLMytvpnhH/3PxDHXsfZJbHvL9fzPLSiBL0/ieqOSPO6cRHuQM9STwtqHebDHvtNjRMKXpWGaxRQ0yyekj4TAyFsfFORf2batrqZpOO5RBO1J2A19rprS3/pjrHhuwhG1H5Pe92J3l8+FoDYbjVyFPEtIS/orwj7fKSePZVtu8LC4Xov1jk=");

let tgSenderClient: TelegramClient | null = null;

async function getTelegramSender() {
  if (!tgSenderClient) {
    tgSenderClient = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });
    await tgSenderClient.connect();
  } else if (!tgSenderClient.connected) {
    await tgSenderClient.connect();
  }
  return tgSenderClient;
}

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { lastActivity: 'desc' },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Ошибка загрузки чатов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let conversationId = '';
    let text = '';
    let uploadedFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      conversationId = (formData.get('conversationId') as string) || '';
      text = (formData.get('text') as string) || '';
      uploadedFile = formData.get('file') as File | null;
    } else {
      const body = await request.json();
      conversationId = body.conversationId;
      text = body.text || '';
    }

    if (!conversationId) {
      return NextResponse.json({ error: 'ID диалога обязателен' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Диалог не найден' }, { status: 404 });
    }

    let savedText = text;
    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let isVoice = false;

    // Если менеджер прикрепил файл или записал голосовое
    if (uploadedFile) {
      const bytes = await uploadedFile.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      const isAudio = uploadedFile.type.includes('audio') || uploadedFile.name.endsWith('.webm') || uploadedFile.name.endsWith('.ogg');
      const isVideo = uploadedFile.type.includes('video');
      let type = isAudio ? 'voice' : isVideo ? 'video' : 'photo';
      let ext = isAudio ? 'ogg' : isVideo ? 'mp4' : 'jpg';

      isVoice = isAudio;
      fileName = `out_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

      const mediaDir = path.resolve(process.cwd(), 'public', 'chat-media');
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }

      fs.writeFileSync(path.join(mediaDir, fileName), fileBuffer);
      const fileUrl = `/chat-media/${fileName}`;
      const caption = text ? ` ${text}` : '';
      savedText = `[MEDIA:${type}:${fileUrl}]${caption}`;
    }

    // Сохраняем сообщение менеджера в базу CRM
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: 'manager',
        senderType: 'MANAGER',
        senderName: 'Менеджер',
        text: savedText,
        isIncoming: false,
        timestamp: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: savedText,
        lastActivity: new Date(),
        updatedAt: new Date(),
      },
    });

    // Отправка в реальный Telegram клиенту
    if (conversation.channel === 'TELEGRAM' && conversation.externalId) {
      const client = await getTelegramSender();

      if (fileBuffer) {
        const toUpload = new CustomFile(fileName, fileBuffer.length, '', fileBuffer);
        const uploaded = await client.uploadFile({
          file: toUpload,
          workers: 1,
        });

        await client.sendFile(conversation.externalId, {
          file: uploaded,
          caption: text || undefined,
          voiceNote: isVoice,
        });
      } else if (text) {
        await client.sendMessage(conversation.externalId, { message: text });
      }
    }

    return NextResponse.json(savedMessage, { status: 201 });
  } catch (error) {
    console.error('Ошибка отправки:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
