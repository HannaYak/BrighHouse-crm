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

    // 1. Отправка в Telegram (если настроен бот)
    if (conversation.channel === 'TELEGRAM' && TELEGRAM_BOT_TOKEN) {
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: conversation.externalId,
            text,
            parse_mode: 'HTML',
          }),
        });
      } catch (tgErr: any) {
        console.warn('Telegram send error:', tgErr.message);
      }
    }

    // 2. Отправка в Instagram Direct (если есть токен Meta Graph API)
    if (conversation.channel === 'INSTAGRAM') {
      const metaToken =
        process.env.META_ACCESS_TOKEN ||
        process.env.INSTAGRAM_ACCESS_TOKEN ||
        process.env.PAGE_ACCESS_TOKEN ||
        process.env.WHATSAPP_ACCESS_TOKEN;

      if (metaToken && conversation.externalId) {
        try {
          await fetch('https://graph.facebook.com/v20.0/me/messages', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${metaToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recipient: { id: conversation.externalId },
              message: { text },
            }),
          });
        } catch (igErr: any) {
          console.warn('Instagram send warning:', igErr.message);
        }
      }
    }

    // 3. Отправка в WhatsApp (если настроен Meta Cloud API)
    if (conversation.channel === 'WHATSAPP') {
      const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const cleanPhone = (conversation.phone || conversation.externalId || '').replace(/\D/g, '');

      if (waToken && waPhoneId && cleanPhone) {
        try {
          await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${waToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone,
              type: 'text',
              text: { body: text },
            }),
          });
        } catch (metaErr: any) {
          console.warn('Meta WhatsApp API warning:', metaErr.message);
        }
      }
    }

    // 4. ВСЕГДА гарантированно сохраняем исходящее сообщение в базе CRM
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: 'manager',
        senderName: 'Менеджер',
        senderType: 'MANAGER',
        text,
        isIncoming: false,
        timestamp: new Date(),
      },
    });

    // 5. Обновляем статус диалога в CRM
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
