import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  default: makeWASocket, 
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestWaWebVersion
} = require('@whiskeysockets/baileys');

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const prisma = new PrismaClient();
const SESSION_DIR = './wa-session-store';

// 1. Восстановление сессии из базы данных PostgreSQL при старте контейнера
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
      console.log(`📦 Успешно выгружено ${rows.length} файлов ключей из PostgreSQL в файловый кэш.`);
    }
  } catch (err) {
    console.error('Ошибка выгрузки сессии из БД:', err.message);
  }
}

// 2. Бэкап измененных ключей обратно в PostgreSQL
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
  } catch (err) {
    // игнорируем мелкие гонки записи
  }
}

let isConnecting = false;

async function startWhatsAppListener() {
  if (isConnecting) return;
  isConnecting = true;

  console.log('⏳ Синхронизация ключей WhatsApp с PostgreSQL...');
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
    // Сохраняем все обновленные файлы в PostgreSQL
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
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isConflict = statusCode === 440 || statusCode === DisconnectReason.connectionReplaced;

      if (isConflict) {
        console.log('⚠️ Сессия активна на другом инстансе. Ожидание...');
        return;
      }

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ WhatsApp закрыл сокет (код: ${statusCode}). Переподключение...`);
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
      const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
      const clientName = msg.pushName || `+${cleanPhone}`;

      const text = 
        msg.message.conversation || 
        msg.message.extendedTextMessage?.text || 
        msg.message.imageMessage?.caption || 
        (msg.message.imageMessage ? '📷 Фотография' : '') ||
        '';

      if (!text) continue;

      console.log(`📥 ПОЛУЧЕНО СООБЩЕНИЕ WHATSAPP от ${clientName}: "${text}"`);

      try {
        const conversation = await prisma.conversation.upsert({
          where: { externalId: remoteJid },
          update: {
            lastMessage: text,
            lastActivity: new Date(),
            updatedAt: new Date(),
            unreadCount: { increment: isFromMe ? 0 : 1 },
            clientName: clientName,
            phone: `+${cleanPhone}`,
          },
          create: {
            channel: 'WHATSAPP',
            externalId: remoteJid,
            senderName: clientName,
            clientName: clientName,
            phone: `+${cleanPhone}`,
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

        console.log(`✅ Сообщение WhatsApp сохранено в CRM (диалог: ${conversation.id})`);
      } catch (err) {
        console.error('Ошибка записи сообщения:', err.message);
      }
    }
  });
}

startWhatsAppListener().catch(console.error);
