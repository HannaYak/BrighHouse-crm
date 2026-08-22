export interface TelegramOrderNotification {
  orderNumber: string;
  date: string;
  timeSlot: string;
  address: string;
  price: number;
  tags: { vacuum?: boolean; pets?: boolean; keys?: boolean };
  notes?: string;
}

export async function sendTelegramOrderNotification(order: TelegramOrderNotification) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не настроены в Environment');
    return { success: false, reason: 'Credentials missing' };
  }

  const tagsList = [
    order.tags.vacuum ? '🔌 Пылесос' : null,
    order.tags.pets ? '🐾 Животные' : null,
    order.tags.keys ? '🔑 Ключи' : null,
  ].filter(Boolean).join(' | ') || 'Обычные условия';

  const messageText = `✨ *НОВЫЙ ЗАКАЗ: ${order.orderNumber}*
📅 *Дата:* ${order.date}
⏱️ *Время:* ${order.timeSlot}
📍 *Адрес:* ${order.address}
💰 *Стоимость:* ${order.price} zł
🏷️ *Особенности:* ${tagsList}
${order.notes ? `📝 *ТЗ / Заметки:* ${order.notes}` : ''}`;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (error) {
    console.error('Ошибка отправки сообщения в Telegram:', error);
    return { success: false, error };
  }
}
