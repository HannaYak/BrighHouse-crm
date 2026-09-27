import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const EXPECTED_TOKEN = process.env.META_VERIFY_TOKEN || 'brighthouse_verify_token_2026';

  if (mode === 'subscribe' && token === EXPECTED_TOKEN) {
    return new Response(challenge || '', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.object === 'instagram' || body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender?.id;
          const text = messaging.message?.text;

          if (!senderId || !text || messaging.message?.is_echo) continue;

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
        }
      }
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal Error', { status: 500 });
  }
}
