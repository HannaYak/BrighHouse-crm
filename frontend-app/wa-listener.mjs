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

// Адаптер сессии Baileys через PostgreSQL (Prisma)
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
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    await prisma.whatsAppSession.upsert({
      where: { id },
      update: { data: serialized },
      create: { id, data: serialized }
    });
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

async function startWhatsAppListener() {
  console.log('⏳ Проверяем сессию в БД и запускаем WhatsApp...');

  const { state, saveCreds } = await usePrismaAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'error' }),
    auth: state,
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n================ СКАНИРУЙТЕ QR-КОД В WHATSAPP (ОДИН РАЗ) ================');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp на телефоне -> Связанные устройства -> Привязка устройства');
      console.log('=========================================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ WhatsApp соединение разорвано (код: ${statusCode}). Переподключение: ${shouldReconnect}`);
      if (shouldReconnect) {
        startWhatsAppListener();
      } else {
        console.log('❌ Сессия была удалена с телефона.');
      }
    } else if (connection === 'open') {
      console.log('🟢 WhatsApp слушатель успешно запущен и авторизован из БД!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

      const remoteJid = msg.key.remoteJid;
      if (remoteJid.endsWith('@g.us')) continue;

      const isFromMe = Boolean(msg.key.fromMe);
      const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
      const clientName = msg.pushName || `WA +${cleanPhone}`;

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
        console.error('Ошибка сохранения WhatsApp сообщения:', err);
      }
    }
  });
}

startWhatsAppListener().catch(console.error);
