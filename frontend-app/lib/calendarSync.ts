// Helper module for generating iCalendar (.ics) files, Google Calendar URLs,
// and dispatching notifications with calendar attachments to cleaners in Telegram.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const SERVICE_TITLES: Record<string, string> = {
  STANDARD: 'Стандартная уборка',
  STANDARD_PLUS: 'Стандарт +',
  GENERAL: 'Генеральная уборка',
  AFTER_REPAIR: 'Уборка после ремонта',
  OFFICE_REGULAR: 'Офис: Регулярная',
  OFFICE_GENERAL: 'Офис: Генеральная',
};

export interface OrderDateTimeInfo {
  startIcs: string;
  endIcs: string;
  startGoogle: string;
  endGoogle: string;
  dateFormatted: string;
  timeSlotDisplay: string;
}

/**
 * Parses order date and timeSlot into RFC 5545 iCalendar strings (YYYYMMDDTHHMMSS)
 * and Google Calendar URL format.
 */
export function parseOrderDateTime(dateInput: Date | string, timeSlotInput?: string | null): OrderDateTimeInfo {
  let y: number;
  let m: number;
  let d: number;

  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    const [ys, ms, ds] = dateInput.slice(0, 10).split('-');
    y = parseInt(ys, 10);
    m = parseInt(ms, 10);
    d = parseInt(ds, 10);
  } else {
    const dt = new Date(dateInput);
    y = dt.getFullYear();
    m = dt.getMonth() + 1;
    d = dt.getDate();
  }

  const yyyy = String(y).padStart(4, '0');
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const yyyymmdd = `${yyyy}${mm}${dd}`;
  const dateFormatted = `${dd}.${mm}.${yyyy}`;

  let startH = 10;
  let startM = 0;
  let endH = 14;
  let endM = 0;

  const slot = (timeSlotInput || '').trim();
  if (slot) {
    const parts = slot.split(/[—-]/).map((s) => s.trim());
    if (parts[0]) {
      const match = parts[0].match(/(\d{1,2}):(\d{2})/);
      if (match) {
        startH = parseInt(match[1], 10);
        startM = parseInt(match[2], 10);
      }
    }
    if (parts[1]) {
      const match = parts[1].match(/(\d{1,2}):(\d{2})/);
      if (match) {
        endH = parseInt(match[1], 10);
        endM = parseInt(match[2], 10);
      }
    } else {
      endH = Math.min(22, startH + 4);
      endM = startM;
    }
  }

  if (endH < startH || (endH === startH && endM <= startM)) {
    endH = Math.min(23, startH + 4);
  }

  const sH = String(startH).padStart(2, '0');
  const sM = String(startM).padStart(2, '0');
  const eH = String(endH).padStart(2, '0');
  const eM = String(endM).padStart(2, '0');

  const startIcs = `${yyyymmdd}T${sH}${sM}00`;
  const endIcs = `${yyyymmdd}T${eH}${eM}00`;
  const timeSlotDisplay = `${sH}:${sM} — ${eH}:${eM}`;

  return {
    startIcs,
    endIcs,
    startGoogle: startIcs,
    endGoogle: endIcs,
    dateFormatted,
    timeSlotDisplay,
  };
}

function escapeIcsText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Generates valid iCalendar (.ics) file string complying with RFC 5545.
 */
export function generateIcsContent(params: {
  orderId: string;
  orderNumber: string;
  summary: string;
  description: string;
  location: string;
  startIcs: string;
  endIcs: string;
  status?: 'CONFIRMED' | 'CANCELLED';
  sequence?: number;
}): string {
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const isCancelled = params.status === 'CANCELLED';
  const method = isCancelled ? 'CANCEL' : 'REQUEST';
  const status = isCancelled ? 'CANCELLED' : 'CONFIRMED';
  const sequence = params.sequence ?? (isCancelled ? 2 : 0);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BrightHouse Cleaning CRM//PL',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:order-${params.orderId}@brighthouse.pl`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${params.startIcs}`,
    `DTEND:${params.endIcs}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
    `LOCATION:${escapeIcsText(params.location)}`,
    `STATUS:${status}`,
    `SEQUENCE:${sequence}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Generates direct one-click Google Calendar web link.
 */
export function generateGoogleCalendarUrl(params: {
  summary: string;
  description: string;
  location: string;
  startGoogle: string;
  endGoogle: string;
}): string {
  const base = 'https://calendar.google.com/calendar/render';
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: params.summary,
    dates: `${params.startGoogle}/${params.endGoogle}`,
    ctz: 'Europe/Warsaw',
    details: params.description,
    location: params.location,
  });
  return `${base}?${query.toString()}`;
}

