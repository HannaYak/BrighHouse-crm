import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const apiId = 24697673;
const apiHash = "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const session = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAULXpo//ar2SnhY50EXlbMjoRyak1cPvwTMmG/KZomUPL6U0vtpO/AjpRae2L1NlUEOrdFbKruILe5Q8UW9eQ2S8RutfY55rozrhD75ko6ap8O1l/g7GW1pvwUw7fNlCeYaFhkYnLLzphd4avmCJqyVDUHv/5qa1Au1XRJLMytvpnhH/3PxDHXsfZJbHvL9fzPLSiBL0/ieqOSPO6cRHuQM9STwtqHebDHvtNjRMKXpWGaxRQ0yyekj4TAyFsfFORf2batrqZpOO5RBO1J2A19rprS3/pjrHhuwhG1H5Pe92J3l8+FoDYbjVyFPEtIS/orwj7fKSePZVtu8LC4Xov1jk=");

// GET: Получение целевых кандидатов (не оплативших / бросивших заявку) + аналитика опроса
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    const filterType = searchParams.get('type') || 'all'; // all, unpaid_orders, warm_convs
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. Поиск заказов без завершения / без подтвержденной оплаты
    let unpaidOrders: any[] = [];
    if (filterType === 'all' || filterType === 'unpaid_orders') {
      unpaidOrders = await prisma.order.findMany({
        where: {
          createdAt: { gte: sinceDate },
          status: { not: 'COMPLETED' },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 2. Поиск активных диалогов без оформленного завершенного заказа
    let warmConvs: any[] = [];
    if (filterType === 'all' || filterType === 'warm_convs') {
      warmConvs = await prisma.conversation.findMany({
        where: {
          updatedAt: { gte: sinceDate },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 150,
      });
    }

    // Собираем кандидатов в единый дедуплицированный список
    const candidatesMap = new Map<string, any>();

    // Сначала добавляем из заказов
    for (const order of unpaidOrders) {
      const phone = order.clientPhone ? order.clientPhone.trim() : null;
      const key = phone || `order_${order.id}`;

      // Ищем привязанный диалог
      let conv = null;
      if (phone) {
        const cleanPhone = phone.replace(/[^\d+]/g, '');
        conv = await prisma.conversation.findFirst({
          where: {
            OR: [
              { phone: { contains: cleanPhone.slice(-9) } },
              { externalId: { contains: cleanPhone.slice(-9) } },
              { clientName: { contains: order.clientName } },
            ],
          },
        });
      }

      const channel = conv?.channel || 'TELEGRAM';
      const externalId = conv?.externalId || phone || '';

      candidatesMap.set(key, {
        id: `order_${order.id}`,
        clientName: order.clientName || 'Клиент',
        phone: phone,
        channel: channel,
        externalId: externalId,
        conversationId: conv?.id || null,
        source: 'Заказ без оплаты',
        orderNumber: order.orderNumber,
        price: order.price,
        orderDate: order.date?.toISOString().slice(0, 10),
        status: order.status,
        lastMessage: order.notes || 'Оформил заказ, но не завершил оплату',
        createdAt: order.createdAt.toISOString(),
      });
    }

    // Затем добавляем из диалогов
    for (const conv of warmConvs) {
      const phone = conv.phone ? conv.phone.trim() : null;
      const key = phone || conv.externalId || conv.id;

      // Проверяем, нет ли уже выполненного заказа у этого человека
      const completedOrder = await prisma.order.findFirst({
        where: {
          OR: [
            phone ? { clientPhone: { contains: phone.replace(/[^\d+]/g, '').slice(-9) } } : { id: 'none' },
            conv.clientName ? { clientName: { contains: conv.clientName } } : { id: 'none' },
          ],
          status: 'COMPLETED',
        },
      });

      // Если уже есть выполненный заказ — пропускаем, человек довольный постоянный клиент
      if (completedOrder) continue;

      if (!candidatesMap.has(key)) {
        const lastMsg = conv.messages?.[0]?.text || conv.lastMessage || '';
        
        candidatesMap.set(key, {
          id: `conv_${conv.id}`,
          clientName: conv.clientName || conv.senderName || 'Клиент',
          phone: phone,
          channel: conv.channel,
          externalId: conv.externalId,
          conversationId: conv.id,
          source: conv.status === 'THINKING' ? 'Думает' : conv.status === 'REMIND' ? 'Напомнить' : 'Диалог в чате',
          orderNumber: null,
          price: null,
          orderDate: null,
          status: conv.status,
          lastMessage: lastMsg,
          createdAt: conv.createdAt.toISOString(),
        });
      }
    }

    let candidates = Array.from(candidatesMap.values());

    // Фильтр по поисковой строке
    if (search) {
      candidates = candidates.filter(
        (c) =>
          c.clientName.toLowerCase().includes(search) ||
          (c.phone && c.phone.toLowerCase().includes(search)) ||
          (c.lastMessage && c.lastMessage.toLowerCase().includes(search))
      );
    }

    // 3. Собираем статистику предыдущих опросов и ответов
    const surveyMessages = await prisma.message.findMany({
      where: {
        text: { contains: '📊 [Опрос' },
      },
      include: {
        conversation: {
          select: { id: true, clientName: true, phone: true, channel: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const sentCount = surveyMessages.filter((m) => m.senderType === 'MANAGER').length;
    const clientResponses = surveyMessages.filter((m) => m.senderType === 'CLIENT');
    const repliedCount = clientResponses.length;

    let priceReasonCount = 0;
    let dateReasonCount = 0;
    let laterReasonCount = 0;
    let otherReasonCount = 0;

    for (const res of clientResponses) {
      const lower = res.text.toLowerCase();
      if (lower.includes('цена') || lower.includes('дорого') || lower.includes('1')) {
        priceReasonCount++;
      } else if (lower.includes('дата') || lower.includes('время') || lower.includes('2')) {
        dateReasonCount++;
      } else if (lower.includes('потом') || lower.includes('успева') || lower.includes('3')) {
        laterReasonCount++;
      } else {
        otherReasonCount++;
      }
    }

    return NextResponse.json({
      candidates,
      stats: {
        sentCount,
        repliedCount,
        responseRate: sentCount > 0 ? Math.round((repliedCount / sentCount) * 100) : 0,
        breakdown: {
          price: priceReasonCount,
          date: dateReasonCount,
          later: laterReasonCount,
          other: otherReasonCount,
        },
        recentResponses: clientResponses.slice(0, 15).map((r) => ({
          id: r.id,
          conversationId: r.conversationId,
          clientName: r.conversation?.clientName || 'Клиент',
          channel: r.conversation?.channel || 'Чат',
          text: r.text.replace('📊 [Опрос]:', '').trim(),
          date: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Ошибка получения кандидатов для опроса:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST: Безопасная отправка опроса ИСКЛЮЧИТЕЛЬНО выбранным контактам
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { candidates, messageTemplate } = body;

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: 'Не выбрано ни одного клиента для рассылки' },
        { status: 400 }
      );
    }

    const defaultTemplate =
      'Здравствуйте, {name}! 🌸\n\n' +
      'Заметили, что вы интересовались уборкой и скидкой от BrightHouse, но пока не завершили оформление.\n\n' +
      'Подскажите, пожалуйста, что пошло не так? Нам очень важно ваше мнение, чтобы стать лучше 🙏';

    const baseTemplate = messageTemplate?.trim() || defaultTemplate;

    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const cand of candidates) {
      const clientName = cand.clientName && !cand.clientName.includes('Instagram Клиент') 
        ? cand.clientName 
        : 'уважаемый клиент';

      const personalizedText = baseTemplate.replace(/{name}/g, clientName);

      // Ищем или создаем диалог в CRM
      let conversation = null;
      if (cand.conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: cand.conversationId },
        });
      }

      if (!conversation && cand.externalId) {
        conversation = await prisma.conversation.findFirst({
          where: { externalId: cand.externalId },
        });
      }

      if (!conversation && cand.phone) {
        const cleanPhone = cand.phone.replace(/[^\d+]/g, '');
        conversation = await prisma.conversation.findFirst({
          where: { phone: { contains: cleanPhone.slice(-9) } },
        });
      }

      let delivered = false;
      let errorMsg = null;

      // 1. Отправка в TELEGRAM
      if (cand.channel === 'TELEGRAM' && cand.externalId) {
        const isNumericChatId = /^-?\d+$/.test(cand.externalId);

        // Если это Telegram Bot чат (цифровой ID)
        if (isNumericChatId && TELEGRAM_BOT_TOKEN) {
          try {
            const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: cand.externalId,
                text: personalizedText,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '💰 Дорого / не подошла цена', callback_data: 'survey_reason_price' },
                    ],
                    [
                      { text: '📅 Не подошла дата или время', callback_data: 'survey_reason_date' },
                    ],
                    [
                      { text: '⏳ Мало 3-4 дня (хочу скидку на потом)', callback_data: 'survey_reason_later' },
                    ],
                    [
                      { text: '✍️ Другой вариант (написать от руки)', callback_data: 'survey_reason_other' },
                    ],
                  ],
                },
              }),
            });
            const tgData = await tgRes.json();
            if (tgData.ok) {
              delivered = true;
            } else {
              errorMsg = tgData.description;
            }
          } catch (e: any) {
            errorMsg = e.message;
          }
        }

        // Если бот не доставил или у клиента username / юзербот
        if (!delivered) {
          try {
            const client = new TelegramClient(session, apiId, apiHash, {
              connectionRetries: 2,
              autoReconnect: false,
            });
            await client.connect();
            const surveyTextWithNumberedOptions =
              `${personalizedText}\n\n` +
              `1️⃣ 💰 Слишком высокая цена / дорого\n` +
              `2️⃣ 📅 Не подошла дата или время\n` +
              `3️⃣ ⏳ Мало 3-4 дня (хочу скидку на потом)\n` +
              `4️⃣ ✍️ Другой вариант\n\n` +
              `Пожалуйста, отправьте в ответ цифру 1, 2, 3 или напишите ваш вариант текстом ☺️`;

            await client.sendMessage(cand.externalId, { message: surveyTextWithNumberedOptions });
            await client.disconnect().catch(() => {});
            delivered = true;
          } catch (ubErr: any) {
            errorMsg = ubErr.message;
          }
        }
      }

      // 2. Отправка в INSTAGRAM
      if (cand.channel === 'INSTAGRAM') {
        const metaToken =
          process.env.META_ACCESS_TOKEN ||
          process.env.INSTAGRAM_ACCESS_TOKEN ||
          process.env.PAGE_ACCESS_TOKEN ||
          process.env.WHATSAPP_ACCESS_TOKEN;

        const igSurveyText =
          `${personalizedText}\n\n` +
          `1️⃣ 💰 Не подошла стоимость\n` +
          `2️⃣ 📅 Не подошла дата или время\n` +
          `3️⃣ ⏳ Мало 3-4 дня (хочу забронировать скидку на потом)\n` +
          `4️⃣ ✍️ Другой вариант\n\n` +
          `Отправьте цифру 1, 2, 3 или просто напишите, что вам помешало — мы обязательно поможем! 🌸`;

        if (metaToken && cand.externalId) {
          try {
            const metaRes = await fetch('https://graph.facebook.com/v20.0/me/messages', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${metaToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recipient: { id: cand.externalId },
                message: {
                  text: igSurveyText,
                  quick_replies: [
                    { content_type: 'text', title: '1. Дорого', payload: 'survey_reason_price' },
                    { content_type: 'text', title: '2. Время/Дата', payload: 'survey_reason_date' },
                    { content_type: 'text', title: '3. Продлите скидку', payload: 'survey_reason_later' },
                    { content_type: 'text', title: '4. Другое', payload: 'survey_reason_other' },
                  ],
                },
              }),
            });
            const metaData = await metaRes.json();
            if (metaRes.ok && !metaData.error) {
              delivered = true;
            } else {
              errorMsg = metaData.error?.message || 'Meta API error';
            }
          } catch (e: any) {
            errorMsg = e.message;
          }
        } else {
          // Если токена нет, фиксируем отправку для менеджера
          delivered = true;
        }
      }

      // 3. Отправка в WHATSAPP
      if (cand.channel === 'WHATSAPP') {
        const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const cleanPhone = (cand.phone || cand.externalId || '').replace(/\D/g, '');

        const waSurveyText =
          `${personalizedText}\n\n` +
          `1️⃣ 💰 Не подошла цена\n` +
          `2️⃣ 📅 Не подошла дата или время\n` +
          `3️⃣ ⏳ Мало 3-4 дня (хочу скидку на потом)\n` +
          `4️⃣ ✍️ Другой вариант\n\n` +
          `Отправьте цифру 1, 2, 3 или напишите ваш ответ в чат 🌸`;

        if (waToken && waPhoneId && cleanPhone) {
          try {
            await fetch(`https://graph.facebook.com/v20.0/${waPhoneId}/messages`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${waToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: cleanPhone,
                type: 'text',
                text: { body: waSurveyText },
              }),
            });
            delivered = true;
          } catch (e: any) {
            errorMsg = e.message;
          }
        } else {
          delivered = true;
        }
      }

      // Всегда гарантированно записываем опрос в историю сообщений диалога CRM
      if (conversation) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: 'manager',
            senderName: 'Менеджер (Опрос)',
            senderType: 'MANAGER',
            text: `📊 [Опрос о заказе / скидке]:\n${personalizedText}`,
            isIncoming: false,
            timestamp: new Date(),
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessage: `📊 Отправлен опрос: Почему не завершили заказ`,
            lastActivity: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      if (delivered) {
        successCount++;
        results.push({ id: cand.id, clientName: cand.clientName, status: 'SUCCESS' });
      } else {
        failCount++;
        results.push({ id: cand.id, clientName: cand.clientName, status: 'FAILED', error: errorMsg });
      }

      // Задержка 250мс для предотвращения блокировок и лимитов
      await new Promise((r) => setTimeout(r, 250));
    }

    return NextResponse.json({
      success: true,
      totalSelected: candidates.length,
      successCount,
      failCount,
      results,
    });
  } catch (error: any) {
    console.error('Ошибка рассылки опроса:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
