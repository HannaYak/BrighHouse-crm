import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  default: makeWASocket, 
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

import http from 'http';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { prisma, usePrismaAuthState } from './prismaAuthState.mjs';

let activeSock = null;
let isStarting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let authStateHelper = null;

// Кэш для getMessage (требуется Baileys для обработки Retry / PreKey запросов)
const messageStore = new Map();
const MAX_STORED_MESSAGES = 1000;

function storeMessage(key, message) {
  if (!key?.id || !message) return;
  if (messageStore.size >= MAX_STORED_MESSAGES) {
    const oldestKey = messageStore.keys().next().value;
    messageStore.delete(oldestKey);
  }
  messageStore.set(key.id, message);
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

// Извлечение номера телефона отправителя с полной поддержкой @lid
function extractPhone(msg, remoteJid) {
  if (msg.key?.senderPn && msg.key.senderPn.endsWith('@s.whatsapp.net')) {
    return msg.key.senderPn.replace('@s.whatsapp.net', '');
  }
  if (msg.key?.participantPn && msg.key.participantPn.endsWith('@s.whatsapp.net')) {
    return msg.key.participantPn.replace('@s.whatsapp.net', '');
  }
  if (remoteJid.endsWith('@s.whatsapp.net')) {
    return remoteJid.replace('@s.whatsapp.net', '');
  }
  if (msg.key?.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
    return msg.key.remoteJidAlt.replace('@s.whatsapp.net', '');
  }
  if (msg.key?.participant && msg.key.participant.endsWith('@s.whatsapp.net')) {
    return msg.key.participant.replace('@s.whatsapp.net', '');
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

    // Если это LID и номер пока не определился — проверяем сохраненный диалог в БД
    if (!clientPhone && remoteJid.endsWith('@lid')) {
      try {
        const existingConv = await prisma.conversation.findFirst({
          where: { externalId: remoteJid }
        });
        if (existingConv?.phone) {
          clientPhone = existingConv.phone.replace(/\D/g, '');
        }
      } catch {}
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
    const convExternalId = existingConv ? existingConv.externalId : targetExternalId;

    const conversation = await prisma.conversation.upsert({
      where: { externalId: convExternalId },
      update: {
        lastMessage: text,
        lastActivity: new Date(),
        updatedAt: new Date(),
        unreadCount: newUnread,
        ...(isIncoming ? { 
          clientName, 
          phone: clientPhone ? `+${clientPhone}` : existingConv?.phone 
        } : {})
      },
      create: {
        channel: 'WHATSAPP',
        externalId: targetExternalId,
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
      auth: state,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      browser: ['Ubuntu', 'Chrome', '124.0.0.0'],
      msgRetryCounterCache,
      getMessage: async (key) => {
        if (key?.id && messageStore.has(key.id)) {
          return messageStore.get(key.id);
        }
        return undefined;
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
          reconnectAttempts++;
          if (reconnectAttempts <= 3) {
            console.log(`⚠️ Сессия перехвачена (код 440). Возможно, завершается предыдущий контейнер Render. Повторная попытка #${reconnectAttempts} через 25 сек...`);
            if (!reconnectTimer) {
              reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                startWhatsAppListener().catch(console.error);
              }, 25000);
            }
            return;
          } else {
            console.log('⚠️ Сессия стабильно удерживается другим процессом (код 440). Ожидание heartbeat...');
            return;
          }
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
        const { to, text } = JSON.parse(body);

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

        let targetJid = to;

        // Ищем диалог в базе данных
        const conv = await prisma.conversation.findFirst({
          where: {
            OR: [
              { externalId: to },
              { id: to }
            ]
          }
        });

        if (conv) {
          if (conv.phone) {
            const cleanPhone = conv.phone.replace(/\D/g, '');
            targetJid = `${cleanPhone}@s.whatsapp.net`;
          } else if (conv.externalId) {
            targetJid = conv.externalId;
          }
        } else if (to.endsWith('@lid') || to.endsWith('@s.whatsapp.net')) {
          targetJid = to;
        } else {
          const cleanDigits = to.replace(/\D/g, '');
          if (!cleanDigits) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Не найден реальный номер телефона получателя' }));
          }
          targetJid = `${cleanDigits}@s.whatsapp.net`;
        }

        console.log(`🚀 Отправка в WhatsApp на ${targetJid}: "${text}"`);
        await activeSock.sendMessage(targetJid, { text });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
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
  if (!activeSock && !isStarting && !reconnectTimer) {
    console.log('💓 [HEARTBEAT] Сокет WhatsApp не активен, инициируем авто-подключение...');
    startWhatsAppListener().catch(console.error);
  }
}, 30000);

server.listen(3001, '127.0.0.1', () => {
  console.log('🚀 Локальный шлюз отправки WhatsApp запущен на порту 3001');
  startWhatsAppListener().catch(console.error);
});
