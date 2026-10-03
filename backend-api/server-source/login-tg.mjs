import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import input from "input";

const apiId = 24697673;
const apiHash = "5f1649ea00d1db0b7ba211bd9f8b1ed8";
const stringSession = new StringSession("");

(async () => {
  console.log("Запуск авторизации Telegram...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Введи номер телефона аккаунта (+48...): "),
    password: async () => await input.password("Введи пароль 2FA (если есть, иначе Enter): "),
    phoneCode: async () => await input.text("Введи код из Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("\n--- ТВОЯ СЕССИЯ ДЛЯ RENDER ---");
  console.log(client.session.save());
  console.log("-------------------------------\n");
  process.exit(0);
})();
