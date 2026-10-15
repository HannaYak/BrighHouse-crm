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
      console.error('Ошибка записи:', e.message);
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

async function startLogin() {
  console.log('⏳ Подключение и ожидание QR...');
  const { state, saveCreds } = await usePrismaAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    connectTimeoutMs: 60000,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n================ СКАНИРУЙТЕ ЭТОТ QR-КОД ================');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp -> Связанные устройства -> Привязка устройства');
      console.log('========================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      // При первичном сканировании часто прилетает код 515 (перезапуск потока) — это норма!
      if (statusCode === 515 || statusCode === 408) {
        console.log('🔄 Сервер WhatsApp финализирует сессию, подключаемся...');
        startLogin();
      } else if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Сессия сброшена телефоном. Очищаем старые ключи...');
        prisma.whatsAppSession.deleteMany().then(() => startLogin());
      } else {
        console.log(`⚠️ Переподключение (код: ${statusCode})...`);
        startLogin();
      }
    } else if (connection === 'open') {
      console.log('\n🟢 УСПЕШНО! WhatsApp подключен и сохранен в PostgreSQL!');
      console.log('Теперь можно закрыть Shell и пользоваться CRM.\n');
      setTimeout(() => process.exit(0), 3000);
    }
  });
}

startLogin().catch(console.error);
