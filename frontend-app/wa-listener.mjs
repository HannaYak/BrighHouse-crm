import makeWASocket, { 
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';

import http from 'http';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { prisma, usePrismaAuthState } from './prismaAuthState.mjs';

let activeSock = null;
let isStarting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let authStateHelper = null;
let isSuperseded = false;

// Кэш для getMessage (требуется Baileys для обработки Retry / PreKey запросов)
const messageStore = new Map();
const MAX_STORED_MESSAGES = 5000;

// Карта сопоставления LID -> реальный телефонный номер (без плюса, например '48123456789')
const lidToPhoneMap = new Map();

function recordLidMapping(lid, phone) {
  if (!lid || !phone) return;
  const cleanPhone = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  if (!cleanPhone) return;
  const cleanLid = lid.replace('@lid', '').split(':')[0];
  lidToPhoneMap.set(cleanLid, cleanPhone);
  lidToPhoneMap.set(`${cleanLid}@lid`, cleanPhone);
}

// Сохранение сообщения в оперативную память и персистентную сессию в PostgreSQL
async function storeMessage(key, message) {
  if (!key?.id || !message) return;
  if (messageStore.size >= MAX_STORED_MESSAGES) {
    const oldestKey = messageStore.keys().next().value;
    messageStore.delete(oldestKey);
  }
  messageStore.set(key.id, message);

  try {
    const serialized = JSON.stringify(message);
    await prisma.whatsAppSession.upsert({
      where: { id: `msg-${key.id}` },
      update: { data: serialized },
      create: { id: `msg-${key.id}`, data: serialized }
    });
  } catch {}
}

// Кэш счетчика повторов для предотвращения зацикливания повторов
const retryMap = new Map();
const msgRetryCounterCache = {
  get: (key) => retryMap.get(key),
  set: (key, val) => {
    if (retryMap.size > 2000) retryMap.clear();
    retryMap.set(key, val);
  },
  del: (key) => retryMap.delete(key)
};

// Извлечение номера телефона отправителя с полной поддержкой @lid и кэша маппинга
function extractPhone(msg, remoteJid) {
  if (msg.key?.senderPn && msg.key.senderPn.endsWith('@s.whatsapp.net')) {
    const pn = msg.key.senderPn.replace('@s.whatsapp.net', '');
    if (remoteJid?.endsWith('@lid')) recordLidMapping(remoteJid, pn);
    return pn;
  }
  if (msg.key?.participantPn && msg.key.participantPn.endsWith('@s.whatsapp.net')) {
    const pn = msg.key.participantPn.replace('@s.whatsapp.net', '');
    if (remoteJid?.endsWith('@lid')) recordLidMapping(remoteJid, pn);
    return pn;
  }
  if (remoteJid?.endsWith('@s.whatsapp.net')) {
    return remoteJid.replace('@s.whatsapp.net', '');
  }
  if (msg.key?.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
    const pn = msg.key.remoteJidAlt.replace('@s.whatsapp.net', '');
    if (remoteJid?.endsWith('@lid')) recordLidMapping(remoteJid, pn);
    return pn;
  }
  if (msg.key?.participant && msg.key.participant.endsWith('@s.whatsapp.net')) {
    const pn = msg.key.participant.replace('@s.whatsapp.net', '');
    if (remoteJid?.endsWith('@lid')) recordLidMapping(remoteJid, pn);
    return pn;
  }
  if (remoteJid?.endsWith('@lid')) {
    const mapped = lidToPhoneMap.get(remoteJid) || lidToPhoneMap.get(remoteJid.split('@')[0]);
    if (mapped) return mapped;
  }
  return '';
}

// Единый обработчик сохранения сообщения в базу данных CRM
async function processMessage(msg) {
  try {
    const remoteJid = msg.key?.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) {
      return;
    }

    if (msg.message) {
      storeMessage(msg.key, msg.message);
    }

    // Служебные заглушки без контента не сохраняем в CRM
    if (msg.messageStubType) {
      console.log(`ℹ️ [MSG STUB] remoteJid: ${remoteJid}, stubType: ${msg.messageStubType}, params:`, msg.messageStubParameters);
      return;
    }

    // Распаковываем текст из сообщения
    const msgObj = msg.message || {};
    const content = 
      msgObj.ephemeralMessage?.message ||
      msgObj.viewOnceMessage?.message ||
      msgObj.viewOnceMessageV2?.message ||
      msgObj.documentWithCaptionMessage?.message ||
      msgObj;

    const text = 
      content.conversation || 
      content.extendedTextMessage?.text || 
      content.imageMessage?.caption || 
      content.videoMessage?.caption ||
      content.documentMessage?.caption ||
      content.buttonsResponseMessage?.selectedDisplayText ||
      content.templateButtonReplyMessage?.selectedDisplayText ||
      content.listResponseMessage?.title ||
      (content.imageMessage ? '📷 Фотография' : '') ||
      (content.videoMessage ? '📹 Видео' : '') ||
      (content.audioMessage ? '🎤 Голосовое' : '') ||
      (content.documentMessage ? `📄 Документ: ${content.documentMessage.fileName || 'файл'}` : '') ||
      (content.contactMessage ? `👤 Контакт: ${content.contactMessage.displayName || ''}` : '') ||
      (content.locationMessage ? '📍 Локация' : '') ||
      '';

    if (!text) {
      return;
    }

    let clientPhone = extractPhone(msg, remoteJid);

    // Если это LID и номер пока не определился — проверяем сохраненный диалог в БД и кэш
    if (!clientPhone && remoteJid.endsWith('@lid')) {
      const cached = lidToPhoneMap.get(remoteJid) || lidToPhoneMap.get(remoteJid.split('@')[0]);
      if (cached) {
        clientPhone = cached;
      } else {
        try {
          const existingConv = await prisma.conversation.findFirst({
            where: {
              OR: [
                { externalId: remoteJid },
                { externalId: `${remoteJid.split('@')[0]}@lid` }
              ]
            }
          });
          if (existingConv?.phone) {
            clientPhone = existingConv.phone.replace(/\D/g, '');
            recordLidMapping(remoteJid, clientPhone);
          }
        } catch {}
      }
    }

    const isFromMe = Boolean(msg.key.fromMe);
    const isIncoming = !isFromMe;

    console.log(`📥 [MSG RECV] От: ${clientPhone ? `+${clientPhone}` : remoteJid} | isIncoming: ${isIncoming} | Текст: "${text.slice(0, 80)}"`);

    // Отмечаем прочитанным входящее сообщение
    if (isIncoming && activeSock) {
      try {
        await activeSock.readMessages([msg.key]);
      } catch {}
    }

    const targetExternalId = clientPhone ? `${clientPhone}@s.whatsapp.net` : remoteJid;
    const clientName = isIncoming 
      ? (msg.pushName || (clientPhone ? `+${clientPhone}` : 'Клиент WhatsApp'))
      : 'Менеджер';

    const existingConv = await prisma.conversation.findFirst({
      where: {
        OR: [
          { externalId: targetExternalId },
          { externalId: remoteJid },
          ...(clientPhone ? [{ phone: `+${clientPhone}` }] : [])
        ]
      }
    });

    const currentUnread = existingConv?.unreadCount || 0;
    const newUnread = isIncoming ? currentUnread + 1 : 0;
    
    // Всегда переводим диалог на номер телефона @s.whatsapp.net, если телефон известен
    let convExternalId = clientPhone 
      ? `${clientPhone}@s.whatsapp.net` 
      : (existingConv ? existingConv.externalId : targetExternalId);

    // Если ранее диалог был записан под @lid, обновляем его на номер телефона
    if (existingConv && clientPhone && existingConv.externalId.endsWith('@lid')) {
      try {
        await prisma.conversation.update({
          where: { id: existingConv.id },
          data: {
            externalId: convExternalId,
            phone: `+${clientPhone}`,
            ...(isIncoming && clientName ? { clientName } : {})
          }
        });
        existingConv.externalId = convExternalId;
        existingConv.phone = `+${clientPhone}`;
      } catch {}
    }

    const conversation = await prisma.conversation.upsert({
      where: { externalId: convExternalId },
      update: {
        lastMessage: text,
        lastActivity: new Date(),
        updatedAt: new Date(),
        unreadCount: newUnread,
        ...(clientPhone ? { phone: `+${clientPhone}` } : {}),
        ...(isIncoming ? { clientName } : {})
      },
      create: {
        channel: 'WHATSAPP',
        externalId: convExternalId,
        senderName: clientName,
        clientName: clientName,
        phone: clientPhone ? `+${clientPhone}` : null,
        lastMessage: text,
        lastActivity: new Date(),
        updatedAt: new Date(),
        unreadCount: isIncoming ? 1 : 0,
        status: 'NONE',
      },
    });

    // Предотвращение дублирования исходящих сообщений, уже записанных API /api/chat/send
    if (!isIncoming) {
      const recentDuplicate = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          isIncoming: false,
          text: text,
          createdAt: {
            gte: new Date(Date.now() - 15000)
          }
        }
      });
      if (recentDuplicate) {
        console.log(`ℹ️ [DEDUP] Исходящее сообщение уже сохранено в CRM: ${conversation.id}`);
        return;
      }
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: isIncoming ? (clientPhone || remoteJid) : 'manager',
        senderName: clientName,
        senderType: isIncoming ? 'CLIENT' : 'MANAGER',
        text: text,
        isIncoming: isIncoming,
        timestamp: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000),
      },
    });

    console.log(`✅ [CRM OK] Сохранено в диалог ${conversation.id}`);
  } catch (err) {
    console.error('Ошибка сохранения сообщения в БД:', err.message);
  }
}

