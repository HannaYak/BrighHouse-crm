import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma'; // 4 уровня вверх

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request: Request) {
  try {
    const { conversationId, text } = await request.json();

    if (!conversationId || !text) {
      return NextResponse.json({ error: 'Не указан conversationId или текст' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Диалог не найден' }, { status: 404 });
    }

    if (conversation.channel === 'TELEGRAM' && TELEGRAM_BOT_TOKEN) {
      const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: conversation.externalId,
          text: text,
          parse_mode: 'HTML',
        }),
      });

      if (!tgRes.ok) {
        const errData = await tgRes.json();
        console.error('Telegram API error:', errData);
        return NextResponse.json({ error: 'Ошибка отправки в Telegram' }, { status: 500 });
      }
    }

    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        senderType: 'MANAGER',
        text,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
