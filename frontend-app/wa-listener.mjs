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

// 1. Восстановление сессии из БД PostgreSQL
async function restoreSessionFromDB() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  try {
    const rows = await prisma.whatsAppSession.findMany();
    for (const row of rows) {
      const filePath = path.join(SESSION_DIR, row.id.endsWith('.json') ? row.id : `${row.id}.json`);
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
    if (!fs.existsSync(filePath)) {
      await prisma.whatsAppSession.deleteMany({ where: { id: fileName } });
      return;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    await prisma.whatsAppSession.upsert({
      where: { id: fileName },
      update: { data },
      create: { id: fileName, data }
    });
  } catch {}
}

let isConnecting = false;

async function startWhatsAppListener() {
  if (isConnecting) return;
  isConnecting = true;

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
      isConnecting = false;
      activeSock = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isConflict = statusCode === 440 || statusCode === DisconnectReason.connectionReplaced;

      if (isConflict) {
        console.log('⚠️ Сессия активна на параллельном инстансе. Ожидание освобождения сокета (15 сек)...');
        setTimeout(startWhatsAppListener, 15000);
        return;
      }

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ Сокет WhatsApp закрыт (код: ${statusCode}). Переподключение через 5 сек: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startWhatsAppListener, 5000);
      }
    } else if (connection === 'open') {
      isConnecting = false;
      console.log('🟢 WHATSAPP СЛУШАТЕЛЬ УСПЕШНО ПОДКЛЮЧЕН И СЛУШАЕТ ЧАТЫ!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (!msg.message) continue;

      const remoteJid = msg.key?.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) continue;

      const isFromMe = Boolean(msg.key.fromMe);

      // Корректно определяем реальный номер телефона:
      let cleanPhone = '';
      if (remoteJid.endsWith('@s.whatsapp.net')) {
        cleanPhone = remoteJid.replace('@s.whatsapp.net', '');
      } else if (msg.key?.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
        cleanPhone = msg.key.remoteJidAlt.replace('@s.whatsapp.net', '');
      } else {
        const pn = sock.signalRepository?.lidMapping?.getPNForLID ? 
          await sock.signalRepository.lidMapping.getPNForLID(remoteJid) : null;
        cleanPhone = pn ? pn.replace('@s.whatsapp.net', '') : remoteJid.replace('@lid', '');
      }

      // Имя контакта
      const clientName = isFromMe 
        ? 'Менеджер' 
        : (msg.pushName || (cleanPhone.length < 13 ? `+${cleanPhone}` : 'Клиент WhatsApp'));

      const text = 
        msg.message.conversation || 
        msg.message.extendedTextMessage?.text || 
        msg.message.imageMessage?.caption || 
        (msg.message.imageMessage ? '📷 Фотография' : '') ||
        '';

      if (!text) continue;

      console.log(`📥 [${isFromMe ? 'ИСХОДЯЩЕЕ' : 'ВХОДЯЩЕЕ'}] WhatsApp ${cleanPhone}: "${text}"`);

      try {
        const existingConv = await prisma.conversation.findUnique({
          where: { externalId: remoteJid }
        });

        const currentUnread = existingConv?.unreadCount || 0;
        const newUnread = isFromMe ? 0 : currentUnread + 1;

        const conversation = await prisma.conversation.upsert({
          where: { externalId: remoteJid },
          update: {
            lastMessage: text,
            lastActivity: new Date(),
            updatedAt: new Date(),
            unreadCount: newUnread,
            ...(isFromMe ? {} : { clientName, phone: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}` })
          },
          create: {
            channel: 'WHATSAPP',
            externalId: remoteJid,
            senderName: clientName,
            clientName: clientName,
            phone: cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`,
            lastMessage: text,
            lastActivity: new Date(),
            updatedAt: new Date(),
            unreadCount: isFromMe ? 0 : 1,
          },
        });

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: isFromMe ? 'manager' : remoteJid,
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
} // <--- Закрыта функция startWhatsAppListener

// 3. HTTP-шлюз для отправки сообщений менеджером из интерфейса CRM (порт 3001)
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

        const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
        await activeSock.sendMessage(jid, { text });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
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