// Запуск слушателя WhatsApp
async function startWhatsAppListener() {
  if (isStarting) {
    return;
  }
  isStarting = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Очистка предыдущего сокета перед повторным запуском
  if (activeSock) {
    try {
      activeSock.ev.removeAllListeners();
      activeSock.end?.();
    } catch {}
    activeSock = null;
  }

  console.log('⏳ Подготовка сессии WhatsApp из PostgreSQL...');

  try {
    authStateHelper = await usePrismaAuthState(prisma);
    const { state, saveCreds } = authStateHelper;

    let version = [2, 2413, 51];
    try {
      const waVersion = await fetchLatestBaileysVersion();
      if (waVersion?.version) version = waVersion.version;
    } catch {}

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      msgRetryCounterCache,
      browser: Browsers.ubuntu('Chrome'),
      shouldIgnoreJid: (jid) => {
        if (!jid) return true;
        if (jid === 'status@broadcast' || jid.endsWith('@broadcast')) return true;
        const myLid = state.creds?.me?.lid;
        if (myLid) {
          const rawLid = myLid.split(':')[0].split('@')[0];
          if (jid.includes(rawLid)) return true;
        }
        return false;
      },
      getMessage: async (key) => {
        if (!key?.id) return { conversation: '' };

        // 1. Быстрый оперативный кэш
        if (messageStore.has(key.id)) {
          return messageStore.get(key.id);
        }

        // 2. Персистентный кэш в PostgreSQL
        try {
          const row = await prisma.whatsAppSession.findUnique({
            where: { id: `msg-${key.id}` }
          });
          if (row?.data) {
            const parsed = JSON.parse(row.data);
            messageStore.set(key.id, parsed);
            return parsed;
          }
        } catch {}

        // 3. Fallback: поиск по тексту в таблице Message базы CRM
        try {
          const dbMsg = await prisma.message.findFirst({
            where: {
              OR: [
                { id: key.id },
                ...(key.remoteJid ? [{ conversation: { externalId: key.remoteJid } }] : [])
              ]
            },
            orderBy: { createdAt: 'desc' }
          });
          if (dbMsg?.text) {
            return {
              conversation: dbMsg.text
            };
          }
        } catch {}

        // Возвращаем fallback-структуру, чтобы Baileys не сжигал попытку retry
        return { conversation: '' };
      }
    });

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err) {
        console.error('Ошибка сохранения creds в PostgreSQL:', err.message);
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n================ СКАНИРУЙТЕ ЭТОТ QR-КОД ================');
        qrcode.generate(qr, { small: true });
        console.log('WhatsApp -> Связанные устройства -> Привязка устройства');
        console.log('========================================================\n');
      }

      if (connection === 'open') {
        isStarting = false;
        activeSock = sock;
        reconnectAttempts = 0;
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        console.log('🟢 WHATSAPP СЛУШАТЕЛЬ УСПЕШНО ПОДКЛЮЧЕН И СЛУШАЕТ ЧАТЫ!');
        return;
      }

      if (connection === 'close') {
        isStarting = false;
        activeSock = null;

        const error = lastDisconnect?.error;
        const statusCode = error?.output?.statusCode || error?.statusCode;

        if (statusCode === DisconnectReason.connectionReplaced) {
          isSuperseded = true;
          console.log('⚠️ Сессия перехвачена более новым процессом (код 440). Уступаем подключение новому контейнеру.');
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          return;
        }

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('❌ Сессия WhatsApp закрыта (Logged Out). Нужен повторный вход через QR.');
          return;
        }

        // Экспоненциальный backoff: от 2 сек до макс. 60 сек
        reconnectAttempts++;
        const delay = statusCode === 515 
          ? 1500 
          : Math.min(2000 * Math.pow(1.5, reconnectAttempts - 1), 60000);

        if (!reconnectTimer) {
          console.log(`⚠️ Сокет закрыт (код: ${statusCode || 'unknown'}). Попытка реконнекта #${reconnectAttempts} через ${Math.round(delay / 1000)} сек...`);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            startWhatsAppListener().catch(err => {
              console.error('Ошибка перезапуска слушателя:', err.message);
            });
          }, delay);
        }
      }
    });

    // Слушаем входящие сообщения
    sock.ev.on('messages.upsert', async (upsert) => {
      console.log('RAW UPSERT:', JSON.stringify(upsert, null, 2));
      const { messages, type } = upsert;
      console.log(`[UPSERT TYPE] Режим: ${type}, сообщений: ${messages?.length || 0}`);
      for (const msg of messages || []) {
        if (msg.key?.id && msg.message) {
          storeMessage(msg.key, msg.message);
        }
        await processMessage(msg);
      }
    });

    // Обработка сообщений из очереди/дешифрованных повторов
    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        if (update.update?.message) {
          storeMessage(update.key, update.update.message);
          console.log('🔄 Синхронизировано сообщение из очереди:', update.key?.remoteJid);
          await processMessage({
            key: update.key,
            message: update.update.message,
            messageTimestamp: update.update.messageTimestamp || Math.floor(Date.now() / 1000)
          });
        }
      }
    });

    // Обработка события раскрытия телефонного номера из LID в WhatsApp
    sock.ev.on('chats.phoneNumberShare', async ({ lid, jid }) => {
      console.log(`📱 [PHONE SHARE EVENT] LID: ${lid} -> JID: ${jid}`);
      recordLidMapping(lid, jid);
      const cleanPhone = jid?.replace('@s.whatsapp.net', '')?.replace(/\D/g, '');
      if (cleanPhone) {
        try {
          const conv = await prisma.conversation.findFirst({
            where: {
              OR: [
                { externalId: lid },
                { externalId: `${lid.split('@')[0]}@lid` }
              ]
            }
          });
          if (conv) {
            const newExternalId = `${cleanPhone}@s.whatsapp.net`;
            await prisma.conversation.update({
              where: { id: conv.id },
              data: {
                phone: `+${cleanPhone}`,
                externalId: newExternalId
              }
            });
            console.log(`✅ [PHONE SHARE] Диалог ${conv.id} переведен на номер +${cleanPhone}`);
          }
        } catch (e) {
          console.error('Ошибка в chats.phoneNumberShare:', e.message);
        }
      }
    });

    // Извлечение связок LID -> PN из контактов
    sock.ev.on('contacts.upsert', (contacts) => {
      for (const c of contacts || []) {
        if (c.lid && (c.id || c.jid)) {
          recordLidMapping(c.lid, c.jid || c.id);
        }
      }
    });

    sock.ev.on('contacts.update', (updates) => {
      for (const u of updates || []) {
        if (u.lid && (u.id || u.jid)) {
          recordLidMapping(u.lid, u.jid || u.id);
        }
      }
    });
  } catch (err) {
    isStarting = false;
    console.error('Ошибка инициализации WhatsApp слушателя:', err.message);
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startWhatsAppListener().catch(console.error);
      }, 5000);
    }
  }
}

