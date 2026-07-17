// Симуляция функции сохранения в базу данных PostgreSQL
async function saveLeadToDatabase(clientName: string, phone: string, text: string, source: string) {
  console.log(`💾 Сохраняю лид в базу: ${clientName} (${phone}) из источника [${source}]. Текст: "${text}"`);
  // В реальном проекте здесь будет: INSERT INTO clients ... INSERT INTO orders (status) VALUES ('new_lead')
  return { id: Math.floor(Math.random() * 1000), clientName, text };
}

/**
 * Универсальный обработчик входящих сообщений (Webhooks)
 * Сюда мессенджеры шлют данные в реальном времени
 */
export async function handleIncomingWebhook(requestBody: any) {
  try {
    let clientName = 'Неизвестный клиент';
    let phone = 'Без номера';
    let messageText = '';
    let source = 'Сайт';

    // 1. Парсинг структуры, если лид пришел из Telegram-бота (для заявок)
    if (requestBody.message && requestBody.message.chat) {
      source = 'Telegram';
      clientName = `${requestBody.message.from.first_name || ''} ${requestBody.message.from.last_name || ''}`.trim();
      phone = requestBody.message.contact?.phone_number || 'Уточнить номер';
      messageText = requestBody.message.text || '[Медиафайл]';
    } 
    // 2. Парсинг структуры, если лид пришел из WhatsApp (например, через Green-API)
    else if (requestBody.instanceData && requestBody.messageData) {
      source = 'WhatsApp';
      clientName = requestBody.senderData.senderName || 'Клиент WhatsApp';
      phone = `+${requestBody.senderData.sender}`;
      messageText = requestBody.messageData.textMessageData?.textMessage || 'Входящее сообщение';
    }
    // 3. Парсинг для польского агрегатора заявок Oferteo
    else if (requestBody.oferteo_lead_id) {
      source = 'Oferteo';
      clientName = requestBody.client_name;
      phone = requestBody.client_phone;
      messageText = `Заявка на клининг с Oferteo. Комнат: ${requestBody.rooms_count}, Метрах: ${requestBody.square_meters}`;
    }

    // Сохраняем распарсенный лид как "Новую заявку" в CRM
    const newLead = await saveLeadToDatabase(clientName, phone, messageText, source);
    
    return {
      status: 'success',
      message: 'Лид успешно добавлен в колонку "Новые заявки" на Канбане',
      data: newLead
    };

  } catch (error) {
    console.error('❌ Ошибка при обработке вебхука лида:', error);
    return { status: 'error', message: 'Не удалось обработать входящий запрос' };
  }
}
