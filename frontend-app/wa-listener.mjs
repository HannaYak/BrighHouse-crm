import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  default: makeWASocket, 
  fetchLatestBaileysVersion, 
  DisconnectReason,
  initAuthCreds,
  BufferJSON,
  proto 
} = require('@whiskeysockets/baileys');

import { PrismaClient } from '@prisma/client';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const prisma = new PrismaClient();

async function usePrismaAuthState() {
  const readData = async (id) => {
    try {
      const row = await prisma.whatsAppSession.findUnique({ where: { id } });
      if (!row?.data) return null;
      return JSON.parse(row.data, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const writeData = async (id, data) => {
    try {
      const serialized = JSON.stringify(data, BufferJSON.replacer);
      await prisma.whatsAppSession.upsert({
        where: { id },
        update: { data: serialized },
        create: { id, data: serialized }
      });
    } catch (e) {
      console.error('Ошибка записи сессии WhatsApp в БД:', e.message);
    }
  };

  const removeData = async (id) => {
    try {
      await prisma.whatsAppSession.delete({ where: { id } });
    } catch {}
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData('creds', creds)
  };
}

let isConnecting = false;

async function startWhatsAppListener() {
  if (isConnecting) return;
  isConnecting = true;

  console.log('⏳ Запуск стабильного WhatsApp слушателя...');

  const { state, saveCreds } = await usePrismaAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }), // убираем системный мусор из консоли
    auth: state,
    connectTimeoutMs: 180000,
    defaultQueryTimeoutMs: 180000,
    keepAliveIntervalMs: 30000,
    syncFullHistory: false,          // не качать архивные чаты, чтобы не ловить Time-out 408
    markOnlineOnConnect: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n================ СКАНИРУЙТЕ QR-КОД В WHATSAPP ================');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp -> Связанные устройства -> Привязка устройства');
      console.log('=================================================================\n');
    }

    if (connection === 'close') {
      isConnecting = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isConflict = statusCode === 440 || statusCode === DisconnectReason.connectionReplaced;

      if (isConflict) {
        console.log('⚠️ Сессия активна на другом инстансе. Процесс останавливает попытки подключения.');
        return;
      }

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ WhatsApp соединение разорвано (код: ${statusCode}). Переподключение через 5 сек: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startWhatsAppListener, 5000);
      }
    } else if (connection === 'open') {
      isConnecting = false;
      console.log('🟢 WhatsApp слушатель успешно запущен и авторизован из БД!');
    }
  });

  // Прием входящих и исходящих сообщений
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

      const remoteJid = msg.key.remoteJid;
      if (remoteJid.endsWith('@g.us')) continue; // без групп

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

        console.log(`💬 WhatsApp [${clientName}]: ${text}`);
      } catch (err) {
        console.error('Ошибка сохранения WhatsApp сообщения:', err.message);
      }
    }
  });
}

startWhatsAppListener().catch(console.error);
