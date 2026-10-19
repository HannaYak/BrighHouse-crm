import { PrismaClient } from '@prisma/client';
import { 
  initAuthCreds, 
  BufferJSON, 
  proto 
} from '@whiskeysockets/baileys';

// Синглтон PrismaClient для предотвращения создания множественных пулов соединений
export const prisma = globalThis.__prismaClient || (globalThis.__prismaClient = new PrismaClient());

/**
 * Глубокое рекурсивное восстановление NodeJS Buffer.
 * Предотвращает ошибку "Bad MAC at verifyMAC" в libsignal, восстанавливая
 * десериализованные объекты { type: 'Buffer', data: [...] } в настоящие Buffer.
 */
export function restoreBuffers(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Buffer.isBuffer(obj)) return obj;
  if (obj.type === 'Buffer' || obj.buffer === true) {
    const val = obj.data ?? obj.value;
    if (typeof val === 'string') {
      return Buffer.from(val, 'base64');
    }
    if (Array.isArray(val) || val instanceof Uint8Array) {
      return Buffer.from(val);
    }
  }
  if (Array.isArray(obj)) {
    return obj.map(restoreBuffers);
  }
  for (const key of Object.keys(obj)) {
    obj[key] = restoreBuffers(obj[key]);
  }
  return obj;
}

/**
 * Высокопроизводительное хранилище сессий Baileys в PostgreSQL через Prisma.
 * Полностью устраняет проблему потери файлов сессии на эфемерных дисках (Render.com).
 * Включает in-memory кэш для быстрой дешифровки сообщений и снижения нагрузки на БД.
 */
export async function usePrismaAuthState(prismaClient) {
  const db = prismaClient || prisma;
  const memoryCache = new Map();

  const readData = async (id) => {
    if (memoryCache.has(id)) {
      const cached = memoryCache.get(id);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    }
    try {
      let row = await db.whatsAppSession.findUnique({ where: { id } });
      // Fallback для совместимости со старыми записями с суффиксом .json
      if (!row && !id.endsWith('.json')) {
        row = await db.whatsAppSession.findUnique({ where: { id: `${id}.json` } });
      }
      if (!row?.data) {
        memoryCache.delete(id);
        return null;
      }
      let parsed = JSON.parse(row.data, BufferJSON.reviver);
      parsed = restoreBuffers(parsed);
      memoryCache.set(id, parsed);
      return parsed;
    } catch (e) {
      console.error(`[AUTH] Ошибка чтения ключа ${id}:`, e.message);
      return null;
    }
  };

  const writeData = async (id, data, retries = 3) => {
    const restored = restoreBuffers(data);
    memoryCache.set(id, restored);
    const serialized = JSON.stringify(restored, BufferJSON.replacer);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await db.whatsAppSession.upsert({
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
      await db.whatsAppSession.deleteMany({
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
  } else {
    creds = restoreBuffers(creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          const missingIds = [];

          // 1. Проверяем кэш в оперативной памяти (только валидные значения, не null)
          for (const id of ids) {
            const key = `${type}-${id}`;
            if (memoryCache.has(key)) {
              let val = memoryCache.get(key);
              if (val !== null && val !== undefined) {
                if (type === 'app-state-sync-key' && val) {
                  val = proto.Message.AppStateSyncKeyData.fromObject(val);
                }
                data[id] = val;
                continue;
              }
            }
            missingIds.push(id);
          }

          if (missingIds.length === 0) {
            return data;
          }

          // 2. Один батч-запрос к БД для всех недостающих ключей
          try {
            const fullKeys = missingIds.map(id => `${type}-${id}`);
            const rows = await db.whatsAppSession.findMany({
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
                parsed = restoreBuffers(parsed);
                memoryCache.set(key, parsed);
                if (type === 'app-state-sync-key' && parsed) {
                  parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed);
                }
                data[id] = parsed;
              } else {
                memoryCache.delete(key);
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
                const restored = restoreBuffers(value);
                memoryCache.set(key, restored);
                upsertTasks.push([key, restored]);
              } else {
                memoryCache.delete(key);
                deleteIds.push(key);
              }
            }
          }

          // Удаление пачкой
          if (deleteIds.length > 0) {
            try {
              await db.whatsAppSession.deleteMany({
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
      if (!jid) return;
      const clean = jid.replace('@s.whatsapp.net', '').replace('@lid', '').split(':')[0];
      console.log(`[AUTH] Сброс Signal сессий для: ${jid} (clean: ${clean})`);
      memoryCache.delete(`session-${jid}`);
      memoryCache.delete(`session-${clean}.0`);
      for (const k of Array.from(memoryCache.keys())) {
        if (k.startsWith(`session-${clean}`)) {
          memoryCache.delete(k);
        }
      }
      try {
        await db.whatsAppSession.deleteMany({
          where: {
            OR: [
              { id: `session-${jid}` },
              { id: { startsWith: `session-${clean}.` } }
            ]
          }
        });
      } catch (e) {
        console.error(`[AUTH] Ошибка удаления сессий для ${clean}:`, e.message);
      }
    },
    clearAllAuth: async () => {
      memoryCache.clear();
      await db.whatsAppSession.deleteMany();
      console.log('[AUTH] Все сессии очищены из БД.');
    }
  };
}
