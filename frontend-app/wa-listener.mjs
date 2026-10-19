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

// Кэш последних сырых сообщений для getMessage (требуется Baileys для обработки Retry/PreKey запросов)
const messageStore = new Map();
const MAX_STORED_MESSAGES = 200;

function storeMessage(key, message) {
  if (!key?.id || !message) return;
  if (messageStore.size >= MAX_STORED_MESSAGES) {
    const oldestKey = messageStore.keys().next().value;
    messageStore.delete(oldestKey);
  }
  messageStore.set(key.id, message);
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

  authStateHelper = await usePrismaAuthState(prisma);
  const { state, saveCreds, removeSessionKey } = authStateHelper;

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
    getMessage: async (key) => {
      if (key?.id && messageStore.has(key.id)) {
        return messageStore.get(key.id);
      }
      try {
        if (key?.id) {
          const dbMsg = await prisma.message.findFirst({
            where: { id: key.id }
          });
          if (dbMsg?.text) {
            return { conversation: dbMsg.text };
          }
        }
      } catch {}
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
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      if (isLoggedOut) {
        console.log('❌ Сессия WhatsApp закрыта (Logged Out). Нужен повторный вход через QR.');
        try {
          await authStateHelper?.clearAllAuth();
        } catch (e) {
          console.error('Ошибка очистки старой сессии:', e.message);
        }
        return;
      }

      // Экспоненциальный backoff: от 2 сек до макс. 60 сек (код 515 перезапускает быстрее)
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

      try {
        const remoteJid = msg.key?.remoteJid;
        if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) {
          continue;
        }

        // Сохраняем сообщение в локальный кэш для getMessage
        if (msg.message) {
          storeMessage(msg.key, msg.message);
        }

        // Перехват stub-сообщений об ошибке дешифрования Signal (Ciphertext Decryption Error)
        if (msg.messageStubType) {
          console.warn(`⚠️ [MSG STUB] remoteJid: ${remoteJid}, stubType: ${msg.messageStubType}`);
          if (msg.messageStubType === 2 || String(msg.messageStubType).includes('CIPHER')) {
            console.warn(`🔄 Сброс поврежденной ветки ratchet для ${remoteJid}...`);
            await removeSessionKey(remoteJid);
          }
          continue;
        }

        // Извлекаем реальный номер телефона (с учетом LID)
        let clientPhone = '';
        if (remoteJid.endsWith('@s.whatsapp.net')) {
          clientPhone = remoteJid.replace('@s.whatsapp.net', '');
        } else if (msg.key?.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
          clientPhone = msg.key.remoteJidAlt.replace('@s.whatsapp.net', '');
        } else if (msg.key?.participant && msg.key.participant.endsWith('@s.whatsapp.net')) {
          clientPhone = msg.key.participant.replace('@s.whatsapp.net', '');
        } else if (sock.signalRepository?.lidMapping?.getPNForLID) {
          try {
            const pn = await sock.signalRepository.lidMapping.getPNForLID(remoteJid);
            if (pn && pn.endsWith('@s.whatsapp.net')) {
              clientPhone = pn.replace('@s.whatsapp.net', '');
            }
          } catch {}
        }

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

        const isFromMe = Boolean(msg.key.fromMe);
        const isIncoming = !isFromMe;

        // Если текст пустой (служебное, зашифрованное или пустое сообщение)
        if (!text) {
          // Не отправляем read receipt, чтобы WhatsApp мог повторить попытку расшифровки
          continue;
        }

        console.log(`📥 [MSG RECV] От: ${clientPhone ? `+${clientPhone}` : remoteJid} | isIncoming: ${isIncoming} | Текст: "${text.slice(0, 80)}"`);

        // Отмечаем прочитанным только успешно распакованное входящее сообщение
        if (isIncoming) {
          try {
            await sock.readMessages([msg.key]);
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
  });

  sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      if (update.update?.message) {
        storeMessage(update.key, update.update.message);
        console.log('🔄 Синхронизировано сообщение из очереди:', update.key?.remoteJid);
      }
    }
  });
}

// HTTP-шлюз отправки сообщений (порт 3001)
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/send') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { to, text } = JSON.parse(body);

        if (!activeSock) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'WhatsApp сокет сейчас не подключен' }));
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

        if (conv?.phone) {
          const cleanPhone = conv.phone.replace(/\D/g, '');
          targetJid = `${cleanPhone}@s.whatsapp.net`;
        } else if (to.endsWith('@lid')) {
          // Если телефон неизвестен, Baileys может отправить напрямую на LID
          targetJid = to;
        } else if (to.endsWith('@s.whatsapp.net')) {
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
  console.error('💥 [CRITICAL] Uncaught Exception в wa-listener:', err);
});

process.on('unhandledRejection', (reason, promise) => {
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

server.listen(3001, '127.0.0.1', () => {
  console.log('🚀 Локальный шлюз отправки WhatsApp запущен на порту 3001');
  startWhatsAppListener().catch(console.error);
});
