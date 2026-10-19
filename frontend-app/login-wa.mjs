import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  default: makeWASocket, 
  fetchLatestBaileysVersion, 
  DisconnectReason
} = require('@whiskeysockets/baileys');

import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { prisma, usePrismaAuthState } from './prismaAuthState.mjs';

async function startLogin() {
  console.log('⏳ Подключение и ожидание QR...');
  const { state, saveCreds, clearAllAuth } = await usePrismaAuthState(prisma);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    connectTimeoutMs: 60000,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n================ СКАНИРУЙТЕ ЭТОТ QR-КОД ================');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp -> Связанные устройства -> Привязка устройства');
      console.log('========================================================\n');
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode || error?.statusCode;
      // При первичном сканировании часто прилетает код 515 (перезапуск потока) — это норма!
      if (statusCode === 515 || statusCode === 408) {
        console.log('🔄 Сервер WhatsApp финализирует сессию, подключаемся...');
        startLogin();
      } else if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Сессия сброшена телефоном. Очищаем старые ключи...');
        await clearAllAuth();
        startLogin();
      } else {
        console.log(`⚠️ Переподключение (код: ${statusCode})...`);
        setTimeout(() => startLogin(), 3000);
      }
    } else if (connection === 'open') {
      console.log('\n🟢 УСПЕШНО! WhatsApp подключен и сохранен в PostgreSQL!');
      console.log('Теперь можно закрыть Shell и пользоваться CRM.\n');
      setTimeout(() => process.exit(0), 3000);
    }
  });
}

startLogin().catch(console.error);
