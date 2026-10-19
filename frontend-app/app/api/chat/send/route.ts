import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request: Request) {
  try {
    const { conversationId, text, channel, phone, recipientName } = await request.json();

    if (!text || (!conversationId && !phone)) {
      return NextResponse.json({ error: 'Укажите текст и диалог либо номер телефона' }, { status: 400 });
    }

    let conversation: any = null;

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    } else if (phone) {
      // Создаем новый диалог по прямому номеру
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const externalId = channel === 'WHATSAPP' 
        ? `${cleanPhone.replace('+', '')}@s.whatsapp.net` 
        : cleanPhone;

      conversation = await prisma.conversation.upsert({
        where: { externalId },
        update: {
          lastMessage: text,
          lastActivity: new Date(),
          updatedAt: new Date(),
        },
        create: {
          channel: channel || 'WHATSAPP',
          externalId,
          senderName: recipientName || cleanPhone,
          clientName: recipientName || cleanPhone,
          phone: cleanPhone,
          lastMessage: text,
          lastActivity: new Date(),
          updatedAt: new Date(),
          unreadCount: 0,
          status: 'NONE',
        },
      });
    }

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
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!tgRes.ok) {
        const errData = await tgRes.json().catch(() => ({}));
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
            to: conversation.phone 
              ? `${conversation.phone.replace(/\D/g, '')}@s.whatsapp.net` 
              : conversation.externalId,
            phone: conversation.phone,
            conversationId: conversation.id,
            text,
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

    // 3. Сохранение сообщения в базе данных
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: 'manager',
        senderName: 'Менеджер',
        senderType: 'MANAGER',
        text,
        isIncoming: false,
      },
    });

    // 4. Обновление диалога
    await prisma.conversation.update({
      where: { id: conversation.id },
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
