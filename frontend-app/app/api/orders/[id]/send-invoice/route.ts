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
      }),
      prisma.companySettings.findUnique({
        where: { id: 1 },
      }),
    ]);

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const company = settings || {
      companyName: 'BrightHouse Cleaning',
      bankName: 'Santander',
      accountNumber: '',
      blikPhone: '',
      recipientName: 'BrightHouse Cleaning',
    };

    // Ищем диалог клиента в Telegram
    let conversation = null;
    if (order.clientPhone) {
      conversation = await prisma.conversation.findFirst({
        where: {
          channel: 'TELEGRAM',
          OR: [
            { clientPhone: order.clientPhone },
            { clientName: order.clientName },
          ],
        },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invoiceUrl = `${appUrl}/api/orders/${order.id}/invoice`;

    const messageText = `Здравствуйте, ${order.clientName || 'уважаемый клиент'}! 🌸

Спасибо, что выбрали **${company.companyName}**! Ваша уборка успешно завершена. ✨

💰 **Сумма к оплате:** ${order.price} zł
📄 **Электронный счет и детализация:** ${invoiceUrl}

💳 **Реквизиты для оплаты:**
${company.blikPhone ? `• 📲 **BLIK на номер:** \`${company.blikPhone}\`\n` : ''}${company.accountNumber ? `• 🏦 **Банковский счет (IBAN):** \`${company.accountNumber}\` (${company.bankName})\n• **Получатель:** ${company.recipientName || company.companyName}\n` : ''}• **Назначение платежа:** \`Rachunek ${order.orderNumber}\`

Будем очень благодарны за ваш отзыв! ☺️`;

    // Если есть привязанный чат в Telegram — отправляем через бота
    if (conversation?.externalId && TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: conversation.externalId,
          text: messageText,
          parse_mode: 'Markdown',
        }),
      });

      // Сохраняем отправленный счет в историю диалога
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: 'MANAGER',
          text: messageText,
        },
      });

      return NextResponse.json({ success: true, method: 'TELEGRAM_DIRECT' });
    }

    // Если прямого чата нет — возвращаем сформированный текст для отправки
    return NextResponse.json({
      success: true,
      method: 'MANUAL_COPY',
      messageText,
    });
  } catch (error) {
    console.error('Ошибка отправки счета:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
