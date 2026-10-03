import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

// Получение списка диалогов и сообщений
export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { lastActivity: 'desc' }, // Сортируем по реальной активности последнего сообщения
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Ошибка загрузки чатов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// Отправка ответа клиенту из CRM (в Telegram или Instagram)
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

    // Сохраняем сообщение в базу
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: 'manager',
        senderType: 'MANAGER',
        senderName: 'Диспетчер',
        text: text,
        isIncoming: false,
        timestamp: new Date(),
      },
    });

    // Обновляем последнее сообщение в диалоге
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: text,
        lastActivity: new Date(),
      },
    });

    // 1. Отправка клиенту в Telegram
    if (conversation.channel === 'TELEGRAM' && conversation.externalId && TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: conversation.externalId,
          text: text,
        }),
      });
    }

    // 2. Отправка клиенту в Instagram Direct
    if (conversation.channel === 'INSTAGRAM' && conversation.externalId && META_PAGE_ACCESS_TOKEN) {
      await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${META_PAGE_ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: conversation.externalId },
          message: { text: text },
        }),
      });
    }

    return NextResponse.json(savedMessage, { status: 201 });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
