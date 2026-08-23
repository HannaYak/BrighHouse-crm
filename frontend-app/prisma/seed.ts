const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Начало сидинга базы данных BrightHouse с полным прейскурантом химчистки...');

  // 1. Полный список сотрудников и специалистов по химчистке (15 человек)
  const cleanersData = [
    { name: 'Анастасия', telegramHandle: '@shchetynina_a', phone: '+48000000001', district: 'Mokotów', tags: ['стандарт', 'генеральная'] },
    { name: 'Кукуруза', telegramHandle: '@annkks', phone: '+48000000002', district: 'Wola', tags: ['стандарт', 'генеральная'] },
    { name: 'Вика', telegramHandle: '@kkkwkwpw', phone: '+48000000003', district: 'Praga', tags: ['стандарт', 'только_поддерживающая'] },
    { name: 'Таня Калич', telegramHandle: '@ryzhaja_risovalshchica', phone: '+48000000004', district: 'Śródmieście', tags: ['стандарт', 'генеральная', 'без_стремянки'] },
    { name: 'Анна', telegramHandle: '@slivchykanna', phone: '+48000000005', district: 'Białołęka', tags: ['стандарт', 'генеральная'] },
    { name: 'Ирина', telegramHandle: '@apella_irina', phone: '+48000000006', district: 'Ursynów', tags: ['стандарт', 'генеральная', 'аллергия_на_животных'] },
    { name: 'Ада', telegramHandle: '@Adalaida', phone: '+48000000007', district: 'Wola', tags: ['стандарт', 'генеральная'] },
    { name: 'Лена', telegramHandle: null, phone: '+48507166905', district: 'Mokotów', tags: ['стандарт', 'генеральная'] },
    { name: 'Настя', telegramHandle: null, phone: '+48452071082', district: 'Bielany', tags: ['стандарт', 'генеральная'] },
    { name: 'Лена К', telegramHandle: '@Llna_1701', phone: '+48000000010', district: 'Praga', tags: ['стандарт', 'генеральная'] },
    { name: 'Юлия Работяга', telegramHandle: null, phone: '+375295720840', district: 'Śródmieście', tags: ['стандарт', 'генеральная', 'после_ремонта'] },
    { name: 'Амида', telegramHandle: null, phone: '+48532688407', district: 'Wola', tags: ['стандарт', 'генеральная'] },
    { name: 'Татьяна 2', telegramHandle: '@tatyanka1002', phone: '+48000000013', district: 'Mokotów', tags: ['стандарт', 'генеральная'] },
    { name: 'Батя', telegramHandle: '@RabbitInHole', phone: '+48000000014', district: 'Центр', tags: ['химчистка', 'диваны', 'ковры', 'матрасы'] },
    { name: 'Евгений', telegramHandle: '@White_Lotus_Polska', phone: '+48000000015', district: 'Центр', tags: ['химчистка', 'диваны', 'ковры', 'матрасы'] },
  ];

  for (const c of cleanersData) {
    await prisma.cleaner.upsert({
      where: { phone: c.phone },
      update: c,
      create: {
        ...c,
        authCode: Math.floor(100000 + Math.random() * 900000).toString(),
      },
    });
  }

  // 2. Сетка тарифов
  const tariffs = [
    // СТАНДАРТ
    { type: 'STANDARD', roomsCount: 1, bathroomsCount: 1, maxAreaM2: 25, price: 160, baseDurationMins: 180 },
    { type: 'STANDARD', roomsCount: 1, bathroomsCount: 1, maxAreaM2: 34, price: 170, baseDurationMins: 180 },
    { type: 'STANDARD', roomsCount: 2, bathroomsCount: 1, maxAreaM2: 50, price: 200, baseDurationMins: 240 },
    { type: 'STANDARD', roomsCount: 3, bathroomsCount: 1, maxAreaM2: 80, price: 240, baseDurationMins: 300 },
    { type: 'STANDARD', roomsCount: 3, bathroomsCount: 2, maxAreaM2: 80, price: 290, baseDurationMins: 360 },
    { type: 'STANDARD', roomsCount: 4, bathroomsCount: 1, maxAreaM2: 100, price: 290, baseDurationMins: 360 },
    { type: 'STANDARD', roomsCount: 4, bathroomsCount: 2, maxAreaM2: 100, price: 340, baseDurationMins: 420 },
    { type: 'STANDARD', roomsCount: 5, bathroomsCount: 1, maxAreaM2: 125, price: 330, baseDurationMins: 420 },
    { type: 'STANDARD', roomsCount: 5, bathroomsCount: 2, maxAreaM2: 125, price: 380, baseDurationMins: 480 },

    // СТАНДАРТ+
    { type: 'STANDARD_PLUS', roomsCount: 1, bathroomsCount: 1, maxAreaM2: 34, price: 240, baseDurationMins: 240 },
    { type: 'STANDARD_PLUS', roomsCount: 2, bathroomsCount: 1, maxAreaM2: 50, price: 300, baseDurationMins: 360 },
    { type: 'STANDARD_PLUS', roomsCount: 3, bathroomsCount: 1, maxAreaM2: 80, price: 360, baseDurationMins: 420 },
    { type: 'STANDARD_PLUS', roomsCount: 3, bathroomsCount: 2, maxAreaM2: 80, price: 425, baseDurationMins: 500 },
    { type: 'STANDARD_PLUS', roomsCount: 4, bathroomsCount: 1, maxAreaM2: 100, price: 420, baseDurationMins: 480 },
    { type: 'STANDARD_PLUS', roomsCount: 4, bathroomsCount: 2, maxAreaM2: 100, price: 485, baseDurationMins: 560 },
    { type: 'STANDARD_PLUS', roomsCount: 5, bathroomsCount: 1, maxAreaM2: 120, price: 480, baseDurationMins: 540 },
    { type: 'STANDARD_PLUS', roomsCount: 5, bathroomsCount: 2, maxAreaM2: 120, price: 545, baseDurationMins: 620 },

    // ГЕНЕРАЛЬНАЯ
    { type: 'GENERAL', roomsCount: 1, bathroomsCount: 1, maxAreaM2: 25, price: 510, baseDurationMins: 540 },
    { type: 'GENERAL', roomsCount: 1, bathroomsCount: 1, maxAreaM2: 34, price: 535, baseDurationMins: 540 },
    { type: 'GENERAL', roomsCount: 2, bathroomsCount: 1, maxAreaM2: 50, price: 650, baseDurationMins: 720 },
    { type: 'GENERAL', roomsCount: 3, bathroomsCount: 1, maxAreaM2: 80, price: 800, baseDurationMins: 900 },
    { type: 'GENERAL', roomsCount: 3, bathroomsCount: 2, maxAreaM2: 80, price: 890, baseDurationMins: 1110 },
    { type: 'GENERAL', roomsCount: 4, bathroomsCount: 1, maxAreaM2: 100, price: 1020, baseDurationMins: 1080 },
    { type: 'GENERAL', roomsCount: 4, bathroomsCount: 2, maxAreaM2: 100, price: 1110, baseDurationMins: 1290 },
    { type: 'GENERAL', roomsCount: 5, bathroomsCount: 1, maxAreaM2: 125, price: 1100, baseDurationMins: 1200 },
    { type: 'GENERAL', roomsCount: 5, bathroomsCount: 2, maxAreaM2: 125, price: 1190, baseDurationMins: 1410 },
  ];

  await prisma.serviceTariff.deleteMany({});
  for (const t of tariffs) {
    await prisma.serviceTariff.create({ data: t });
  }

  // 3. Дополнительные услуги + Полная сетка химчистки
  const addOns = [
    // Уборка и допы
    { code: 'window', title: 'Мойка окна', price: 35, durationMins: 30, unit: 'шт' },
    { code: 'balcony', title: 'Уборка балкона', price: 35, durationMins: 30, unit: 'шт' },
    { code: 'closet', title: 'Уборка в шкафах', price: 50, durationMins: 45, unit: 'шт' },
    { code: 'kitchen_closet', title: 'Уборка в кухонных шкафах', price: 100, durationMins: 60, unit: 'шт' },
    { code: 'oven', title: 'Очистка духовки', price: 45, durationMins: 30, unit: 'шт' },
    { code: 'hood', title: 'Очистка вытяжки кухонной', price: 40, durationMins: 30, unit: 'шт' },
    { code: 'microwave', title: 'Очистка микроволновки', price: 20, durationMins: 15, unit: 'шт' },
    { code: 'fridge', title: 'Очистка холодильника', price: 35, durationMins: 30, unit: 'шт' },
    { code: 'fridge_freeze', title: 'Очистка холодильника с морозилкой', price: 50, durationMins: 45, unit: 'шт' },
    { code: 'blinds', title: 'Очистка жалюзи', price: 40, durationMins: 30, unit: 'шт' },
    { code: 'dishes', title: 'Мойка посуды вручную', price: 40, durationMins: 60, unit: 'час' },
    { code: 'stairs', title: 'Мойка лестницы межэтажной', price: 30, durationMins: 20, unit: 'шт' },
    { code: 'litter_box', title: 'Мойка кошачьего лотка', price: 20, durationMins: 15, unit: 'шт' },
    { code: 'ironing', title: 'Глажка', price: 50, durationMins: 60, unit: 'час' },
    { code: 'steamer', title: 'Пароочиститель', price: 75, durationMins: 45, unit: 'шт' },
    { code: 'vacuum', title: 'Наша доставка пылесоса', price: 30, durationMins: 0, unit: 'шт' },

    // ХИМЧИСТКА
    { code: 'dry_sofa_2', title: 'Химчистка дивана (2-местный)', price: 180, durationMins: 60, unit: 'шт' },
    { code: 'dry_sofa_3', title: 'Химчистка дивана (3-местный)', price: 200, durationMins: 75, unit: 'шт' },
    { code: 'dry_sofa_corner_4', title: 'Химчистка дивана (угловой / 4-местный)', price: 220, durationMins: 90, unit: 'шт' },
    { code: 'dry_sofa_corner_5', title: 'Химчистка дивана (угловой на 5 персон)', price: 240, durationMins: 105, unit: 'шт' },
    { code: 'dry_sofa_corner_big', title: 'Химчистка большого углового дивана', price: 260, durationMins: 120, unit: 'шт' },
    { code: 'dry_pillow', title: 'Химчистка подушки', price: 10, durationMins: 10, unit: 'шт' },
    { code: 'dry_armchair', title: 'Химчистка кресла', price: 60, durationMins: 30, unit: 'шт' },
    { code: 'dry_chair', title: 'Химчистка стула', price: 15, durationMins: 15, unit: 'шт' },
    { code: 'dry_carpet_m2', title: 'Химчистка ковра (за м²)', price: 15, durationMins: 15, unit: 'м2' },
    { code: 'dry_headboard', title: 'Химчистка изголовья кровати', price: 60, durationMins: 30, unit: 'шт' },
    { code: 'dry_mattress_side', title: 'Химчистка матраса (1 сторона)', price: 90, durationMins: 45, unit: 'шт' },
  ];

  for (const a of addOns) {
    await prisma.addOnService.upsert({
      where: { code: a.code },
      update: a,
      create: a,
    });
  }

  // 4. Постоянные клиенты
  const clientsData = [
    { name: 'Алиса', phone: '+48538300008', address: 'Przejazd 8', notes: 'Большой дом' },
    { name: 'Евгений', phone: '+48798888447', address: 'Gieldowa 4E/64', notes: 'Постоянный клиент, нужен пылесос' },
    { name: 'Виктория', phone: '+48789330422', address: 'Klobucka 23b/87', notes: 'Постоянная клиентка' },
    { name: 'Алан', phone: '+48789957595', address: 'Hanki czaki 2/55', notes: 'Код от подъезда s1111 звоночек' },
    { name: 'Светлана', phone: '+48736430176', address: 'Ludwika Rydygiera 11, lok 108', notes: 'Абонемент. Начинать с кухни и детских' },
    { name: 'Фарида', phone: '+48577811887', address: 'Rydygiera 15a, 72 klatka F', notes: 'Постоянная клиентка + жалюзи' },
    { name: 'Константин', phone: '+48883455854', address: 'Plocka 15b/5', notes: 'Кровати трогать не надо! Не пылесосить, не менять белье.' },
    { name: 'Артур', phone: '+4866666654', address: 'Nowolipki 10/39', notes: 'Без русскоязычных клинеров' },
  ];

  for (const cl of clientsData) {
    await prisma.client.upsert({
      where: { phone: cl.phone },
      update: cl,
      create: cl,
    });
  }

  console.log('✅ База данных успешно наполнена тарифами, химчисткой и персоналом!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
