import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  default: makeWASocket, 
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion
} = require('@whiskeysockets/baileys');

import { PrismaClient } from '@prisma/client';
import http from 'http';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const prisma = new PrismaClient();
const SESSION_DIR = './wa-session-store';

let activeSock = null;
let isStarting = false;
let reconnectTimer = null;

// 1. Выгрузка файлов сессии из базы данных PostgreSQL
async function restoreSessionFromDB() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  try {
    const rows = await prisma.whatsAppSession.findMany();
    for (const row of rows) {
      const safeName = encodeURIComponent(row.id) + (row.id.endsWith('.json') ? '' : '.json');
      const filePath = path.join(SESSION_DIR, safeName);
      fs.writeFileSync(filePath, row.data, 'utf-8');
    }
    if (rows.length > 0) {
      console.log(`📦 Загружено ${rows.length} файлов сессии из PostgreSQL.`);
    }
  } catch (err) {
    console.error('Ошибка выгрузки сессии из БД:', err.message);
  }
}

// 2. Сохранение файла сессии в базу данных PostgreSQL
async function backupFileToDB(fileName) {
  try {
    const filePath = path.join(SESSION_DIR, fileName);
    const originalId = decodeURIComponent(fileName.replace(/\.json$/, ''));

    if (!fs.existsSync(filePath)) {
      await prisma.whatsAppSession.deleteMany({ where: { id: originalId } });
      return;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    await prisma.whatsAppSession.upsert({
      where: { id: originalId },
      update: { data },
      create: { id: originalId, data }
    });
  } catch {}
}

// 3. Запуск слушателя WhatsApp
async function startWhatsAppListener() {
  if (isStarting) {
    return;
  }
  isStarting = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log('⏳ Подготовка сессии WhatsApp...');
  await restoreSessionFromDB();

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

  let version = [2, 2413, 51];
  try {
    const waVersion = await fetchLatestWaWebVersion();
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
    markOnlineOnConnect: false,
    browser: ['Ubuntu', 'Chrome', '124.0.0.0']
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    if (fs.existsSync(SESSION_DIR)) {
      const files = fs.readdirSync(SESSION_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await backupFileToDB(file);
        }
      }
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      isStarting = false;
      activeSock = sock; // Фиксируем рабочий сокет для шлюза
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      console.log('🟢 WHATSAPP СЛУШАТЕЛЬ УСПЕШНО ПОДКЛЮЧЕН И СЛУШАЕТ ЧАТЫ!');
      return;
    }

    if (connection === 'close') {
      isStarting = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      if (isLoggedOut) {
        activeSock = null;
        console.log('❌ Сессия WhatsApp закрыта (Logged Out). Нужен повторный вход через QR.');
        return;
      }

      // При любых временных разрывах или перехвате (440) перезапускаем соединение через 5 сек
      if (!reconnectTimer) {
        console.log(`⚠️ Сокет временно закрыт (код: ${statusCode}). Восстановление через 5 сек...`);
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          startWhatsAppListener().catch(console.error);
        }, 5000);
      }
    }
  });

  // 1. Слушаем все входящие сообщения
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      const remoteJid = msg.key?.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) continue;

      // Извлекаем номер собеседника
      let clientPhone = '';
      if (remoteJid.endsWith('@s.whatsapp.net')) {
        clientPhone = remoteJid.replace('@s.whatsapp.net', '');
      } else if (msg.key?.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
        clientPhone = msg.key.remoteJidAlt.replace('@s.whatsapp.net', '');
      } else if (sock.signalRepository?.lidMapping?.getPNForLID) {
        const pn = await sock.signalRepository.lidMapping.getPNForLID(remoteJid);
        if (pn) clientPhone = pn.replace('@s.whatsapp.net', '');
      }

      // Распаковываем текст
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
        (content.imageMessage ? '📷 Фотография' : '') ||
        (content.videoMessage ? '📹 Видео' : '') ||
        (content.audioMessage ? '🎤 Голосовое' : '') ||
        '';

      const isFromMe = Boolean(msg.key.fromMe);
      const isIncoming = !isFromMe;

      console.log(`📥 [MSG RECV] От: ${clientPhone || remoteJid} | isIncoming: ${isIncoming} | Текст: "${text}"`);

      if (!text) {
        try {
          await sock.readMessages([msg.key]);
        } catch {}
        continue;
      }

      const targetExternalId = clientPhone ? `${clientPhone}@s.whatsapp.net` : remoteJid;
      const clientName = isIncoming 
        ? (msg.pushName || (clientPhone ? `+${clientPhone}` : 'Клиент WhatsApp'))
        : 'Менеджер';

      try {
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
        console.error('Ошибка сохранения в БД:', err.message);
      }
    }
  });

  sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      if (update.update?.message) {
        console.log('🔄 Синхронизировано отложенное сообщение:', update.key?.remoteJid);
      }
    }
  });
}

// 4. HTTP-шлюз отправки сообщений (порт 3001)
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

        let targetPhone = to;
        if (to.includes('@lid') || !to.includes('@s.whatsapp.net')) {
          const conv = await prisma.conversation.findFirst({
            where: {
              OR: [
                { externalId: to },
                { id: to }
              ]
            }
          });
          if (conv && conv.phone) {
            targetPhone = conv.phone;
          }
        }

        const cleanDigits = targetPhone.replace(/\D/g, '');
        if (!cleanDigits) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Не найден реальный номер телефона получателя' }));
        }

        const realJid = `${cleanDigits}@s.whatsapp.net`;
        console.log(`🚀 Отправка в WhatsApp на ${realJid}: "${text}"`);
        
        await activeSock.sendMessage(realJid, { text });

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

server.listen(3001, '127.0.0.1', () => {
  console.log('🚀 Локальный шлюз отправки WhatsApp запущен на порту 3001');
  startWhatsAppListener().catch(console.error);
});
