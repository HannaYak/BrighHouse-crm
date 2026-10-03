import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const apiId = 24697673;
const apiHash = "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const session = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAULXpo//ar2SnhY50EXlbMjoRyak1cPvwTMmG/KZomUPL6U0vtpO/AjpRae2L1NlUEOrdFbKruILe5Q8UW9eQ2S8RutfY55rozrhD75ko6ap8O1l/g7GW1pvwUw7fNlCeYaFhkYnLLzphd4avmCJqyVDUHv/5qa1Au1XRJLMytvpnhH/3PxDHXsfZJbHvL9fzPLSiBL0/ieqOSPO6cRHuQM9STwtqHebDHvtNjRMKXpWGaxRQ0yyekj4TAyFsfFORf2batrqZpOO5RBO1J2A19rprS3/pjrHhuwhG1H5Pe92J3l8+FoDYbjVyFPEtIS/orwj7fKSePZVtu8LC4Xov1jk=");

// Одиночный инстанс клиента для отправки сообщений
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

// Получение диалогов
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

// Отправка ответа клиенту из CRM
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, text } = body;

    if (!conversationId || !text) {
      return NextResponse.json({ error: 'ID диалога и текст обязательны' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Диалог не найден' }, { status: 404 });
    }

    // 1. Сохраняем исходящее сообщение менеджера в базу CRM
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: 'manager',
        senderType: 'MANAGER',
        senderName: 'Менеджер',
        text: text,
        isIncoming: false,
        timestamp: new Date(),
      },
    });

    // 2. Обновляем статус диалога
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: text,
        lastActivity: new Date(),
        updatedAt: new Date(),
      },
    });

    // 3. Отправка в реальный Telegram клиенту через UserBot
    if (conversation.channel === 'TELEGRAM' && conversation.externalId) {
      try {
        const client = await getTelegramSender();
        // Отправляем сообщение в чат по externalId (id пользователя Telegram)
        await client.sendMessage(conversation.externalId, { message: text });
        console.log(`🚀 Успешно отправлен ответ в Telegram пользователю ${conversation.externalId}`);
      } catch (tgErr: any) {
        console.error('Ошибка отправки сообщения через Telegram UserBot:', tgErr.message);
      }
    }

    return NextResponse.json(savedMessage, { status: 201 });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
