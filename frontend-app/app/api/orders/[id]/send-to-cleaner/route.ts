import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function formatOrderExtras(order: any): string[] {
  const extras: string[] = [];

  // 1. Техника и кухня
  if (order.hasOven) extras.push('Духовка');
  if (order.hasFridge) extras.push('Холодильник');
  if (order.hasFridgeFreeze) extras.push('Морозильная камера');
  if (order.hasMicrowave) extras.push('Микроволновка');
  if (order.hasKitchenClosets) extras.push('Кухонные шкафчики');

  // 2. Помещения и особенности
  if (order.hasBalcony) extras.push('Балкон');
  if (order.hasStairs) extras.push('Лестница');
  if (order.windowsCount > 0) extras.push(`Окна: ${order.windowsCount} шт`);

  // 3. Дополнительные часы
  if (order.hasDishesHours > 0) extras.push(`Мытье посуды (${order.hasDishesHours} ч)`);
  if (order.hasIroningHours > 0) extras.push(`Глажка (${order.hasIroningHours} ч)`);

  // 4. Оборудование и нюансы
  if (order.hasSteamer) extras.push('Парогенератор');
  if (order.hasVacuum) extras.push('Нужен пылесос');
  if (order.hasPets) extras.push('Есть питомцы 🐾');
  if (order.hasKeys) extras.push('Ключи 🔑');

  // 5. Химчистка
  if (order.drySofa2 > 0) extras.push(`Химчистка 2-мест. дивана (${order.drySofa2} шт)`);
  if (order.drySofa3 > 0) extras.push(`Химчистка 3-мест. дивана (${order.drySofa3} шт)`);
  if (order.drySofaCorner4 > 0) extras.push(`Химчистка углового дивана (${order.drySofaCorner4} шт)`);
  if (order.dryArmchair > 0) extras.push(`Химчистка кресла (${order.dryArmchair} шт)`);
  if (order.dryMattressSide > 0) extras.push(`Химчистка матраса (${order.dryMattressSide} мест)`);

  return extras;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        assignedCleaners: {
          include: { cleaner: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'Бот не настроен' }, { status: 500 });
    }

    let sent = 0;

    const extrasList = formatOrderExtras(order);
    const extrasText = extrasList.length > 0
      ? extrasList.map((e) => `• ${e}`).join('\n')
      : 'Нет';

    const rawPhone = order.clientPhone || order.client?.phone || '';
    const isFakePhone = rawPhone.includes('NO_PHONE') || rawPhone.startsWith('---');
    const cleanPhone = isFakePhone ? '' : rawPhone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');

    const phoneFormatted = cleanPhone
      ? `📞 <b>Телефон клиента:</b> <code>${cleanPhone}</code> (<a href="tel:${cleanPhone}">Позвонить</a>${digitsOnly.length >= 9 ? ` | <a href="https://wa.me/${digitsOnly}">WhatsApp</a>` : ''})`
      : `📞 <b>Телефон клиента:</b> <i>номер уточняйте у менеджера</i>`;
    
    for (const assignment of order.assignedCleaners) {
      const cleaner = assignment.cleaner;
      if (cleaner.telegramChatId) {
        const orderAny = order as any;
        const timeDisplay = order.timeSlot || orderAny.startTime || '10:00';
        
        const message = `🧹 <b>Новый заказ #${order.orderNumber}</b>
📅 <b>Дата:</b> ${new Date(order.date).toLocaleDateString('ru-RU')}
⏱️ <b>Время:</b> ${timeDisplay}
📍 <b>Адрес:</b> ${order.addressLine1}${order.addressLine2 ? ', ' + order.addressLine2 : ''}
👤 <b>Клиент:</b> ${order.clientName || 'Клиент'}
${phoneFormatted}
🏠 <b>Параметры:</b> ${order.roomsCount || 1} комн., ${order.bathroomsCount || 1} сануз., ${order.areaM2 || 40} м²
✨ <b>Дополнительные услуги:</b>
${extrasText}

💰 <b>К выплате:</b> ${Math.round((order.price || 0) * 0.4)} zł
📝 <b>Примечания:</b> ${order.notes || 'Нет'}

Пожалуйста, подтвердите получение наряда нажатием кнопки ниже! ✨`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleaner.telegramChatId,
            text: message,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Принял(а) наряд в работу', callback_data: `confirm_order_${order.id}` }]
              ]
            }
          })
        });
        sent++;
      }
    }

    return NextResponse.json({ success: true, sentTo: sent });
  } catch (error) {
    console.error('Ошибка отправки наряда клинеру:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
