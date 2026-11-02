const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const filePath = 'C:/Users/hanna/.gemini/antigravity/brain/62b54742-edb8-4b18-93ce-62fcb9e7aabf/.user_uploaded/media_1793554139538_074d5d7a.xlsx';

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return normalizeDate(d);
  }
  if (typeof val === 'string') {
    val = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return normalizeDate(new Date(val));
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(val)) {
      const [d, m, y] = val.split('.').map(Number);
      return normalizeDate(new Date(y, m - 1, d));
    }
    if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(val)) {
      const parts = val.split('.').map(Number);
      return normalizeDate(new Date(2000 + parts[2], parts[1] - 1, parts[0]));
    }
    const matchRange = val.match(/(\d{1,2})-(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (matchRange) {
      return normalizeDate(new Date(Number(matchRange[4]), Number(matchRange[3]) - 1, Number(matchRange[1])));
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return normalizeDate(d);
  }
  return null;
}

function normalizeDate(d) {
  if (!d || isNaN(d.getTime())) return new Date('2024-06-01');
  let year = d.getFullYear();
  if (year < 2021) year = 2024;
  if (year > 2028) year = 2024;
  d.setFullYear(year);
  return d;
}

function cleanPhone(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (str === '---' || str === '-' || str === 'Ватсапп') return '';
  const digits = str.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9) return `+48${digits}`;
  if (digits.startsWith('48') && digits.length >= 11) return `+${digits}`;
  if (digits.startsWith('380') && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return `+48${digits}`;
}

function normalizeChannel(raw) {
  if (!raw) return 'Instagram';
  const s = String(raw).toLowerCase().trim();
  if (s.includes('инста') || s.includes('insta')) return 'Instagram';
  if (s.includes('whatapp') || s.includes('whatsapp') || s.includes('ватсап')) return 'WhatsApp';
  if (s.includes('тг') || s.includes('tg') || s.includes('телеграм')) return 'Telegram';
  if (s.includes('booksy') || s.includes('букси')) return 'Booksy';
  if (s.includes('звонок') || s.includes('смс') || s.includes('сайт')) return 'Звонок / Сайт';
  return 'Instagram';
}

function normalizeClientType(raw) {
  if (!raw) return 'разовый';
  const s = String(raw).toLowerCase().trim();
  if (s.includes('постоянный') || s.includes('постоянник')) return 'постоянный';
  if (s.includes('субабонимент') || s.includes('субабонемент')) return 'СубАбонимент';
  if (s.includes('абонимент') || s.includes('абонемент')) return 'абонемент';
  if (s.includes('частый')) return 'частый';
  if (s.includes('редкий')) return 'редкий';
  if (s.includes('новичок') || s.includes('новый')) return 'новичок';
  if (s.includes('разовый')) return 'разовый';
  return raw.trim();
}

function mapServiceType(service, objectType) {
  const s = (service || '').toLowerCase();
  const obj = (objectType || '').toLowerCase();

  if (s.includes('генеральн') || s.includes('ген.')) return 'GENERAL';
  if (s.includes('ремонт') || s.includes('после ремонта')) return 'AFTER_REPAIR';
  if (obj.includes('офис')) {
    if (s.includes('генеральн')) return 'OFFICE_GENERAL';
    return 'OFFICE_REGULAR';
  }
  return 'STANDARD';
}

async function runImport() {
  console.log('🚀 Начинаем полный импорт базы клиентов и заказов из Excel...');

  const workbook = xlsx.readFile(filePath);
  const crmSheet = workbook.Sheets['СРМ'];
  const rawRows = xlsx.utils.sheet_to_json(crmSheet);

  // 1. Читаем промокоды из листа Лояльность
  const promoMap = new Map();
  try {
    const loyaltySheet = workbook.Sheets['Лояльность'];
    if (loyaltySheet) {
      const loyaltyRows = xlsx.utils.sheet_to_json(loyaltySheet);
      loyaltyRows.forEach(lr => {
        const clientKey = String(lr['КЛИЕНТ'] || '').trim();
        const promo = String(lr['ПРОМО'] || '').trim();
        if (clientKey && promo) {
          const pPhone = cleanPhone(clientKey);
          if (pPhone) promoMap.set(pPhone, promo);
          promoMap.set(clientKey.toLowerCase(), promo);
        }
      });
      console.log(`✅ Загружено промокодов из "Лояльность": ${promoMap.size}`);
    }
  } catch (e) {
    console.warn('Пропуск листа Лояльность:', e.message);
  }

  // 2. Группируем все заказы по уникальным клиентам
  console.log(`📊 Всего строк в листе СРМ: ${rawRows.length}`);

  const clientsGrouped = new Map();
  let validOrderCount = 0;

  rawRows.forEach((r, idx) => {
    const name = String(r['ФИО + Ник'] || r['fn'] || '').trim();
    const address = String(r['Адрес'] || '').trim();
    const service = String(r['Услуга'] || '').trim();
    const rawContact = r['Контакт'] || r['phone'];
    const price = Number(r['Цена: PLN'] !== undefined ? r['Цена: PLN'] : r['value']) || 0;

    // Пропуск разделителей месяцев и пустых строк
    if (!name && !address && !service) return;
    if (!name && !rawContact) return;

    let phone = cleanPhone(rawContact);
    if (!phone) {
      // Стабильный ключ для клиентов без номера телефона
      const safeName = name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_');
      const safeAddr = address.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').slice(0, 20);
      phone = `+48_NO_PHONE_${safeName}_${safeAddr}`.slice(0, 40);
    }

    let date = parseExcelDate(r['Дата']);
    if (!date) {
      date = new Date('2024-06-01');
    }

    const channel = normalizeChannel(r['Привлечение']);
    const clientType = normalizeClientType(r['Тип клиента']);
    const note = String(r['Примечание'] || '').trim();
    const desc = String(r['Описание'] || '').trim();
    const objectType = String(r['Объект'] || 'Квартира').trim();
    const rooms = parseInt(String(r['Комнат'] || '2'), 10) || 2;
    const bathrooms = parseInt(String(r['Санузлов'] || '1'), 10) || 1;

    validOrderCount++;

    if (!clientsGrouped.has(phone)) {
      clientsGrouped.set(phone, {
        phone,
        name: name || 'Клиент',
        address: address || 'Варшава',
        channel,
        clientType,
        notesList: [],
        orders: [],
      });
    }

    const c = clientsGrouped.get(phone);
    if (name && (!c.name || c.name === 'Клиент' || c.name === '---')) c.name = name;
    if (address && (!c.address || c.address === 'Варшава')) c.address = address;
    if (channel && (!c.channel || c.channel === 'Instagram')) c.channel = channel;
    if (clientType && (!c.clientType || c.clientType === 'разовый')) c.clientType = clientType;
    if (note && !c.notesList.includes(note)) c.notesList.push(note);

    c.orders.push({
      date,
      price,
      service,
      channel,
      clientType,
      note,
      desc,
      objectType,
      rooms,
      bathrooms,
      address: address || c.address,
    });
  });

  console.log(`✅ Распознано валидных заказов: ${validOrderCount}`);
  console.log(`✅ Уникальных клиентов для базы: ${clientsGrouped.size}`);

  // 3. Создаем / обновляем клиентов в базе данных
  console.log('⏳ Сохраняем клиентов в PostgreSQL...');
  const existingClients = await prisma.client.findMany();
  const existingClientPhoneMap = new Map();
  existingClients.forEach(c => existingClientPhoneMap.set(c.phone, c));

  let clientsCreated = 0;
  let clientsUpdated = 0;

  for (const clientData of clientsGrouped.values()) {
    const promo = promoMap.get(clientData.phone) || promoMap.get(clientData.name.toLowerCase()) || null;

    // Формируем структурированные метаданные в notes клиента
    const metadataParts = [
      `[Канал: ${clientData.channel}]`,
      `[Тип: ${clientData.clientType}]`,
    ];
    if (promo) metadataParts.push(`[Промокод: ${promo}]`);
    if (clientData.notesList.length > 0) {
      metadataParts.push(`[Заметки: ${clientData.notesList.join('; ')}]`);
    }
    const finalClientNotes = metadataParts.join(' ');

    const existing = existingClientPhoneMap.get(clientData.phone);
    if (!existing) {
      const created = await prisma.client.create({
        data: {
          name: clientData.name,
          phone: clientData.phone,
          address: clientData.address,
          notes: finalClientNotes,
        },
      });
      clientData.dbId = created.id;
      existingClientPhoneMap.set(clientData.phone, created);
      clientsCreated++;
    } else {
      clientData.dbId = existing.id;
      await prisma.client.update({
        where: { id: existing.id },
        data: {
          name: clientData.name !== 'Клиент' ? clientData.name : existing.name,
          address: clientData.address !== 'Варшава' ? clientData.address : existing.address,
          notes: finalClientNotes,
        },
      });
      clientsUpdated++;
    }
  }

  console.log(`✅ Клиенты синхронизированы: создано ${clientsCreated}, обновлено ${clientsUpdated}`);

  // 4. Подготавливаем все заказы для пакетной вставки
  console.log('⏳ Подготовка заказов...');
  const orderPayloads = [];

  for (const clientData of clientsGrouped.values()) {
    const clientId = clientData.dbId;

    clientData.orders.forEach((o, oIdx) => {
      const dStr = o.date.toISOString().slice(0, 10);
      const safePhoneSlice = clientData.phone.replace(/\D/g, '').slice(-4) || '0000';
      const orderNumber = `HIST-${dStr.replace(/-/g, '')}-${clientId}-${safePhoneSlice}-${oIdx + 1}`;

      const descLower = (o.desc || '').toLowerCase();
      const hasVacuum = descLower.includes('пылесос') || descLower.includes('пылсос');
      const hasPets = descLower.includes('кот') || descLower.includes('собак') || descLower.includes('животн');
      const hasOven = descLower.includes('духовк');
      const hasFridge = descLower.includes('холодильник');
      const hasMicrowave = descLower.includes('микроволновк');
      const hasBalcony = descLower.includes('балкон');
      const hasSteamer = descLower.includes('пароочиститель');

      // Число окон если упомянуто в описании
      let windowsCount = 0;
      const winMatch = descLower.match(/(\d+)\s*ок/);
      if (winMatch) windowsCount = parseInt(winMatch[1], 10);

      const serviceType = mapServiceType(o.service, o.objectType);

      // Структурированные примечания заказа
      const orderNotesParts = [
        `[Канал: ${o.channel}]`,
        `[Тип: ${o.clientType}]`,
        `[Объект: ${o.objectType}]`,
      ];
      if (o.service) orderNotesParts.push(`[Услуга: ${o.service}]`);
      if (o.desc) orderNotesParts.push(`[Инфо: ${o.desc}]`);
      if (o.note) orderNotesParts.push(`[Примечание: ${o.note}]`);

      orderPayloads.push({
        orderNumber,
        date: o.date,
        timeSlot: '10:00 — 14:00',
        serviceType,
        areaM2: o.objectType === 'Дом' ? 120 : (o.rooms * 25),
        roomsCount: o.rooms,
        bathroomsCount: o.bathrooms,
        windowsCount,
        hasOven,
        hasFridge,
        hasMicrowave,
        hasBalcony,
        hasVacuum,
        hasPets,
        hasSteamer,
        clientName: clientData.name,
        clientPhone: clientData.phone,
        addressLine1: o.address,
        price: o.price,
        status: 'COMPLETED',
        clientId,
        notes: orderNotesParts.join(' '),
      });
    });
  }

  console.log(`📦 Всего подготовлено ${orderPayloads.length} заказов к загрузке в БД`);

  // 5. Вставляем пачками по 500 штук
  const CHUNK_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < orderPayloads.length; i += CHUNK_SIZE) {
    const chunk = orderPayloads.slice(i, i + CHUNK_SIZE);
    const res = await prisma.order.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    totalInserted += res.count;
    console.log(`   ➜ Загружено заказов: ${totalInserted} / ${orderPayloads.length}`);
  }

  console.log(`🎉 Импорт успешно завершен! Создано ${totalInserted} исторических нарядов в базе.`);
}

runImport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
