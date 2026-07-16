import { Telegraf, Markup } from 'telegraf';

// В реальном проекте этот токен берется из переменных окружения (process.env.TELEGRAM_BOT_TOKEN)
const BOT_TOKEN = '8534410302:AAEaw14C21g9ngUuF99nRPJdCtxcUVVrduo'; 
const bot = new Telegraf(BOT_TOKEN);

/**
 * 1. Приветствие и авторизация клинера в системе.
 * Клинер пишет /start [ID], чтобы привязать свой Telegram к базе CRM.
 */
bot.start((ctx) => {
  const payload = ctx.payload; // Получаем ID клинера, переданный в ссылке (например, t.me/bot?start=101)
  
  if (payload) {
    ctx.reply(
      `🎉 Рады приветствовать тебя в нашей рабочей системе!\n\nТвой аккаунт успешно привязан к системе CRM (ID клинера: ${payload}). Теперь ты будешь получать все заказы прямо сюда.`,
      Markup.keyboard([['📅 Моё расписание', 'ℹ️ Помощь']]).resize()
    );
    
    // TODO: В реальном бэкенде здесь отправляется запрос к БД: 
    // UPDATE cleaners SET telegram_chat_id = ctx.chat.id WHERE id = payload;
  } else {
    ctx.reply('Привет! Для авторизации в системе CRM используй специальную ссылку, которую тебе выдал менеджер.');
  }
});

/**
 * 2. Функция для отправки нового заказа клинеру из CRM
 * Вызывается бэкендом, когда менеджер нажимает "Сохранить" в CRM
 */
export async function sendNewOrderNotification(
  chatId: number, 
  orderDetails: { id: number; date: string; time: string; address: string; needsVacuum: boolean; keysAction?: string }
) {
  const message = 
    `🔔 *Новый заказ для тебя!*\n\n` +
    `📅 *Дата:* ${orderDetails.date}\n` +
    `⏰ *Время:* ${orderDetails.time}\n` +
    `📍 *Адрес:* ${orderDetails.address}\n` +
    `🔌 *Пылесос:* ${orderDetails.needsVacuum ? 'Нужно взять наш!' : 'Есть у клиента'}\n` +
    `${orderDetails.keysAction ? `🔑 *Ключи:* ${orderDetails.keysAction}\n` : ''}`;

  // Отправляем сообщение с инлайн-кнопкой подтверждения
  await bot.telegram.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      Markup.button.callback('✅ Приняла заказ', `confirm_order_${orderDetails.id}`)
    ])
  });
}

/**
 * 3. Обработка нажатия кнопки "Приняла"
 */
bot.action(/^confirm_order_(\d+)$/, async (ctx) => {
  const orderId = ctx.match[1];
  
  // Убираем инлайн-кнопку и пишем, что заказ подтвержден
  await ctx.editMessageText(
    ctx.update.callback_query.message ? 
    (ctx.update.callback_query.message as any).text + '\n\n🟢 *Ты подтвердила этот заказ!* Информация отправлена менеджеру.' : 
    '🟢 Заказ успешно принят!',
    { parse_mode: 'Markdown' }
  );

  // Уведомляем Telegram API, что действие завершено
  await ctx.answerCbQuery('Заказ подтвержден в CRM! Удачной смены! 👍');

  // TODO: В реальном бэкенде здесь отправляется запрос к БД:
  // UPDATE order_cleaners SET is_confirmed = true WHERE order_id = orderId AND cleaner_telegram_id = ctx.chat.id;
});

// Запуск бота
// bot.launch();
