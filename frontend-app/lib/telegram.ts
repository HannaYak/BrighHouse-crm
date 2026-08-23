import { prisma } from './prisma';

export interface TelegramOrderPayload {
  orderId?: string;
  orderNumber: string;
  date: string;
  timeSlot: string;
  serviceType: string;
  areaM2: number;
  roomsCount: number;
  bathroomsCount: number;
  windowsCount: number;
  addressLine1: string;
  addressLine2?: string;
  price: number;
  assignedCleaners: { id: number; name: string }[];
  tags: {
    oven?: boolean;
    fridge?: boolean;
    microwave?: boolean;
    balcony?: boolean;
    dishes?: boolean;
    ironing?: boolean;
    vacuum?: boolean;
    pets?: boolean;
    keys?: boolean;
  };
  notes?: string;
}

export async function sendPersonalOrderNotification(order: TelegramOrderPayload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { success: false, reason: 'TELEGRAM_BOT_TOKEN missing' };

  const cleanerIds = order.assignedCleaners.map((c) => c.id);
  const cleaners = await prisma.cleaner.findMany({
    where: { id: { in: cleanerIds } },
  });

  const fullAddress = `${order.addressLine1}${order.addressLine2 ? ', ' + order.addressLine2 : ''}`;
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.addressLine1)}`;

  const addOns = [
    order.tags.oven ? '🍳 Духовка' : null,
    order.tags.fridge ? '❄️ Холодильник' : null,
    order.tags.microwave ? '📡 СВЧ' : null,
    order.tags.balcony ? '🌿 Балкон' : null,
    order.tags.dishes ? '🍽️ Посуда' : null,
    order.tags.ironing ? '👔 Глажка' : null,
    order.tags.vacuum ? '🔌 Пылесос с собой' : null,
    order.tags.pets ? '🐾 Животные' : null,
    order.tags.keys ? '🔑 Забрать/отдать ключи' : null,
  ].filter(Boolean).join('\n• ');

  for (const cleaner of cleaners) {
    if (!cleaner.telegramChatId) continue;

    const teammates = cleaners
      .filter((c) => c.id !== cleaner.id)
      .map((c) => `${c.name} (${c.phone})`)
      .join(', ');

    const messageText = `✨ *НОВЫЙ НАЗНАЧЕННЫЙ ЗАКАЗ: ${order.orderNumber}*

📅 *Дата:* ${order.date}
⏱️ *Время:* ${order.timeSlot}
🧹 *Тариф:* ${order.serviceType} (${order.areaM2} м², ${order.roomsCount} комн., ${order.bathroomsCount} с/у, ${order.windowsCount} окон)

📍 *Адрес:* [${fullAddress}](${mapLink})

👥 *Напарники:* ${teammates ? teammates : 'Один на заказе'}

${addOns ? `📋 *Доп. услуги:*\n• ${addOns}` : ''}
${order.notes ? `\n📝 *ТЗ / Заметки:* ${order.notes}` : ''}

💰 *Сумма заказа:* ${order.price} zł`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '✅ Приняла заказ',
            callback_data: `accept_${order.orderId || order.orderNumber}_${cleaner.id}`,
          },
        ],
      ],
    };

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleaner.telegramChatId,
          text: messageText,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup,
          disable_web_page_preview: false,
        }),
      });
    } catch (err) {
      console.error(`Ошибка отправки клинеру ${cleaner.name}:`, err);
    }
  }

  return { success: true };
}
