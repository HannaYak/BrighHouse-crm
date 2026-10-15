import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');

import qrcode from 'qrcode-terminal';
import pino from 'pino';

async function run() {
  console.log('⏳ Инициализация WhatsApp клиента...');

  const { state, saveCreds } = await useMultiFileAuthState('./wa-session');
  const { version } = await fetchLatestBaileysVersion();

  console.log(`📱 Версия протокола WhatsApp: ${version.join('.')}`);
  console.log('⏳ Ожидание генерации QR-кода от серверов WhatsApp...');

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
      console.log('WhatsApp на телефоне ➔ Связанные устройства ➔ Привязка устройства');
      console.log('===============================================================\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`⚠️ Соединение разорвано (код: ${statusCode}).`);
      if (statusCode !== 401 && statusCode !== 403) {
        console.log('🔄 Повторная попытка запроса QR-кода...');
        run();
      }
    } else if (connection === 'open') {
      console.log('\n🟢 УСПЕШНО! WhatsApp подключен к CRM BrightHouse!\n');
      process.exit(0);
    }
  });
}

run().catch((err) => {
  console.error('❌ Ошибка выполнения:', err);
  process.exit(1);
});
