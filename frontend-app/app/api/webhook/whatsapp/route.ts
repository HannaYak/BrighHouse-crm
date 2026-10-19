import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

// 1. Верификация вебхука от Meta (Handshake)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const EXPECTED_TOKENS = [
    process.env.META_VERIFY_TOKEN,
    process.env.WHATSAPP_VERIFY_TOKEN,
    process.env.INSTAGRAM_VERIFY_TOKEN,
    'brighthouse_verify_token_2026',
    'brighthouse_chat_secret_2026',
  ].filter(Boolean);

  if (mode === 'subscribe' && EXPECTED_TOKENS.includes(token)) {
    console.log('✅ WhatsApp Meta Webhook успешно верифицирован!');
    return new Response(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('❌ Ошибка верификации WhatsApp Webhook: неверный verify_token');
  return new Response('Forbidden', { status: 403 });
}

// 2. Прием входящих сообщений WhatsApp от Meta Cloud API
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    const body = JSON.parse(rawBody);

    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];

      for (const entry of entries) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value || {};
            const contacts = value.contacts || [];
            const messages = value.messages || [];

            for (const msg of messages) {
              const senderPhone = (msg.from || '').replace(/\D/g, '');
              if (!senderPhone) continue;

              const contact = contacts.find((c: any) => c.wa_id === msg.from);
              const clientName = contact?.profile?.name || `+${senderPhone}`;

              let text = '';
              if (msg.type === 'text') {
                text = msg.text?.body || '';
              } else if (msg.type === 'image') {
                text = msg.image?.caption || '📷 Фотография';
              } else if (msg.type === 'video') {
                text = msg.video?.caption || '📹 Видео';
              } else if (msg.type === 'audio') {
                text = '🎤 Голосовое сообщение';
              } else if (msg.type === 'document') {
                text = `📄 Документ: ${msg.document?.filename || 'файл'}`;
              } else if (msg.type === 'button') {
                text = msg.button?.text || '';
              } else if (msg.type === 'interactive') {
                text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
              } else if (msg.type === 'location') {
                text = '📍 Геолокация';
              } else {
                text = `[${msg.type}]`;
              }

              if (!text) continue;

              console.log(`📥 [META WA] Входящее от ${clientName} (+${senderPhone}): "${text}"`);

              const targetExternalId = `${senderPhone}@s.whatsapp.net`;

              // Ищем существующий диалог
              const existingConv = await prisma.conversation.findFirst({
                where: {
                  OR: [
                    { externalId: targetExternalId },
                    { phone: `+${senderPhone}` },
                    { phone: senderPhone },
                  ],
                },
              });

              let convId = existingConv?.id;

              if (existingConv) {
                await prisma.conversation.update({
                  where: { id: existingConv.id },
                  data: {
                    lastMessage: text,
                    lastActivity: new Date(),
                    updatedAt: new Date(),
                    unreadCount: { increment: 1 },
                    phone: `+${senderPhone}`,
                    ...(clientName && !existingConv.clientName?.includes('+') ? {} : { clientName }),
                  },
                });
              } else {
                const newConv = await prisma.conversation.create({
                  data: {
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
                convId = newConv.id;
              }

              // Сохраняем сообщение
              if (convId) {
                await prisma.message.create({
                  data: {
                    conversationId: convId,
                    senderId: senderPhone,
                    senderName: clientName,
                    senderType: 'CLIENT',
                    text,
                    isIncoming: true,
                    timestamp: msg.timestamp 
                      ? new Date(Number(msg.timestamp) * 1000) 
                      : new Date(),
                  },
                });
                console.log(`✅ [META WA OK] Сохранено в диалог ${convId}`);
              }
            }
          }
        }
      }

      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка в WhatsApp Webhook handler:', error.message);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}