/**
 * Sends a text message to Telegram chat via Bot API.
 */
export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false, error: 'No TELEGRAM_BOT_TOKEN' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err: any) {
    console.error('sendTelegramMessage error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Sends a file (e.g. .ics) to Telegram chat via Bot API sendDocument.
 */
export async function sendTelegramDocument(params: {
  chatId: string | number;
  filename: string;
  content: string;
  caption?: string;
  replyMarkup?: any;
}) {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false, error: 'No TELEGRAM_BOT_TOKEN' };
  try {
    const formData = new FormData();
    formData.append('chat_id', String(params.chatId));
    const blob = new Blob([params.content], { type: 'text/calendar; charset=utf-8' });
    formData.append('document', blob, params.filename);
    if (params.caption) {
      formData.append('caption', params.caption);
      formData.append('parse_mode', 'HTML');
    }
    if (params.replyMarkup) {
      formData.append('reply_markup', JSON.stringify(params.replyMarkup));
    }

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  } catch (err: any) {
    console.error('sendTelegramDocument error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Builds formatted text and links for client phone.
 */
export function formatClientPhone(order: any): { cleanPhone: string; phoneFormatted: string; digitsOnly: string } {
  const rawPhone = order.clientPhone || order.client?.phone || '';
  const isFakePhone = rawPhone.includes('NO_PHONE') || rawPhone.startsWith('---');
  const cleanPhone = isFakePhone ? '' : rawPhone.trim();
  const digitsOnly = cleanPhone.replace(/\D/g, '');

  const phoneFormatted = cleanPhone
    ? `📞 <b>Телефон клиента:</b> <code>${cleanPhone}</code> (<a href="tel:${cleanPhone}">Позвонить</a>${digitsOnly.length >= 9 ? ` | <a href="https://wa.me/${digitsOnly}">WhatsApp</a>` : ''})`
    : `📞 <b>Телефон клиента:</b> <i>номер уточняйте у менеджера</i>`;

  return { cleanPhone, phoneFormatted, digitsOnly };
}

/**
 * Extracts and formats all extra services in the order.
 */
export function formatOrderExtrasList(o: any): string[] {
  const addOns: string[] = [];
  if (o.hasOven) addOns.push('🍳 Духовка');
  if (o.hasFridge) addOns.push('❄️ Холодильник');
  if (o.hasFridgeFreeze) addOns.push('🧊 Холодильник с морозилкой');
  if (o.hasMicrowave) addOns.push('📻 Микроволновка');
  if (o.hasKitchenClosets) addOns.push('🚪 Кухонные шкафы внутри');
  if (o.hasBalcony) addOns.push('🌿 Балкон');
  if (o.hasStairs) addOns.push('🪜 Межэтажная лестница');
  if (o.hasSteamer) addOns.push('💨 Пароочиститель');
  if (o.hasVacuum) addOns.push('🧹 Пылесос компании');
  if (o.hasPets) addOns.push('🐾 Домашние животные (Аллергия!)');
  if (o.hasKeys) addOns.push('🔑 Забрать/отдать ключи');

  const dishes = o.hasDishesHours || o.dishesHours;
  if (dishes && dishes > 0) addOns.push(`🍽 Мытье посуды (${dishes} ч)`);

  const ironing = o.hasIroningHours || o.ironingHours;
  if (ironing && ironing > 0) addOns.push(`👔 Глажка (${ironing} ч)`);

  if (o.windowsCount && o.windowsCount > 0) addOns.push(`🪟 Обычные окна: ${o.windowsCount} шт.`);
  if (o.balconyWindowsCount && o.balconyWindowsCount > 0) addOns.push(`🪟 Балконные окна: ${o.balconyWindowsCount} шт.`);
  if (o.showcaseWindowsCount && o.showcaseWindowsCount > 0) addOns.push(`🏢 Витрины: ${o.showcaseWindowsCount} шт.`);

  if (o.drySofa2 && o.drySofa2 > 0) addOns.push(`🛋 Химчистка дивана 2-мест: ${o.drySofa2} шт.`);
  if (o.drySofa3 && o.drySofa3 > 0) addOns.push(`🛋 Химчистка дивана 3-мест: ${o.drySofa3} шт.`);
  if (o.drySofaCorner4 && o.drySofaCorner4 > 0) addOns.push(`🛋 Химчистка углового дивана: ${o.drySofaCorner4} шт.`);
  if (o.drySofaU && o.drySofaU > 0) addOns.push(`🛋 Химчистка П-образного дивана: ${o.drySofaU} шт.`);
  if (o.dryArmchair && o.dryArmchair > 0) addOns.push(`🪑 Химчистка кресла: ${o.dryArmchair} шт.`);
  if (o.dryChair && o.dryChair > 0) addOns.push(`🪑 Химчистка стула: ${o.dryChair} шт.`);
  if (o.dryMattressDouble && o.dryMattressDouble > 0) addOns.push(`🛏 Химчистка 2-сп. матраса: ${o.dryMattressDouble} шт.`);
  if (o.dryCarpetM2 && o.dryCarpetM2 > 0) addOns.push(`🧶 Химчистка ковра: ${o.dryCarpetM2} м²`);

  return addOns;
}

/**
 * Sends a full order dispatch to a cleaner with client info, phone, acceptance button,
 * and attaches the .ics calendar file + Google Calendar web button.
 */
export async function sendOrderDispatchToCleaner(order: any, cleaner: any) {
  const chatId = cleaner?.telegramChatId || cleaner?.telegramId;
  if (!chatId) return { ok: false, reason: 'NO_TELEGRAM_LINKED' };

  const timing = parseOrderDateTime(order.date, order.timeSlot || order.startTime);
  const { phoneFormatted, cleanPhone } = formatClientPhone(order);
  const fullAddress = `${order.addressLine1 || ''}${order.addressLine2 ? ', кв/оф ' + order.addressLine2 : ''}`.trim();
  const serviceTitle = SERVICE_TITLES[order.serviceType] || order.serviceType || 'Стандартная уборка';

  const addOns = formatOrderExtrasList(order);
  const addOnsFormatted = addOns.length > 0
    ? `\n✨ <b>Дополнительные услуги:</b>\n${addOns.map((item) => `• ${item}`).join('\n')}\n`
    : '';

  const teamList = order.assignedCleaners
    ? order.assignedCleaners.map((ac: any) => ac.cleaner?.name || ac.name).filter(Boolean).join(' + ')
    : cleaner.name;

  const isCash = order.paymentMethod === 'CASH';
  const paymentInstruction = isCash
    ? `💵 <b>Оплата на месте НАЛИЧНЫМИ:</b> <b>${order.price} zł</b>\n⚠️ <i>Пожалуйста, обязательно заберите точную сумму у клиента!</i>`
    : `💳 <b>Оплата:</b> Безналичный расчет (${order.price} zł на счет компании).\n<i>Деньги у клиента брать НЕ нужно.</i>`;

  const summary = `🧹 Уборка: ${order.addressLine1 || 'Варшава'} (${order.orderNumber})`;
  const description = [
    `Заказ: ${order.orderNumber}`,
    `Клиент: ${order.clientName || 'Клиент'} (${cleanPhone || 'номер уточняйте'})`,
    `Адрес: ${fullAddress}`,
    `Тариф: ${serviceTitle} (${order.areaM2 || 45} м²)`,
    `Оплата: ${isCash ? `Наличные (${order.price} zł)` : `Безнал (${order.price} zł)`}`,
    order.notes ? `Примечания: ${order.notes}` : '',
  ].filter(Boolean).join('\n');

  const icsContent = generateIcsContent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    summary,
    description,
    location: `${fullAddress}, Warszawa`,
    startIcs: timing.startIcs,
    endIcs: timing.endIcs,
    status: 'CONFIRMED',
    sequence: 0,
  });

  const googleCalendarUrl = generateGoogleCalendarUrl({
    summary,
    description,
    location: `${fullAddress}, Warszawa`,
    startGoogle: timing.startGoogle,
    endGoogle: timing.endGoogle,
  });

  const messageText = `🧹 <b>НОВЫЙ НАРЯД НА УБОРКУ!</b>

📋 <b>Заказ:</b> <code>${order.orderNumber}</code>
📅 <b>Дата:</b> ${timing.dateFormatted}
⏰ <b>Время:</b> ${timing.timeSlotDisplay}
📍 <b>Адрес:</b> ${fullAddress}
👤 <b>Клиент:</b> ${order.clientName || 'Клиент'}
${phoneFormatted}

🏠 <b>Параметры объекта:</b>
• Тариф: <b>${serviceTitle}</b>
• Площадь: ${order.areaM2 || 45} м²
• Комнат: ${order.roomsCount || 1} | Санузлов: ${order.bathroomsCount || 1}
${addOnsFormatted}
👥 <b>Состав бригады:</b> ${teamList || cleaner.name}

${paymentInstruction}

📝 <b>Особенности / ТЗ от клиента:</b>
${order.notes ? order.notes : 'Без особых указаний'}

Пожалуйста, подтвердите получение наряда нажатием кнопки ниже! ✨`;

  // 1. Отправляем карточку наряда с кнопкой "Принял"
  await sendTelegramMessage(chatId, messageText, {
    inline_keyboard: [
      [{ text: '✅ Принял(а) наряд в работу', callback_data: `confirm_order_${order.id}` }],
    ],
  });

  // 2. Отправляем .ics файл с возможностью сохранения в Google / Apple Calendar
  await sendTelegramDocument({
    chatId,
    filename: `zakaz-${order.orderNumber}.ics`,
    content: icsContent,
    caption: `📅 <b>Календарь заказа:</b> нажмите на файл 👆 или кнопку ниже для добавления в Google / Apple Календарь:`,
    replyMarkup: {
      inline_keyboard: [
        [{ text: '📅 Открыть в Google Календаре', url: googleCalendarUrl }],
      ],
    },
  });

  return { ok: true };
}

/**
 * Notifies cleaner that the order time/date has changed ("подвинулся" / перенесен)
 * and sends an updated .ics file + Google Calendar link.
 */
export async function sendOrderRescheduledToCleaner(params: {
  order: any;
  cleaner: any;
  oldDateFormatted: string;
  oldTimeSlot: string;
}) {
  const { order, cleaner, oldDateFormatted, oldTimeSlot } = params;
  const chatId = cleaner?.telegramChatId || cleaner?.telegramId;
  if (!chatId) return { ok: false };

  const timing = parseOrderDateTime(order.date, order.timeSlot || order.startTime);
  const { cleanPhone } = formatClientPhone(order);
  const fullAddress = `${order.addressLine1 || ''}${order.addressLine2 ? ', кв/оф ' + order.addressLine2 : ''}`.trim();
  const serviceTitle = SERVICE_TITLES[order.serviceType] || order.serviceType || 'Стандартная уборка';

  const summary = `⚠️ [ИЗМЕНЕНО] Уборка: ${order.addressLine1 || 'Варшава'} (${order.orderNumber})`;
  const description = [
    `ВНИМАНИЕ: Время заказа ${order.orderNumber} перенесено на ${timing.dateFormatted} (${timing.timeSlotDisplay})`,
    `Клиент: ${order.clientName || 'Клиент'} (${cleanPhone || 'номер уточняйте'})`,
    `Адрес: ${fullAddress}`,
    `Тариф: ${serviceTitle}`,
    `Оплата: ${order.price || 0} zł`,
    order.notes ? `Примечания: ${order.notes}` : '',
  ].filter(Boolean).join('\n');

  const icsContent = generateIcsContent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    summary,
    description,
    location: `${fullAddress}, Warszawa`,
    startIcs: timing.startIcs,
    endIcs: timing.endIcs,
    status: 'CONFIRMED',
    sequence: 1, // Incremented sequence triggers event update in calendar
  });

  const googleCalendarUrl = generateGoogleCalendarUrl({
    summary,
    description,
    location: `${fullAddress}, Warszawa`,
    startGoogle: timing.startGoogle,
    endGoogle: timing.endGoogle,
  });

  const messageText = `⚠️ <b>ВНИМАНИЕ: Изменение времени / даты заказа!</b>

📋 <b>Заказ:</b> <code>${order.orderNumber}</code>
👤 <b>Клиент:</b> ${order.clientName || 'Клиент'} (${cleanPhone || 'номер уточняйте'})
📍 <b>Адрес:</b> ${fullAddress}

🗓 <b>Прежнее время:</b> ${oldDateFormatted} (${oldTimeSlot})
👉 <b>НОВОЕ ВРЕМЯ:</b> <b>${timing.dateFormatted} (${timing.timeSlotDisplay})</b>

Пожалуйста, обратите внимание на перенос времени! Обновленный файл календаря прикреплен ниже 👇`;

  await sendTelegramMessage(chatId, messageText);

  await sendTelegramDocument({
    chatId,
    filename: `zakaz-${order.orderNumber}-obnovlen.ics`,
    content: icsContent,
    caption: `📅 <b>Нажмите на файл 👆</b> или кнопку ниже, чтобы обновить время в Google / Apple Календаре:`,
    replyMarkup: {
      inline_keyboard: [
        [{ text: '📅 Обновить в Google Календаре', url: googleCalendarUrl }],
      ],
    },
  });

  return { ok: true };
}

