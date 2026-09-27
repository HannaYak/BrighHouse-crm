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

  if (mode === 'subscribe' && token === EXPECTED_TOKEN) {
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
    console.log('Payload body:', rawBody);

    if (!rawBody) {
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    const body = JSON.parse(rawBody);

    if (body.object === 'instagram' || body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id;
          const text = messaging.message?.text;

          // Игнорируем эхо-сообщения (отправленные самой страницей)
          if (!senderId || !text || messaging.message?.is_echo) {
            continue;
          }

          console.log(`Processing message from ${senderId}: "${text}"`);

          let conversation = await prisma.conversation.findFirst({
            where: {
              externalId: senderId,
              channel: 'INSTAGRAM',
            },
          });

          if (!conversation) {
            conversation = await prisma.conversation.create({
              data: {
                channel: 'INSTAGRAM',
                externalId: senderId,
                senderName: `Instagram User (${senderId.slice(-4)})`,
                clientName: `Instagram Клиент`,
                lastMessage: text,
                unreadCount: 1,
              },
            });
          } else {
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: {
                lastMessage: text,
                unreadCount: { increment: 1 },
                lastActivity: new Date(),
              },
            });
          }

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId,
              senderName: conversation.senderName || 'Клиент',
              senderType: 'CLIENT',
              text,
              isIncoming: true,
              timestamp: new Date(),
            },
          });

          console.log(`Saved message to database for conversation ${conversation.id}`);
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
