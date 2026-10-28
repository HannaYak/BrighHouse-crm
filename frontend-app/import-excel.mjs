import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const XLSX = require('xlsx');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Функция очистки телефона
function cleanPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits || digits.length < 7) return null;
  if (digits.length === 9) return `+48${digits}`;
  if (digits.startsWith('48') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('0')) return `+48${digits.slice(1)}`;
  return `+${digits}`;
}

// Преобразование типов уборок под системный enum CRM
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

// Парсинг комнат/санузлов
function parseCount(val) {
  if (!val) return null;
  const num = parseInt(String(val).replace(/\D/g, ''), 10);
  return isNaN(num) ? null : num;
}

async function runResetAndImport() {
  console.log('🧹 ОЧИСТКА СТАРОЙ БАЗЫ КЛИЕНТОВ И ЗАКАЗОВ...');
  
  // 1. Сначала удаляем связки заказов с клинерами, если модель существует
  try {
    if (prisma.orderCleaner) {
      await prisma.orderCleaner.deleteMany({});
      console.log('  ✔ Связи заказов и клинеров очищены');
    }
  } catch {}

  // 2. Удаляем все старые заказы
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`  ✔ Удалено старых заказов: ${deletedOrders.count}`);

  // 3. Удаляем всех старых клиентов
  const deletedClients = await prisma.client.deleteMany({});
  console.log(`  ✔ Удалено старых карточек клиентов: ${deletedClients.count}`);

  console.log('\n🚀 НАЧИНАЕМ ЧИСТЫЙ ИМПОРТ ИЗ BRIGHT-CRM.xlsx...');
  const workbook = XLSX.readFile('./BRIGHT-CRM.xlsx');
  const worksheet = workbook.Sheets['СРМ'];

  if (!worksheet) {
    console.error('❌ Лист "СРМ" не найден в таблице!');
    return;
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  console.log(`📊 Строк в Excel для обработки: ${rows.length}`);

  let clientsCreated = 0;
  let ordersCreated = 0;
  let skippedRows = 0;

  // Кэш для быстрой привязки нескольких заказов к одному новому клиенту
  const clientMap = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawPhone = row['phone'] || row['Контакт'];
    const phone = cleanPhone(rawPhone);

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

    // Источник и статус клиента
    const source = String(row['Привлечение'] || 'WhatsApp').trim();
    const clientType = String(row['Тип клиента'] || '').trim();

    const clientNotesParts = [];
    if (source) clientNotesParts.push(`Источник: ${source}`);
    if (clientType) clientNotesParts.push(`Тип: ${clientType}`);
    const clientNotes = clientNotesParts.join(' | ');

    // Заметки по конкретной уборке
    const orderNotesParts = [];
    if (row['Объект']) orderNotesParts.push(`Объект: ${row['Объект']}`);
    if (row['Описание']) orderNotesParts.push(String(row['Описание']).trim());
    if (row['Примечание']) orderNotesParts.push(String(row['Примечание']).trim());
    const orderNotes = orderNotesParts.join(' | ');

    try {
      let clientId = clientMap.get(phone);

      // Если клиента с таким номером в этом прогоне еще нет — создаем с нуля
      if (!clientId) {
        const newClient = await prisma.client.create({
          data: {
            name: name || 'Клиент',
            phone: phone,
            address: address || 'Warszawa',
            notes: clientNotes || null,
            createdAt: date,
          }
        });
        clientId = newClient.id;
        clientMap.set(phone, clientId);
        clientsCreated++;
      }

      // Создаем выполненную уборку в истории этого клиента
      const orderNumber = `BH-${Date.now().toString().slice(-4)}-${i + 1}`;

      await prisma.order.create({
        data: {
          orderNumber: orderNumber,
          date: date,
          serviceType: serviceType,
          status: 'COMPLETED',
          clientName: name,
          clientPhone: phone,
          addressLine1: address || 'Warszawa',
          price: price,
          roomsCount: rooms,
          bathroomsCount: bathrooms,
          notes: orderNotes || null,
          clientId: clientId, // Привязываем к ID созданного клиента
          createdAt: date,
          updatedAt: date
        }
      });

      ordersCreated++;

      if (ordersCreated % 300 === 0) {
        console.log(`⏳ Загружено уборок в историю: ${ordersCreated}...`);
      }
    } catch (err) {
      skippedRows++;
    }
  }

  console.log('\n🎉 БАЗА ПОЛНОСТЬЮ ПЕРЕЗАГРУЖЕНА!');
  console.log(`👤 Создано чистых клиентов: ${clientsCreated}`);
  console.log(`🧹 Добавлено уборок в историю: ${ordersCreated}`);
  console.log(`⚠️ Пропущено строк без телефона: ${skippedRows}`);
}

runResetAndImport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
