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
      console.error('Ошибка записи ключа:', e.message);
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

async function run() {
  console.log('⏳ Подключение к базе данных и генерация QR...');
  const { state, saveCreds } = await usePrismaAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n================ СКАНИРУЙ QR-КОД В WHATSAPP ================');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp -> Связанные устройства -> Привязка устройства');
      console.log('===============================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Сессия завершена на телефоне.');
        process.exit(1);
      }
    } else if (connection === 'open') {
      console.log('\n🟢 УСПЕШНО! Ключи WhatsApp записаны в базу данных PostgreSQL!\n');
      process.exit(0);
    }
  });
}

run().catch((err) => {
  console.error('Ошибка:', err);
  process.exit(1);
});
