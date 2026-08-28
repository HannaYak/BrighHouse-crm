import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [order, settings] = await Promise.all([
      prisma.order.findUnique({
        where: { id },
        include: {
          assignedCleaners: {
            include: { cleaner: true }
          }
        }
      }),
      prisma.companySettings.findUnique({
        where: { id: 1 }
      })
    ]);

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const teamNames = order.assignedCleaners.map(ac => ac.cleaner?.name).filter(Boolean).join(' и ') || 'наша команда';

    const reviewMessage = `Здравствуйте, ${order.clientName || 'уважаемый клиент'}! 🌸

Сегодня у вас проводили уборку: **${teamNames}** ✨

Подскажите, пожалуйста, всё ли вам понравилось и довольны ли вы качеством уборки? Нам очень важно ваше мнение!

⭐ **Оцените, пожалуйста, качество от 1 до 5:**
• 5️⃣ — Всё идеально, чисто и вовремя
• 4️⃣ — Хорошо, но есть мелкие замечания
• 3️⃣ или ниже — Есть вопросы / нужно исправить

Если у вас есть минутка, будем безмерно благодарны за пару теплых слов в нашем профиле! 🌟`;

    let conversation = null;
    if (order.clientName) {
      conversation = await prisma.conversation.findFirst({
        where: {
          channel: 'TELEGRAM',
          clientName: order.clientName,
        }
      });
    }

    if (conversation?.externalId && TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: conversation.externalId,
          text: reviewMessage,
          parse_mode: 'Markdown'
        })
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'MANAGER',
          text: reviewMessage
        }
      });

      return NextResponse.json({ success: true, method: 'TELEGRAM_DIRECT' });
    }

    return NextResponse.json({
      success: true,
      method: 'MANUAL_COPY',
      messageText: reviewMessage
    });
  } catch (error) {
    console.error('Ошибка отправки запроса отзыва:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
