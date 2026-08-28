import { NextResponse } from 'next/server';

// 1. Верификация вебхука от Meta (когда ты жмешь "Verify and save")
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Проверяем токен, который ты укажешь в панели Meta
  if (mode === 'subscribe' && token === '12824Hanna') {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new Response('Forbidden', { status: 403 });
}

// 2. Прием входящих сообщений из Instagram Direct
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Здесь твоя CRM будет принимать сообщения и сохранять в базу
    console.log('Instagram webhook received:', JSON.stringify(body, null, 2));

    // Парсим входящее сообщение, если оно есть
    const messaging = body.entry?.[0]?.messaging?.[0];
    if (messaging && messaging.message) {
      const senderId = messaging.sender.id;
      const text = messaging.message.text;
      
      // Сюда можно подключить сохранение в модель Conversation (channel: 'INSTAGRAM')
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Error handling Instagram webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
