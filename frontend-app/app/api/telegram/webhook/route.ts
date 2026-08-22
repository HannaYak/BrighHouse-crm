import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    const sendMessage = async (reply: string) => {
      if (!token) return;
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'Markdown' }),
      });
    };

    // Если команда /start с кодом (например: /start 123456) или просто 6-значный код
    let pinCandidate = text;
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      if (parts.length > 1) {
        pinCandidate = parts[1].trim();
      } else {
        await sendMessage('👋 Привет! Отправь мне свой **6-значный PIN-код** из CRM BrightHouse, чтобы привязать профиль к заказам.');
        return NextResponse.json({ ok: true });
      }
    }

    // Ищем клинера по PIN-коду
    const cleaner = await prisma.cleaner.findFirst({
      where: { authCode: pinCandidate },
    });

    if (cleaner) {
      await prisma.cleaner.update({
        where: { id: cleaner.id },
        data: {
          telegramChatId: chatId,
          authCode: null, // Сбрасываем использованный код
        },
      });

      await sendMessage(`✅ *Успешно привязано!*\n\nПривет, ${cleaner.name}! Теперь сюда будут приходить все назначенные заказы, адреса с навигацией и данные напарников.`);
    } else {
      await sendMessage('❌ Код не найден или устарел. Запроси новый PIN-код в CRM BrightHouse в разделе «Справочники».');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ошибка webhook Telegram:', error);
    return NextResponse.json({ ok: true });
  }
}