// HTTP-шлюз отправки сообщений и проверки статуса (порт 3001)
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      connected: !!activeSock,
      isStarting,
      reconnectAttempts,
      timestamp: new Date().toISOString()
    }));
  }

  if ((req.method === 'POST' || req.method === 'GET') && req.url === '/reconnect') {
    console.log('🔄 Принудительный запрос на переподключение WhatsApp сокета...');
    isSuperseded = false;
    isStarting = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    startWhatsAppListener().catch(console.error);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'reconnecting' }));
  }

  if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        isSuperseded = false;
        // Если сокет не активен, пробуем инициировать подключение и подождать до 6 секунд
        if (!activeSock) {
          console.log('⚠️ Запрос на отправку при неактивном сокете. Пробуем подключиться...');
          if (!isStarting) {
            startWhatsAppListener().catch(console.error);
          }
          for (let i = 0; i < 12; i++) {
            await new Promise(r => setTimeout(r, 500));
            if (activeSock) break;
          }
        }

        if (!activeSock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'WhatsApp сокет сейчас не подключен. Повторите попытку через пару секунд.' }));
        }

        let { to, text, phone, conversationId } = JSON.parse(body);

        let targetJid = to;

        // 1. Если явно передан телефон, проверяем и находим точный JID/LID через onWhatsApp
        if (phone) {
          const cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone) {
            targetJid = `${cleanPhone}@s.whatsapp.net`;
            try {
              const [waCheck] = await activeSock.onWhatsApp(cleanPhone);
              if (waCheck?.exists) {
                targetJid = waCheck.jid;
                if (waCheck.lid) {
                  recordLidMapping(waCheck.lid, cleanPhone);
                }
              }
            } catch {}
          }
        } else {
          // 2. Ищем диалог в базе данных
          const conv = await prisma.conversation.findFirst({
            where: {
              OR: [
                ...(conversationId ? [{ id: conversationId }] : []),
                { externalId: to },
                { id: to }
              ]
            }
          });

          if (conv) {
            if (conv.phone) {
              const cleanPhone = conv.phone.replace(/\D/g, '');
              if (cleanPhone) {
                targetJid = `${cleanPhone}@s.whatsapp.net`;
                try {
                  const [waCheck] = await activeSock.onWhatsApp(cleanPhone);
                  if (waCheck?.exists) {
                    targetJid = waCheck.jid;
                    if (waCheck.lid) {
                      recordLidMapping(waCheck.lid, cleanPhone);
                    }
                  }
                } catch {}
              }
            } else if (conv.externalId) {
              targetJid = conv.externalId;
            }
          }
        }

        // 3. Если это простой номер без @, добавляем @s.whatsapp.net
        if (!targetJid.includes('@')) {
          const cleanDigits = targetJid.replace(/\D/g, '');
          if (!cleanDigits) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Не найден реальный номер телефона получателя' }));
          }
          targetJid = `${cleanDigits}@s.whatsapp.net`;
        }

        console.log(`🚀 Отправка в WhatsApp на ${targetJid}: "${text}"`);
        const sent = await activeSock.sendMessage(targetJid, { text });
        if (sent?.key?.id && sent?.message) {
          await storeMessage(sent.key, sent.message);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, jid: targetJid }));
      } catch (e) {
        console.error('Ошибка отправки в шлюзе:', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('⛔ ОШИБКА: Порт 3001 уже занят другим процессом wa-listener! Завершаем дубликат.');
    process.exit(0);
  } else {
    console.error('Ошибка сервера шлюза:', err);
  }
});

