import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason 
} = require('@whiskeysockets/baileys');

import { PrismaClient } from '@prisma/client';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

const prisma = new PrismaClient();

async function startWhatsAppListener() {
  console.log('⏳ Проверяем сессию и подключаемся к WhatsApp...');

  const { state, saveCreds } = await useMultiFileAuthState('./wa-session');
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

    // Если ключей нет, выводим QR-код прямо сюда!
    if (qr) {
      console.log('\n================ СКАНИРУЙТЕ QR-КОД В WHATSAPP ================');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp на телефоне -> Связанные устройства -> Привязка устройства');
      console.log('=================================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`⚠️ WhatsApp соединение разорвано (код: ${statusCode}). Переподключение: ${shouldReconnect}`);
      if (shouldReconnect) {
        startWhatsAppListener();
      } else {
        console.log('❌ Сессия была отключена на телефоне. Требуется повторное сканирование QR.');
      }
    } else if (connection === 'open') {
      console.log('\n🟢 WhatsApp слушатель активен и принимает сообщения для CRM BrightHouse!\n');
    }
  });

  // Обработка входящих и исходящих сообщений
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

      const remoteJid = msg.key.remoteJid;
      if (remoteJid.endsWith('@g.us')) continue; // пропускаем группы

      const isFromMe = Boolean(msg.key.fromMe);
      const cleanPhone = remoteJid.replace('@s.whatsapp.net', '');
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
        console.error('Ошибка сохранения WhatsApp сообщения:', err);
      }
    }
  });
}

startWhatsAppListener().catch(console.error);
