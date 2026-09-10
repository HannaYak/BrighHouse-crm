import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (!order.assignedCleaners || order.assignedCleaners.length === 0) {
      return NextResponse.json({ error: 'На этот заказ не назначены клинеры' }, { status: 400 });
    }

    const dateFormatted = new Date(order.date).toLocaleDateString('ru-RU');
    const teamList = order.assignedCleaners.map((ac) => ac.cleaner?.name).filter(Boolean).join(' + ');

    // 1. Сборка всех дополнительных услуг
    const addOns: string[] = [];
    if (order.hasOven) addOns.push('🍳 Духовка');
    if (order.hasFridge) addOns.push('❄️ Холодильник');
    if (order.hasFridgeFreeze) addOns.push('🧊 Холодильник с морозилкой');
    if (order.hasMicrowave) addOns.push('📻 Микроволновка');
    if (order.hasKitchenClosets) addOns.push('🚪 Кухонные шкафы внутри');
    if (order.hasBalcony) addOns.push('🌿 Балкон');
    if (order.hasStairs) addOns.push('🪜 Межэтажная лестница');
    if (order.hasSteamer) addOns.push('💨 Пароочиститель');
    if (order.hasVacuum) addOns.push('🧹 Наш пылесос');
    if (order.hasPets) addOns.push('🐾 Домашние животные');
    if (order.hasKeys) addOns.push('🔑 Забрать/отдать ключи');
    if (order.hasDishesHours && order.hasDishesHours > 0) addOns.push(`🍽 Мытье посуды (${order.hasDishesHours} ч)`);
    if (order.hasIroningHours && order.hasIroningHours > 0) addOns.push(`👔 Глажка (${order.hasIroningHours} ч)`);

    // Окна и витрины
    if (order.windowsCount && order.windowsCount > 0) addOns.push(`🪟 Обычные окна: ${order.windowsCount} шт.`);
    if ((order as any).showcaseWindowsCount && (order as any).showcaseWindowsCount > 0) {
      addOns.push(`🏢 Витрины: ${(order as any).showcaseWindowsCount} шт.`);
    }
    if ((order as any).balconyWindowsCount && (order as any).balconyWindowsCount > 0) {
      addOns.push(`🪟 Балконные окна: ${(order as any).balconyWindowsCount} шт.`);
    }

    // Химчистка
    if (order.drySofa2 && order.drySofa2 > 0) addOns.push(`🛋 Химчистка дивана 2-мест: ${order.drySofa2} шт.`);
    if (order.drySofa3 && order.drySofa3 > 0) addOns.push(`🛋 Химчистка дивана 3-мест: ${order.drySofa3} шт.`);
    if (order.drySofaCorner4 && order.drySofaCorner4 > 0) addOns.push(`🛋 Химчистка углового дивана: ${order.drySofaCorner4} шт.`);
    if ((order as any).drySofaU && (order as any).drySofaU > 0) addOns.push(`🛋 Химчистка П-образного дивана: ${(order as any).drySofaU} шт.`);
    if (order.dryArmchair && order.dryArmchair > 0) addOns.push(`🪑 Химчистка кресла: ${order.dryArmchair} шт.`);
    if ((order as any).dryChair && (order as any).dryChair > 0) addOns.push(`🪑 Химчистка стула: ${(order as any).dryChair} шт.`);
    if ((order as any).dryMattressDouble && (order as any).dryMattressDouble > 0) addOns.push(`🛏 Химчистка 2-сп. матраса: ${(order as any).dryMattressDouble} шт.`);
    if ((order as any).dryCarpetM2 && (order as any).dryCarpetM2 > 0) addOns.push(`🧶 Химчистка ковра: ${(order as any).dryCarpetM2} м²`);

    const addOnsFormatted = addOns.length > 0
      ? `\n✨ *Дополнительные услуги:*\n${addOns.map((item) => `• ${item}`).join('\n')}\n`
      : '';

    // Расчет выплаты клинеру (40% делится поровну на бригаду)
    const cleanersCount = order.assignedCleaners.length;
    const payoutPerCleaner = Math.round((order.price * 0.4) / cleanersCount);

    const results = [];

    for (const item of order.assignedCleaners) {
      const cleaner = item.cleaner;
      const chatId = (cleaner as any)?.telegramChatId || (cleaner as any)?.telegramId;

      const messageText = `🧹 *НОВЫЙ НАРЯД НА УБОРКУ!*

📋 *Заказ:* \`${order.orderNumber}\`
📅 *Дата:* ${dateFormatted}
⏰ *Время:* ${order.timeSlot || `${order.startTime || '10:00'} — ${order.endTime || '14:00'}`}
📍 *Адрес:* ${order.addressLine1} ${order.addressLine2 ? `(кв/оф ${order.addressLine2})` : ''}
👤 *Клиент:* ${order.clientName || 'Клиент'} (${order.clientPhone || 'номер уточняйте у менеджера'})

🏠 *Параметры объекта:*
• Тариф: ${order.serviceType || 'Стандарт'}
• Площадь: ${order.areaM2 || 45} м²
• Комнат: ${order.roomsCount || 1} | Санузлов: ${order.bathroomsCount || 1}
${addOnsFormatted}
👥 *Состав бригады:* ${teamList}
💰 *Твоя выплата за заказ:* *${payoutPerCleaner} zł* _(общий чек: ${order.price} zł)_

📝 *Особенности / ТЗ:*
${order.notes || 'Без особых указаний'}

Пожалуйста, подтвердите получение наряда! ✨`;

      if (chatId && TELEGRAM_BOT_TOKEN) {
        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: 'Markdown',
            }),
          });
          results.push({ cleaner: cleaner.name, status: 'SENT' });
        } catch (err) {
          results.push({ cleaner: cleaner.name, status: 'ERROR', error: String(err) });
        }
      } else {
        results.push({ cleaner: cleaner.name, status: 'NO_TELEGRAM_LINKED' });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Ошибка отправки наряда клинерам:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
