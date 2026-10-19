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
          const isEcho = Boolean(event.message?.is_echo);
          // Если это ответ менеджера из приложения Instagram (is_echo: true), получатель - это клиент
          const clientId = isEcho ? event.recipient?.id : event.sender?.id;
          const messageText = event.message?.text || (event.message?.attachments ? '📎 [Медиафайл / Фото]' : '');

          if (clientId && messageText) {
            // Ищем или создаем диалог с этим клиентом
            const conversation = await prisma.conversation.upsert({
              where: { externalId: String(clientId) },
              update: {
                lastMessage: messageText,
                lastActivity: new Date(),
                updatedAt: new Date(),
                ...(isEcho ? {} : { unreadCount: { increment: 1 } }),
              },
              create: {
                channel: 'INSTAGRAM',
                externalId: String(clientId),
                senderName: `Instagram Клиент (${String(clientId).slice(-4)})`,
                clientName: `Instagram Клиент`,
                lastMessage: messageText,
                unreadCount: isEcho ? 0 : 1,
                status: 'NONE',
              },
            });

            // Сохраняем сообщение (входящее или исходящее с телефона)
            await prisma.message.create({
              data: {
                conversationId: conversation.id,
                senderId: isEcho ? 'manager' : String(clientId),
                senderName: isEcho ? 'Менеджер (Instagram App)' : (conversation.senderName || 'Клиент'),
                senderType: isEcho ? 'MANAGER' : 'CLIENT',
                text: messageText,
                isIncoming: !isEcho,
                timestamp: new Date(event.timestamp || Date.now()),
              },
            });

            console.log(`📩 [META IG] ${isEcho ? 'Исходящее с телефона' : 'Входящее'} от/для ${clientId}: ${messageText}`);
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
