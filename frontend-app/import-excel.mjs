import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const XLSX = require('xlsx');
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Функция очистки и приведения телефона к формату +48...
function cleanPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (!digits || digits.length < 7) return null;
  if (digits.length === 9) return `+48${digits}`;
  if (digits.startsWith('48') && digits.length === 11) return `+${digits}`;
  if (digits.startsWith('0')) return `+48${digits.slice(1)}`;
  return `+${digits}`;
}

// Парсинг даты
function parseDate(raw) {
  if (!raw) return new Date();
  if (raw instanceof Date) return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

async function runImport() {
  console.log('🚀 Открываем файл BRIGHT-CRM.xlsx...');
  const workbook = XLSX.readFile('./BRIGHT-CRM.xlsx');
  const sheetName = 'СРМ';
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    console.error(`❌ Лист "${sheetName}" не найден в файле!`);
    return;
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  console.log(`📊 Всего строк найдено в таблице: ${rows.length}`);

  let clientsCreated = 0;
  let clientsUpdated = 0;
  let ordersCreated = 0;
  let skippedRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Берем телефон из колонки phone или Контакт
    const rawPhone = row['phone'] || row['Контакт'];
    const phone = cleanPhone(rawPhone);

    const name = String(row['ФИО + Ник'] || row['fn'] || 'Клиент').trim();
    const address = String(row['Адрес'] || '').trim();
    const service = String(row['Услуга'] || 'Уборка').trim();
    const price = parseFloat(row['Цена: PLN']) || 0;
    const date = parseDate(row['Дата']);
    
    // Собираем все детали и заметки
    const notesArr = [];
    if (row['Объект']) notesArr.push(`Объект: ${row['Объект']}`);
    if (row['Комнат']) notesArr.push(`Комнат: ${row['Комнат']}`);
    if (row['Санузлов']) notesArr.push(`Санузлов: ${row['Санузлов']}`);
    if (row['Описание']) notesArr.push(`Заметка: ${row['Описание']}`);
    if (row['Примечание']) notesArr.push(`Примечание: ${row['Примечание']}`);
    if (row['Тип клиента']) notesArr.push(`Тип: ${row['Тип клиента']}`);
    const fullNotes = notesArr.join(' | ');

    // Если нет телефона, пропускаем строку, так как клиента невозможно идентифицировать
    if (!phone) {
      skippedRows++;
      continue;
    }

    try {
      // 1. Ищем или создаем клиента
      let client = await prisma.client.findFirst({
        where: { phone: phone }
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            name: name || 'Клиент WhatsApp',
            phone: phone,
            address: address || 'Варшава',
            notes: fullNotes,
            createdAt: date,
          }
        });
        clientsCreated++;
      } else {
        // Дополняем адрес, если ранее его не было
        if (!client.address && address) {
          await prisma.client.update({
            where: { id: client.id },
            data: { address }
          });
          clientsUpdated++;
        }
      }

      // 2. Создаем заказ / историю уборки
      const orderNumber = `BH-${Date.now().toString().slice(-6)}-${i + 1}`;
      
      await prisma.order.create({
        data: {
          orderNumber: orderNumber,
          date: date,
          serviceType: service,
          clientName: name || client.name,
          clientPhone: phone,
          addressLine1: address || 'Варшава',
          price: price,
          notes: fullNotes,
          status: 'COMPLETED', // Исторические заказы уже выполнены
          clientId: client.id,
          createdAt: date,
          updatedAt: date
        }
      });

      ordersCreated++;

      if (i % 200 === 0 && i > 0) {
        console.log(`⏳ Обработано ${i} из ${rows.length} строк...`);
      }
    } catch (err) {
      // Игнорируем единичные сбои, если попались битые символы
      skippedRows++;
    }
  }

  console.log('\n🎉 ИМПОРТ УСПЕШНО ЗАВЕРШЁН!');
  console.log(`👤 Новых клиентов добавлено: ${clientsCreated}`);
  console.log(`📝 Клиентов обновлено: ${clientsUpdated}`);
  console.log(`📦 Заказов / уборок в истории создано: ${ordersCreated}`);
  console.log(`⚠️ Пропущено пустых строк: ${skippedRows}`);
}

runImport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