// Глобальные обработчики необработанных исключений (предотвращают крах процесса на Render)
process.on('uncaughtException', (err) => {
  if (err?.message?.includes('Bad MAC')) {
    console.warn('⚠️ Перехвачена некритическая ошибка Bad MAC при дешифровке, процесс продолжает работу.');
    return;
  }
  console.error('💥 [CRITICAL] Uncaught Exception в wa-listener:', err);
});

process.on('unhandledRejection', (reason) => {
  const str = String(reason?.message || reason);
  if (
    str.includes('Bad MAC') || 
    str.includes('Connection Closed') || 
    str.includes('precondition required') || 
    str.includes('Timed Out') ||
    str.includes('statusCode: 428')
  ) {
    console.warn('⚠️ Перехвачено временное сетевое событие Baileys:', str);
    return;
  }
  console.error('💥 [CRITICAL] Unhandled Rejection в wa-listener:', reason);
});

// Корректное завершение работы при сигналах ОС
const shutdown = async () => {
  console.log('🛑 Завершение работы wa-listener...');
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (server) {
    server.close();
  }
  if (activeSock) {
    try {
      activeSock.ev.removeAllListeners();
      activeSock.end?.();
    } catch {}
  }
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Фоновый Heartbeat для гарантии постоянного подключения
setInterval(() => {
  if (!activeSock && !isStarting && !reconnectTimer && !isSuperseded) {
    console.log('💓 [HEARTBEAT] Сокет WhatsApp не активен, инициируем авто-подключение...');
    startWhatsAppListener().catch(console.error);
  }
}, 30000);

// Предзагрузка существующих телефонных номеров из диалогов базы данных в кэш маппинга
async function preloadMappings() {
  try {
    const convs = await prisma.conversation.findMany({
      where: { phone: { not: null } },
      select: { externalId: true, phone: true }
    });
    for (const c of convs) {
      if (c.externalId && c.phone) {
        recordLidMapping(c.externalId, c.phone);
      }
    }
    console.log(`📋 [INIT] Загружено ${lidToPhoneMap.size} связок LID/номеров из базы CRM`);
  } catch (e) {
    console.warn('Не удалось предзагрузить маппинги:', e.message);
  }
}

// Очистка старых кэшированных сообщений (> 48 часов) из PostgreSQL раз в сутки
setInterval(async () => {
  try {
    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000);
    const deleted = await prisma.whatsAppSession.deleteMany({
      where: {
        id: { startsWith: 'msg-' },
        updatedAt: { lt: twoDaysAgo }
      }
    });
    if (deleted.count > 0) {
      console.log(`🧹 [CLEANUP] Удалено ${deleted.count} устаревших сообщений из кэша retry`);
    }
  } catch {}
}, 24 * 3600 * 1000);

server.listen(3001, '127.0.0.1', () => {
  console.log('🚀 Локальный шлюз отправки WhatsApp запущен на порту 3001');
  preloadMappings().then(() => {
    startWhatsAppListener().catch(console.error);
  });
});
