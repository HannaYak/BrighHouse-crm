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

    const o = order as any;
    const dateFormatted = new Date(order.date).toLocaleDateString('ru-RU');
    const teamList = order.assignedCleaners.map((ac) => ac.cleaner?.name).filter(Boolean).join(' + ');

    // 1. Сборка всех дополнительных услуг с безопасным чтением
    const addOns: string[] = [];
    if (o.hasOven) addOns.push('🍳 Духовка');
    if (o.hasFridge) addOns.push('❄️ Холодильник');
    if (o.hasFridgeFreeze) addOns.push('🧊 Холодильник с морозилкой');
    if (o.hasMicrowave) addOns.push('📻 Микроволновка');
    if (o.hasKitchenClosets) addOns.push('🚪 Кухонные шкафы внутри');
    if (o.hasBalcony) addOns.push('🌿 Балкон');
    if (o.hasStairs) addOns.push('🪜 Межэтажная лестница');
    if (o.hasSteamer) addOns.push('💨 Пароочиститель');
    if (o.hasVacuum) addOns.push('🧹 Наш пылесос');
    if (o.hasPets) addOns.push('🐾 Домашние животные (Аллергия!)');
    if (o.hasKeys) addOns.push('🔑 Забрать/отдать ключи');

    const dishes = o.hasDishesHours || o.dishesHours;
    if (dishes && dishes > 0) addOns.push(`🍽 Мытье посуды (${dishes} ч)`);

    const ironing = o.hasIroningHours || o.ironingHours;
    if (ironing && ironing > 0) addOns.push(`👔 Глажка (${ironing} ч)`);

    // Окна и витрины
    if (o.windowsCount && o.windowsCount > 0) addOns.push(`🪟 Обычные окна: ${o.windowsCount} шт.`);
    if (o.showcaseWindowsCount && o.showcaseWindowsCount > 0) addOns.push(`🏢 Витрины: ${o.showcaseWindowsCount} шт.`);
    if (o.balconyWindowsCount && o.balconyWindowsCount > 0) addOns.push(`🪟 Балконные окна: ${o.balconyWindowsCount} шт.`);

    // Химчистка
    if (o.drySofa2 && o.drySofa2 > 0) addOns.push(`🛋 Химчистка дивана 2-мест: ${o.drySofa2} шт.`);
    if (o.drySofa3 && o.drySofa3 > 0) addOns.push(`🛋 Химчистка дивана 3-мест: ${o.drySofa3} шт.`);
    if (o.drySofaCorner4 && o.drySofaCorner4 > 0) addOns.push(`🛋 Химчистка дивана углового: ${o.drySofaCorner4} шт.`);
    if (o.drySofaU && o.drySofaU > 0) addOns.push(`🛋 Химчистка П-образного дивана: ${o.drySofaU} шт.`);
    if (o.dryArmchair && o.dryArmchair > 0) addOns.push(`🪑 Химчистка кресла: ${o.dryArmchair} шт.`);
    if (o.dryChair && o.dryChair > 0) addOns.push(`🪑 Химчистка стула: ${o.dryChair} шт.`);
    if (o.dryMattressDouble && o.dryMattressDouble > 0) addOns.push(`🛏 Химчистка 2-сп. матраса: ${o.dryMattressDouble} шт.`);
    if (o.dryCarpetM2 && o.dryCarpetM2 > 0) addOns.push(`🧶 Химчистка ковра: ${o.dryCarpetM2} м²`);

    const addOnsFormatted = addOns.length > 0
      ? `\n✨ *Дополнительные услуги:*\n${addOns.map((item) => `• ${item}`).join('\n')}\n`
      : '';

    // Расчет выплаты клинеру (40% на команду)
    const cleanersCount = order.assignedCleaners.length;
    const payoutPerCleaner = Math.round((order.price * 0.4) / cleanersCount);

    const results = [];

    for (const item of order.assignedCleaners) {
      const cleaner = item.cleaner as any;
      const chatId = cleaner?.telegramChatId || cleaner?.telegramId;

      // Вытаскиваем теги и особенности клинера
      const cleanerTags = Array.isArray(cleaner?.tags) && cleaner.tags.length > 0
        ? cleaner.tags.map((t: string) => `\`${t.replace(/_/g, ' ')}\``).join(', ')
        : null;

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
${cleanerTags ? `🏷 *Особенности/навыки клинера:* ${cleanerTags}\n` : ''}💰 *Твоя выплата за заказ:* *${payoutPerCleaner} zł* _(общий чек: ${order.price} zł)_

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