/**
 * Notifies cleaner that the order has been cancelled ("отменился")
 * and sends a cancellation .ics file (METHOD: CANCEL, STATUS: CANCELLED).
 */
export async function sendOrderCancelledToCleaner(order: any, cleaner: any, cancelReason?: string | null) {
  const chatId = cleaner?.telegramChatId || cleaner?.telegramId;
  if (!chatId) return { ok: false };

  const timing = parseOrderDateTime(order.date, order.timeSlot || order.startTime);
  const fullAddress = `${order.addressLine1 || ''}${order.addressLine2 ? ', кв/оф ' + order.addressLine2 : ''}`.trim();

  const summary = `❌ [ОТМЕНЕНО] Уборка: ${order.addressLine1 || 'Варшава'} (${order.orderNumber})`;
  const description = `ВНИМАНИЕ: Заказ ${order.orderNumber} отменен. Выезжать на объект не требуется.${cancelReason ? ` Причина: ${cancelReason}` : ''}`;

  const icsContent = generateIcsContent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    summary,
    description,
    location: `${fullAddress}, Warszawa`,
    startIcs: timing.startIcs,
    endIcs: timing.endIcs,
    status: 'CANCELLED',
    sequence: 2,
  });

  const reasonText = cancelReason ? `\n📝 <b>Причина отмены:</b> ${cancelReason}` : '';

  const messageText = `❌ <b>ВНИМАНИЕ: Заказ #${order.orderNumber} ОТМЕНЕН!</b>

📅 <b>Дата:</b> ${timing.dateFormatted} (${timing.timeSlotDisplay})
📍 <b>Адрес:</b> ${fullAddress}
👤 <b>Клиент:</b> ${order.clientName || 'Клиент'}${reasonText}

⚠️ <i>Выезжать на этот объект не требуется! Заказ снят с выполнения.</i>`;

  await sendTelegramMessage(chatId, messageText);

  await sendTelegramDocument({
    chatId,
    filename: `otmena-${order.orderNumber}.ics`,
    content: icsContent,
    caption: `📅 Нажмите на файл 👆 чтобы удалить / отметить заказ как отмененный в Календаре`,
  });

  return { ok: true };
}

