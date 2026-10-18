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
let reconnectTimer = null;
let isStarting = false;

// 1. Восстановление файлов сессии из БД PostgreSQL
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

// 2. Бэкап сессии в PostgreSQL
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

async function startWhatsAppListener() {
  if (isStarting) return;
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

  activeSock = sock;

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

    if (connection === 'close') {
      isStarting = false;
      activeSock = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isConflict = statusCode === 440 || statusCode === DisconnectReason.connectionReplaced;

      if (isConflict) {
        console.log('⚠️ Сессия активна на параллельном инстансе. Ожидание 15 сек перед повторной попыткой...');
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            startWhatsAppListener();
          }, 15000);
        }
        return;
      }

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ Сокет WhatsApp закрыт (код: ${statusCode}). Реконнект: ${shouldReconnect}`);
      if (shouldReconnect && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          startWhatsAppListener();
        }, 5000);
      }
    } else if (connection === 'open') {
      isStarting = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      console.log('🟢 WHATSAPP СЛУШАТЕЛЬ УСПЕШНО ПОДКЛЮЧЕН И СЛУШАЕТ ЧАТЫ!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key?.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) continue;

      const isFromMe = Boolean(msg.key.fromMe);

      // Получаем наш собственный номер (чтобы не создавать диалог с самим собой)
      const myJid = sock.user?.id || '';
      const myPhone = myJid.split(':')[0].replace(/\D/g, '');

      // 1. Извлекаем чистый номер телефона клиента
      let clientPhone = '';
      if (remoteJid.endsWith('@s.whatsapp.net')) {
        clientPhone = remoteJid.replace('@s.whatsapp.net', '');
      } else if (msg.key?.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
        clientPhone = msg.key.remoteJidAlt.replace('@s.whatsapp.net', '');
      } else if (sock.signalRepository?.lidMapping?.getPNForLID) {
        const pn = await sock.signalRepository.lidMapping.getPNForLID(remoteJid);
        if (pn) clientPhone = pn.replace('@s.whatsapp.net', '');
      }

      // Игнорируем технические сообщения самому себе
      if (isFromMe && clientPhone && clientPhone === myPhone) {
        continue;
      }

      // Канонический externalId для базы: всегда используем формат телефона @s.whatsapp.net
      const targetExternalId = clientPhone ? `${clientPhone}@s.whatsapp.net` : remoteJid;

      const clientName = isFromMe 
        ? 'Менеджер' 
        : (msg.pushName || (clientPhone ? `+${clientPhone}` : 'Клиент WhatsApp'));

      const text = 
        msg.message.conversation || 
        msg.message.extendedTextMessage?.text || 
        msg.message.imageMessage?.caption || 
        (msg.message.imageMessage ? '📷 Фотография' : '') ||
        '';

      if (!text) continue;

      console.log(`📥 [${isFromMe ? 'ИСХОДЯЩЕЕ' : 'ВХОДЯЩЕЕ'}] WhatsApp ${clientPhone || remoteJid}: "${text}"`);

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
        const newUnread = isFromMe ? 0 : currentUnread + 1;
        const convExternalId = existingConv ? existingConv.externalId : targetExternalId;

        const conversation = await prisma.conversation.upsert({
          where: { externalId: convExternalId },
          update: {
            lastMessage: text,
            lastActivity: new Date(),
            updatedAt: new Date(),
            unreadCount: newUnread,
            ...(isFromMe ? {} : { 
              clientName, 
              phone: clientPhone ? `+${clientPhone}` : existingConv?.phone 
            })
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
            unreadCount: isFromMe ? 0 : 1,
            status: 'NONE',
          },
        });

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: isFromMe ? 'manager' : (clientPhone || remoteJid),
            senderName: isFromMe ? 'Менеджер' : clientName,
            senderType: isFromMe ? 'MANAGER' : 'CLIENT',
            text: text,
            isIncoming: !isFromMe,
            timestamp: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000),
          },
        });

        console.log(`✅ Сообщение сохранено в CRM`);
      } catch (err) {
        console.error('Ошибка записи сообщения:', err.message);
      }
    }
  });
}

// 3. HTTP-шлюз отправки сообщений (порт 3001)
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

        // Если передан ID диалога или LID — находим настоящий телефон в базе
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

        // Очищаем номер от любых символов, кроме цифр
        const cleanDigits = targetPhone.replace(/\D/g, '');
        if (!cleanDigits) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Не найден реальный номер телефона получателя' }));
        }

        const realJid = `${cleanDigits}@s.whatsapp.net`;
        console.log(`🚀 Отправка сообщения через WhatsApp сокет на ${realJid}...`);
        
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

server.listen(3001, '127.0.0.1', () => {
  console.log('🚀 Локальный шлюз отправки WhatsApp запущен на порту 3001');
});

startWhatsAppListener().catch(console.error);
