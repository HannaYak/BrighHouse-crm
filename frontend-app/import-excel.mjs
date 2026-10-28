import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const XLSX = require('xlsx');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Очистка и приведение номера телефона к формату +48...
function cleanPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits || digits.length < 7) return null;
  if (digits.length === 9) return `+48${digits}`;
  if (digits.startsWith('48') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('0')) return `+48${digits.slice(1)}`;
  return `+${digits}`;
}

// Конвертация русских названий уборок в ServiceType enum CRM
function mapServiceType(serviceName, objectType) {
  const s = String(serviceName || '').toLowerCase();
  const obj = String(objectType || '').toLowerCase();

  if (obj.includes('офис') || obj.includes('ресторан') || obj.includes('магазин')) {
    return s.includes('генеральн') ? 'OFFICE_GENERAL' : 'OFFICE_REGULAR';
  }
  if (s.includes('после ремонта') || s.includes('ремонт')) return 'AFTER_REPAIR';
  if (s.includes('генеральн')) return 'GENERAL';
  if (s.includes('комплексн')) return 'STANDARD_PLUS';
  return 'STANDARD';
}

// Парсинг даты
function parseDate(raw) {
  if (!raw) return new Date();
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Очистка целых чисел (комнаты, санузлы)
function parseCount(val) {
  if (!val) return null;
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  return isNaN(num) ? null : num;
}

async function runImport() {
  console.log('🚀 Открываем файл BRIGHT-CRM.xlsx...');
  const workbook = XLSX.readFile('./BRIGHT-CRM.xlsx');
  const worksheet = workbook.Sheets['СРМ'];

  if (!worksheet) {
    console.error('❌ Лист "СРМ" не найден в файле!');
    return;
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  console.log(`📊 Всего записей об уборках в таблице: ${rows.length}`);

  let clientsCreated = 0;
  let ordersCreated = 0;
  let skippedRows = 0;

  // Кэш клиентов в памяти, чтобы не долбить базу лишними SELECT
  const clientCache = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const rawPhone = row['phone'] || row['Контакт'];
    const phone = cleanPhone(rawPhone);

    // Если у строки вообще нет контактного телефона, пропускаем
    if (!phone) {
      skippedRows++;
      continue;
    }

    const name = String(row['ФИО + Ник'] || row['fn'] || 'Клиент').trim();
    const address = String(row['Адрес'] || '').trim();
    const serviceType = mapServiceType(row['Услуга'], row['Объект']);
    const price = parseFloat(row['Цена: PLN']) || 0;
    const date = parseDate(row['Дата']);
    const rooms = parseCount(row['Комнат']);
    const bathrooms = parseCount(row['Санузлов']);

    // Склеиваем описание, пожелания и примечания
    const notesList = [];
    if (row['Объект']) notesList.push(`Объект: ${row['Объект']}`);
    if (row['Описание']) notesList.push(String(row['Описание']).trim());
    if (row['Примечание']) notesList.push(String(row['Примечание']).trim());
    const fullNotes = notesList.join(' | ');

    try {
      // 1. Проверяем кэш или ищем/создаем клиента
      let clientId = clientCache.get(phone);

      if (!clientId) {
        let client = await prisma.client.findFirst({
          where: { phone: phone }
        });

        if (!client) {
          client = await prisma.client.create({
            data: {
              name: name || 'Клиент WhatsApp',
              phone: phone,
              address: address || 'Warszawa',
              notes: row['Тип клиента'] ? `Тип: ${row['Тип клиента']}` : null,
              createdAt: date,
            }
          });
          clientsCreated++;
        }
        clientId = client.id;
        clientCache.set(phone, clientId);
      }

      // 2. Создаем заказ (историю уборки) с привязкой к клиенту
      const orderNumber = `ORD-${Date.now().toString().slice(-4)}-${i + 1}`;

      await prisma.order.create({
        data: {
          orderNumber: orderNumber,
          date: date,
          serviceType: serviceType,
          status: 'COMPLETED', // Вся история — это выполненные уборки
          clientName: name,
          clientPhone: phone,
          addressLine1: address || 'Warszawa',
          price: price,
          roomsCount: rooms,
          bathroomsCount: bathrooms,
          notes: fullNotes || null,
          clientId: clientId, // <--- ЖЕЛЕЗНАЯ ПРИВЯЗКА К ИСТОРИИ КЛИЕНТА!
          createdAt: date,
          updatedAt: date
        }
      });

      ordersCreated++;

      if (ordersCreated % 250 === 0) {
        console.log(`⏳ Загружено в историю: ${ordersCreated} уборок...`);
      }
    } catch (err) {
      skippedRows++;
    }
  }

  console.log('\n🎉 ИМПОРТ ИСТОРИИ ПОЛНОСТЬЮ ЗАВЕРШЁН!');
  console.log(`👤 Уникальных клиентов в базе: ${clientCache.size} (новых добавлено: ${clientsCreated})`);
  console.log(`🧹 Создано уборок в истории клиентов: ${ordersCreated}`);
  console.log(`⚠️ Пропущено невалидных строк: ${skippedRows}`);
}

runImport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
