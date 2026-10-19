import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { 
  initAuthCreds, 
  BufferJSON, 
  proto 
} = require('@whiskeysockets/baileys');

/**
 * Высокопроизводительное хранилище сессий Baileys в PostgreSQL через Prisma.
 * Полностью устраняет проблему потери файлов сессии на эфемерных дисках (Render.com).
 * Включает in-memory кэш для быстрой дешифровки сообщений и снижения нагрузки на БД.
 */
export async function usePrismaAuthState(prisma) {
  const memoryCache = new Map();

  const readData = async (id) => {
    if (memoryCache.has(id)) {
      return memoryCache.get(id);
    }
    try {
      let row = await prisma.whatsAppSession.findUnique({ where: { id } });
      // Fallback для совместимости со старыми записями с суффиксом .json
      if (!row && !id.endsWith('.json')) {
        row = await prisma.whatsAppSession.findUnique({ where: { id: `${id}.json` } });
      }
      if (!row?.data) {
        memoryCache.set(id, null);
        return null;
      }
      const parsed = JSON.parse(row.data, BufferJSON.reviver);
      memoryCache.set(id, parsed);
      return parsed;
    } catch (e) {
      console.error(`[AUTH] Ошибка чтения ключа ${id}:`, e.message);
      return null;
    }
  };

  const writeData = async (id, data, retries = 3) => {
    memoryCache.set(id, data);
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await prisma.whatsAppSession.upsert({
          where: { id },
          update: { data: serialized },
          create: { id, data: serialized }
        });
        return;
      } catch (e) {
        if (attempt === retries) {
          console.error(`[AUTH] Ошибка записи ключа ${id} (попытка ${attempt}/${retries}):`, e.message);
        } else {
          await new Promise(r => setTimeout(r, 300 * attempt));
        }
      }
    }
  };

  const removeData = async (id) => {
    memoryCache.delete(id);
    try {
      await prisma.whatsAppSession.deleteMany({
        where: {
          OR: [
            { id },
            { id: `${id}.json` }
          ]
        }
      });
    } catch (e) {
      console.error(`[AUTH] Ошибка удаления ключа ${id}:`, e.message);
    }
  };

  // 1. Инициализация учетных данных (creds)
  let creds = await readData('creds');
  if (!creds) {
    creds = initAuthCreds();
    await writeData('creds', creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          const missingIds = [];

          // 1. Проверяем кэш в оперативной памяти
          for (const id of ids) {
            const key = `${type}-${id}`;
            if (memoryCache.has(key)) {
              let val = memoryCache.get(key);
              if (type === 'app-state-sync-key' && val) {
                val = proto.Message.AppStateSyncKeyData.fromObject(val);
              }
              data[id] = val;
            } else {
              missingIds.push(id);
            }
          }

          if (missingIds.length === 0) {
            return data;
          }

          // 2. Один батч-запрос к БД для всех недостающих ключей
          try {
            const fullKeys = missingIds.map(id => `${type}-${id}`);
            const rows = await prisma.whatsAppSession.findMany({
              where: { id: { in: fullKeys } }
            });

            const rowMap = new Map();
            for (const r of rows) {
              rowMap.set(r.id, r.data);
            }

            for (const id of missingIds) {
              const key = `${type}-${id}`;
              const rawData = rowMap.get(key);
              if (rawData) {
                let parsed = JSON.parse(rawData, BufferJSON.reviver);
                memoryCache.set(key, parsed);
                if (type === 'app-state-sync-key' && parsed) {
                  parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed);
                }
                data[id] = parsed;
              } else {
                memoryCache.set(key, null);
                data[id] = null;
              }
            }
          } catch (err) {
            console.error(`[AUTH] Ошибка батч-чтения ключей (${type}):`, err.message);
            for (const id of missingIds) {
              if (data[id] === undefined) data[id] = null;
            }
          }

          return data;
        },

        set: async (data) => {
          const upsertTasks = [];
          const deleteIds = [];

          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;

              if (value) {
                memoryCache.set(key, value);
                upsertTasks.push([key, value]);
              } else {
                memoryCache.delete(key);
                deleteIds.push(key);
              }
            }
          }

          // Удаление пачкой
          if (deleteIds.length > 0) {
            try {
              await prisma.whatsAppSession.deleteMany({
                where: { id: { in: deleteIds } }
              });
            } catch (e) {
              console.error('[AUTH] Ошибка батч-удаления:', e.message);
            }
          }

          // Запись частями по 3 для предотвращения исчерпания пула соединений Prisma/Supabase
          if (upsertTasks.length > 0) {
            for (let i = 0; i < upsertTasks.length; i += 3) {
              const chunk = upsertTasks.slice(i, i + 3);
              await Promise.all(
                chunk.map(([key, value]) => writeData(key, value))
              );
            }
          }
        }
      }
    },
    saveCreds: async () => {
      await writeData('creds', creds);
    },
    removeSessionKey: async (jid) => {
      console.log(`[AUTH] Сброс Signal сессии для JID: ${jid}`);
      await removeData(`session-${jid}`);
    },
    clearAllAuth: async () => {
      memoryCache.clear();
      await prisma.whatsAppSession.deleteMany();
      console.log('[AUTH] Все сессии очищены из БД.');
    }
  };
}
