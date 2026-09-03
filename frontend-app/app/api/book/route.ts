import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// Преобразование любого названия услуги в валидный enum базы данных
function mapServiceType(input?: string): 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR' {
  if (!input) return 'STANDARD';
  const val = input.toUpperCase();
  if (val.includes('PLUS') || val.includes('СТАНДАРТ+')) return 'STANDARD_PLUS';
  if (val.includes('GENERAL') || val.includes('ГЕНЕРАЛЬН')) return 'GENERAL';
  if (val.includes('REPAIR') || val.includes('РЕМОНТ') || val.includes('POST_CONSTRUCTION')) return 'AFTER_REPAIR';
  return 'STANDARD';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clientName,
      clientPhone,
      addressLine1,
      serviceType,
      roomsCount,
      bathroomsCount,
      areaM2,
      price,
      date,
      startTime,
      notes,
      windowsCount,
      hasOven,
      hasFridge,
      hasMicrowave,
      hasKitchenClosets,
      hasDishesHours,
      hasBalcony,
      hasIroningHours,
      hasPets,
    } = body;

    if (!clientName || !clientPhone || !addressLine1) {
      return NextResponse.json(
        { error: 'Имя, телефон и адрес обязательны для заполнения' },
        { status: 400 }
      );
    }

    const datePrefix = new Date().toISOString().slice(2, 7).replace('-', '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `BH-${datePrefix}-${randomSuffix}`;

    const slot = startTime ? `${startTime} — 14:00` : '10:00 — 14:00';
    const orderDate = date ? new Date(date) : new Date();
    const dateFormatted = orderDate.toLocaleDateString('ru-RU');

    // Сохраняем заказ в строгом соответствии с prisma/schema.prisma
    const newOrder = await prisma.order.create({
      data: {
        orderNumber,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        addressLine1: addressLine1.trim(),
        serviceType: mapServiceType(serviceType),
        roomsCount: Number(roomsCount) || 1,
        bathroomsCount: Number(bathroomsCount) || 1,
        areaM2: Number(areaM2) || 45,
        windowsCount: Number(windowsCount) || 0,
        price: Number(price) || 0,
        date: orderDate,
        timeSlot: slot,
        status: 'NEW',
        notes: notes ? `Онлайн-бронирование: ${notes}` : 'Онлайн-бронирование через сайт',
        // Булевы флаги дополнительных опций
        hasOven: Boolean(hasOven),
        hasFridge: Boolean(hasFridge),
        hasMicrowave: Boolean(hasMicrowave),
        hasKitchenClosets: Boolean(hasKitchenClosets),
        hasBalcony: Boolean(hasBalcony),
        hasPets: Boolean(hasPets),
        hasDishes: Boolean(hasDishesHours),
        hasIroning: Boolean(hasIroningHours),
      },
    });

    // Отправка уведомления администратору в Telegram
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_CHAT_ID) {
      const adminMessage = `🔔 *НОВАЯ ОНЛАЙН-ЗАЯВКА С САЙТА!*

📋 *Номер:* \`${orderNumber}\`
👤 *Клиент:* ${clientName.trim()}
📞 *Телефон:* \`${clientPhone.trim()}\`
📍 *Адрес:* ${addressLine1.trim()}
✨ *Тариф:* ${serviceType || 'Стандарт'}
📅 *Дата и время:* ${dateFormatted} (${slot})
💰 *Сумма:* ${price} zł

📝 *Доп. опции / Комментарий:*
${notes || 'Без комментариев'}`;

      const crmUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brighthouse.onrender.com';

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_ADMIN_CHAT_ID,
          text: adminMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📋 Открыть Канбан в CRM',
                  url: `${crmUrl}/kanban`,
                },
              ],
            ],
          },
        }),
      }).catch((err) => console.error('Ошибка отправки уведомления в Telegram админу:', err));
    }

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания онлайн-заявки:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
