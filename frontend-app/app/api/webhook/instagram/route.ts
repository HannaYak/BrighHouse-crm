import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const EXPECTED_TOKEN =
    process.env.META_VERIFY_TOKEN ||
    process.env.INSTAGRAM_VERIFY_TOKEN ||
    'brighthouse_verify_token_2026';

  console.log('--- Webhook Verification Attempt ---');
  console.log('Mode:', mode);
  console.log('Received Token:', token);

  if (mode === 'subscribe' && (token === EXPECTED_TOKEN || token === '12824Hanna' || token === 'brighthouse_chat_secret_2026')) {
    console.log('Webhook verification successful!');
    return new Response(challenge || '', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  console.warn('Webhook verification failed: token mismatch');
  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  console.log('--- Incoming Webhook POST from Meta ---');
  try {
    const rawBody = await request.text();

    if (!rawBody) {
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    const body = JSON.parse(rawBody);

    if (body.object === 'instagram' || body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const isEcho = Boolean(messaging.message?.is_echo);
          // Если сообщение отправлено с личного телефона из оригинального приложения Instagram (is_echo: true),
          // то sender - это аккаунт клининга, а recipient - клиент.
          const clientId = isEcho ? messaging.recipient?.id : messaging.sender?.id;
          const text = messaging.message?.text || (messaging.message?.attachments ? '📎 [Медиафайл / Фото]' : '');

          if (!clientId || !text) {
            continue;
          }

          console.log(`Processing ${isEcho ? 'исходящее (с телефона)' : 'входящее'} Instagram сообщение для ${clientId}: "${text}"`);

          let conversation = await prisma.conversation.findFirst({
            where: {
              externalId: String(clientId),
              channel: 'INSTAGRAM',
            },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                channel: 'INSTAGRAM',
                externalId: String(clientId),
                senderName: `Instagram Клиент (${String(clientId).slice(-4)})`,
                clientName: `Instagram Клиент`,
                lastMessage: text,
                unreadCount: isEcho ? 0 : 1,
              },
            });
          } else {
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                lastMessage: text,
                unreadCount: isEcho ? 0 : { increment: 1 },
                lastActivity: new Date(),
                updatedAt: new Date(),
              },
            });
          }

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: isEcho ? 'manager' : String(clientId),
              senderName: isEcho ? 'Менеджер (Instagram App)' : (conversation.senderName || 'Клиент'),
              senderType: isEcho ? 'MANAGER' : 'CLIENT',
              text,
              isIncoming: !isEcho,
              timestamp: new Date(messaging.timestamp || Date.now()),
            },
          });

          console.log(`✅ [Instagram] ${isEcho ? 'Исходящее с телефона' : 'Входящее'} сохранено в CRM для диалога ${conversation.id}`);
        }
      }
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    return new Response('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Error', { status: 500 });
  }
}
