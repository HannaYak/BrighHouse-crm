import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Токен валидации, который ты ввела в Meta
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'brighthouse_chat_secret_2026';

// 1. Meta проверяет подлинность вебхука (Handshake)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Meta Webhook успешно верифицирован!');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  } catch (error) {
    console.error('Ошибка верификации Meta Webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 2. Meta присылает входящие сообщения из Instagram Direct
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Проверяем, что событие от Instagram
    if (body.object === 'instagram' || body.object === 'page') {
      const entries = body.entry || [];

      for (const entry of entries) {
        // Обработка сообщений
        const messaging = entry.messaging || [];
        for (const event of messaging) {
          const senderId = event.sender?.id;
          const messageText = event.message?.text;

          // Игнорируем эхо-сообщения (отправленные нами же)
          if (event.message?.is_echo) continue;

          if (senderId && messageText) {
            // Ищем или создаем диалог с этим клиентом
            const conversation = await prisma.conversation.upsert({
              where: { externalId: String(senderId) },
              update: {
                lastMessage: messageText,
                lastActivity: new Date(),
                unreadCount: { increment: 1 },
              },
              create: {
                channel: 'INSTAGRAM',
                externalId: String(senderId),
                senderName: `Instagram User (${senderId.slice(-4)})`,
                lastMessage: messageText,
                unreadCount: 1,
              },
            });

            // Сохраняем входящее сообщение
            await prisma.message.create({
  data: {
    conversationId: conversation.id,
    senderId: String(senderId),
    senderType: 'CLIENT',
    text: messageText,
    isIncoming: true,
  },
});

            console.log(`📩 Новое сообщение из Instagram от ${senderId}: ${messageText}`);
          }
        }
      }

      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      for (const entry of entries) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value || {};
            const contacts = value.contacts || [];
            for (const msg of value.messages || []) {
              const senderPhone = (msg.from || '').replace(/\D/g, '');
              if (!senderPhone) continue;

              const contact = contacts.find((c: any) => c.wa_id === msg.from);
              const clientName = contact?.profile?.name || `+${senderPhone}`;
              const text = msg.text?.body || msg.image?.caption || (msg.type === 'image' ? '📷 Фотография' : `[${msg.type}]`);
              if (!text) continue;

              const targetExternalId = `${senderPhone}@s.whatsapp.net`;
              const conversation = await prisma.conversation.upsert({
                where: { externalId: targetExternalId },
                update: {
                  lastMessage: text,
                  lastActivity: new Date(),
                  updatedAt: new Date(),
                  unreadCount: { increment: 1 },
                  phone: `+${senderPhone}`,
                },
                create: {
                  channel: 'WHATSAPP',
                  externalId: targetExternalId,
                  senderName: clientName,
                  clientName: clientName,
                  phone: `+${senderPhone}`,
                  lastMessage: text,
                  unreadCount: 1,
                  status: 'NONE',
                },
              });

              await prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  senderId: senderPhone,
                  senderName: clientName,
                  senderType: 'CLIENT',
                  text,
                  isIncoming: true,
                  timestamp: new Date(),
                },
              });
              console.log(`📩 [META WA] Сообщение от ${clientName} (+${senderPhone}): ${text}`);
            }
          }
        }
      }
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  } catch (error) {
    console.error('Ошибка при обработке сообщения Meta:', error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
