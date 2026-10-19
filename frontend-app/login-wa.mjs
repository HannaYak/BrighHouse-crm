import makeWASocket, { 
  fetchLatestBaileysVersion, 
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';

import qrcode from 'qrcode-terminal';
import pino from 'pino';
import { prisma, usePrismaAuthState } from './prismaAuthState.mjs';

let isSyncing = false;

async function startLogin() {
  console.log('⏳ Подготовка сессии и подключение к WhatsApp...');
  const { state, saveCreds, clearAllAuth } = await usePrismaAuthState(prisma);
  
  let version = [2, 2413, 51];
  try {
    const waVersion = await fetchLatestBaileysVersion();
    if (waVersion?.version) version = waVersion.version;
  } catch {}

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    browser: Browsers.ubuntu('Chrome'),
  });

  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (e) {
      console.error('Ошибка сохранения creds:', e.message);
    }
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n================ СКАНИРУЙТЕ ЭТОТ QR-КОД ================');
      qrcode.generate(qr, { small: true });
      console.log('WhatsApp -> Связанные устройства -> Привязка устройства');
      console.log('========================================================\n');
    }

    if (connection === 'close') {
      if (isSyncing) {
        console.log('⚠️ Сокет закрылся во время начальной синхронизации.');
      }
      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode || error?.statusCode;
      
      // Код 515 или 408 — норма при первичном обмене ключами
      if (statusCode === 515 || statusCode === 408) {
        console.log('🔄 Сервер WhatsApp финализирует связку сессии, переподключаемся...');
        setTimeout(() => startLogin(), 1500);
      } else if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Сессия сброшена телефоном. Очищаем старые ключи...');
        await clearAllAuth();
        setTimeout(() => startLogin(), 2000);
      } else {
        console.log(`⚠️ Соединение прервано (код: ${statusCode || 'unknown'}). Повтор через 3 сек...`);
        setTimeout(() => startLogin(), 3000);
      }
    } else if (connection === 'open') {
      if (isSyncing) return;
      isSyncing = true;

      console.log('\n🟢 СОЕДИНЕНИЕ С WHATSAPP УСТАНОВЛЕНО!');
      console.log('⏳ ВНИМАНИЕ: Идет первичная синхронизация крипто-ключей и сессий.');
      console.log('Пожалуйста, НЕ ЗАКРЫВАЙТЕ процесс в течение 45 секунд, чтобы сессия полностью стабилизировалась!\n');

      let remaining = 45;
      const countdown = setInterval(async () => {
        remaining -= 5;
        if (remaining > 0) {
          console.log(`⏳ Синхронизация сессий... осталось ${remaining} сек`);
        } else {
          clearInterval(countdown);
          console.log('\n========================================================');
          console.log('✅ ПЕРВИЧНАЯ СИНХРОНИЗАЦИЯ УСПЕШНО ЗАВЕРШЕНА!');
          console.log('Все Pre-Keys, сессии и учетные данные надежно сохранены в PostgreSQL.');
          console.log('WhatsApp готов к приему и отправке сообщений в CRM.');
          console.log('========================================================\n');
          
          try {
            sock.ev.removeAllListeners();
            sock.end?.();
          } catch {}
          await prisma.$disconnect();
          process.exit(0);
        }
      }, 5000);
    }
  });
}

startLogin().catch(console.error);
