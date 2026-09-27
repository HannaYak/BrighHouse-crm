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
            await prisma.chatMessage.create({
              data: {
                conversationId: conversation.id,
                senderId: String(senderId),
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

    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  } catch (error) {
    console.error('Ошибка при обработке сообщения Meta:', error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}
