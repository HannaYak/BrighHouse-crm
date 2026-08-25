// 1. Отправка уведомлений админу о новых лидах/заявках
export async function sendAdminLeadNotification(leadData: any) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Убедись, что этот ID есть в переменных окружения Render

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Токен Telegram бота не задан в .env');
    return;
  }

  const messageText = `
🔔 <b>Новая заявка (Лид)!</b>

<b>Имя:</b> ${leadData.name || 'Не указано'}
<b>Телефон:</b> ${leadData.phone || 'Не указан'}
<b>Услуга:</b> ${leadData.service || 'Не указана'}
<b>Комментарий:</b> ${leadData.notes || 'Нет'}
  `;

  if (ADMIN_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: messageText,
          parse_mode: 'HTML',
        }),
      });
    } catch (e) {
      console.error(`Ошибка отправки лида админу:`, e);
    }
  }
}

// 2. Персональная рассылка клинерам о назначенном заказе
export async function sendPersonalOrderNotification(orderData: any) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Токен Telegram бота не задан в .env');
    return;
  }

  // Формируем красивое сообщение
  const tagsList = [];
  if (orderData.tags?.oven) tagsList.push('🍳 Духовка');
  if (orderData.tags?.fridge) tagsList.push('❄️ Холодильник');
  if (orderData.tags?.microwave) tagsList.push('📡 СВЧ');
  if (orderData.tags?.balcony) tagsList.push('🌿 Балкон');
  if (orderData.tags?.vacuum) tagsList.push('🔌 Пылесос');
  if (orderData.tags?.pets) tagsList.push('🐾 Животные');
  if (orderData.tags?.keys) tagsList.push('🔑 Ключи');

  const teammates = orderData.assignedCleaners.map((ac: any) => ac.name || ac.cleaner?.name).join(' + ');

  const messageText = `
🔥 <b>Новый заказ: ${orderData.orderNumber}</b>

<b>Дата:</b> ${orderData.date}
<b>Время:</b> ${orderData.timeSlot}
<b>Тип:</b> ${orderData.serviceType}
<b>Объем:</b> ${orderData.areaM2} м², Комнат: ${orderData.roomsCount}, С/У: ${orderData.bathroomsCount}

📍 <b>Адрес:</b> ${orderData.addressLine1} ${orderData.addressLine2 ? `(Кв: ${orderData.addressLine2})` : ''}

👥 <b>Бригада:</b> ${teammates}

${tagsList.length > 0 ? `<b>Допы:</b>\n${tagsList.join('\n')}\n` : ''}
${orderData.notes ? `📝 <b>ТЗ/Комментарий:</b>\n<i>${orderData.notes}</i>` : ''}
  `;

  // Рассылаем каждому назначенному клинеру, у которого привязан Telegram
  for (const ac of orderData.assignedCleaners) {
    const cleaner = ac.cleaner || ac; 
    
    if (cleaner.telegramChatId) {
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleaner.telegramChatId,
            text: messageText,
            parse_mode: 'HTML',
          }),
        });
      } catch (e) {
        console.error(`Ошибка отправки в TG для ${cleaner.name}:`, e);
      }
    }
  }
}
