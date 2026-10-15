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

    // 1. Отправка в Telegram
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

    // 2. Отправка в WhatsApp через локальный шлюз (порт 3001)
    if (conversation.channel === 'WHATSAPP') {
      try {
        const waRes = await fetch('http://127.0.0.1:3001/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: conversation.externalId,
            text: text,
          }),
        });

        if (!waRes.ok) {
          const errData = await waRes.json().catch(() => ({}));
          console.error('WhatsApp Gateway error:', errData);
          return NextResponse.json(
            { error: errData.error || 'Ошибка отправки в WhatsApp' },
            { status: 500 }
          );
        }
      } catch (err: any) {
        console.error('Не удалось связаться со шлюзом WhatsApp:', err.message);
        return NextResponse.json(
          { error: 'Слушатель WhatsApp не отвечает или сокет отключен' },
          { status: 503 }
        );
      }
    }

    // 3. Сохранение сообщения менеджера в CRM
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        senderType: 'MANAGER',
        text,
      },
    });

    // 4. Обновление диалога (последнее сообщение и время)
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: text,
        lastActivity: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