/**
 * Notifies cleaner that an order has been reassigned to another cleaner ("передался другому клинеру")
 * and sends a cancellation .ics file so they can remove it from their calendar.
 */
export async function sendOrderUnassignedFromCleaner(order: any, cleaner: any) {
  const chatId = cleaner?.telegramChatId || cleaner?.telegramId;
  if (!chatId) return { ok: false };

  const timing = parseOrderDateTime(order.date, order.timeSlot || order.startTime);
  const fullAddress = `${order.addressLine1 || ''}${order.addressLine2 ? ', кв/оф ' + order.addressLine2 : ''}`.trim();

  const summary = `❌ [СНЯТ С ВАС] Уборка: ${order.addressLine1 || 'Варшава'} (${order.orderNumber})`;
  const description = `Наряд ${order.orderNumber} передан другому сотруднику компании. Выезжать на объект вам не требуется.`;

  const icsContent = generateIcsContent({
    orderId: order.id,
    orderNumber: order.orderNumber,
    summary,
    description,
    location: `${fullAddress}, Warszawa`,
    startIcs: timing.startIcs,
    endIcs: timing.endIcs,
    status: 'CANCELLED',
    sequence: 2,
  });

  const messageText = `ℹ️ <b>Наряд #${order.orderNumber} снят с вас</b>

📅 <b>Дата:</b> ${timing.dateFormatted} (${timing.timeSlotDisplay})
📍 <b>Адрес:</b> ${fullAddress}
👤 <b>Клиент:</b> ${order.clientName || 'Клиент'}

Заказ передан другому сотруднику компании. Выезжать на объект вам не требуется.`;

  await sendTelegramMessage(chatId, messageText);

  await sendTelegramDocument({
    chatId,
    filename: `otmena-${order.orderNumber}.ics`,
    content: icsContent,
    caption: `📅 Нажмите на файл 👆 чтобы удалить заказ из своего Календаря`,
  });

  return { ok: true };
}
