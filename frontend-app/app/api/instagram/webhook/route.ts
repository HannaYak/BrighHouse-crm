import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// 1. Верификация вебхука от Meta
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === '12824Hanna') {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Forbidden', { status: 403 });
}

// 2. Прием сообщений из Instagram Direct (и входящих от клиентов, и исходящих из приложения)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const entry = body.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (messaging && messaging.message) {
      const isEcho = Boolean(messaging.message.is_echo);
      // Если это эхо (ответ со страницы), внешний ID клиента — это recipient, иначе sender
      const externalId = isEcho ? messaging.recipient.id : messaging.sender.id;
      const text = messaging.message.text || (messaging.message.attachments ? '📎 Прикрепленный файл' : '');

      if (text && externalId) {
        const existingConv = await prisma.conversation.findUnique({
          where: { externalId },
        });

        const currentUnread = existingConv?.unreadCount || 0;
        const newUnread = isEcho ? 0 : currentUnread + 1;

        const conversation = await prisma.conversation.upsert({
          where: { externalId },
          update: {
            lastMessage: text,
            lastActivity: new Date(),
            updatedAt: new Date(),
            unreadCount: newUnread,
          },
          create: {
            channel: 'INSTAGRAM',
            externalId,
            senderName: `Instagram пользователь`,
            clientName: `Instagram пользователь`,
            lastMessage: text,
            lastActivity: new Date(),
            updatedAt: new Date(),
            unreadCount: isEcho ? 0 : 1,
            status: 'NONE',
          },
        });

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: isEcho ? 'manager' : externalId,
            senderName: isEcho ? 'Менеджер' : 'Клиент',
            senderType: isEcho ? 'MANAGER' : 'CLIENT',
            text,
            isIncoming: !isEcho,
            timestamp: new Date(messaging.timestamp || Date.now()),
          },
        });

        console.log(`✅ [Instagram] ${isEcho ? 'Исходящее' : 'Входящее'} сообщение сохранено в диалог ${conversation.id}`);
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error('Error handling Instagram webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
