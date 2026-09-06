export type ServiceType = 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR';

export interface CalculationInput {
  serviceType: ServiceType;
  roomsCount: number;
  bathroomsCount: number;
  areaM2: number;

  // Окна и балконы
  windowsCount?: number;          // 35 zł
  balconyWindowsCount?: number;   // 45 zł
  mosquitoNetsCount?: number;     // 15 zł
  hasBalcony?: boolean;           // 35 zł
  hasGlassBalcony?: boolean;      // 55 zł

  // Кухня и техника
  hasOven?: boolean;              // 45 zł
  hasHood?: boolean;              // 40 zł
  hasMicrowave?: boolean;         // 20 zł
  hasFridge?: boolean;            // 35 zł
  hasFridgeFreeze?: boolean;      // 50 zł
  hasKitchenClosets?: boolean;    // 100 zł
  closetsCount?: number;          // 50 zł/шкаф
  hasDishwasherClean?: boolean;   // 20 zł
  hasWashingMachineClean?: boolean;// 30 zł

  // Дополнительно по дому
  hasStairs?: boolean;            // 25 / 35 / 35 / 40 zł
  hasSteamer?: boolean;           // 75 zł (пароочиститель)
  hasBlinds?: boolean;            // 40 zł
  hasVentilation?: boolean;       // 20 zł
  hasMoldRemoval?: boolean;       // 40 zł
  hasPetHair?: boolean;           // 40 zł
  hasCatLitter?: boolean;         // 20 zł
  furnitureMoveCount?: number;    // 15 zł/шт
  hasPipeClog?: boolean;          // 15 zł
  hasLadderRental?: boolean;      // 90 zł
  tileGroutAreaM2?: number;       // 15 zł/м²
  steamerZonesCount?: number;     // 75 zł/зону

  // Почасовые и текстиль
  curtainsPairsCount?: number;    // 65 zł/пара
  laundryHours?: number;          // 50 zł/ч
  ironingHours?: number;          // 50 zł/ч
  dishesHours?: number;           // 40 zł/ч
  hasDishesHours?: number;        // для совместимости с OrderModal
  hasIroningHours?: number;       // для совместимости с OrderModal
  organizingHours?: number;       // 50 zł/ч
  gardenHours?: number;           // 50 zł/ч

  hasVacuum?: boolean;            // 30 zł
  hasPets?: boolean;              // аллергия
  hasKeys?: boolean;

  // ПОЛНАЯ ХИМЧИСТКА МЕБЕЛИ И ТЕКСТИЛЯ
  drySofa2?: number;              // 180 zł (2-местный)
  drySofa3?: number;              // 200 zł (3-местный)
  drySofaCorner4?: number;        // 220 zł (угловой)
  drySofaCorner5?: number;        // 240 zł (большой угловой)
  drySofaBig?: number;            // 260 zł (П-образный)
  dryArmchair?: number;           // 60 zł (кресло)
  dryChair?: number;              // 15 zł (стул)
  dryPouf?: number;               // 30 zł (пуф / банкетка)
  dryPillowsSmall?: number;       // 15 zł (подушка диванная/декоративная)
  dryPillowsBig?: number;         // 25 zł (подушка спальная большая)
  dryHeadboard?: number;          // 70 zł (изголовье кровати)
  dryMattressSingle?: number;     // 90 zł (матрас 1-спальный с 2 сторон)
  dryMattressDouble?: number;     // 140 zł (матрас 2-спальный с 2 сторон)
  dryMattressSide?: number;       // 90 zł (обратная совместимость)
  dryCarpetM2?: number;           // 15 zł/м² (ковер)

  cleanersCount: number;
  startTime: string;
  addonRates?: Record<string, { price: number; durationMins: number }>;
}

export interface CalculationResult {
  totalPrice: number;
  baseDurationMinutes: number;
  actualDurationMinutes: number;
  formattedDuration: string;
  endTime: string;
}

export function calculateBrightHouseOrder(input: CalculationInput): CalculationResult {
  let price = 0;
  let durationMins = 0;

  const rooms = Math.max(1, Number(input.roomsCount) || 1);
  const baths = Math.max(1, Number(input.bathroomsCount) || 1);
  const area = Number(input.areaM2) || 45;

  // 1. БАЗОВАЯ СЕТКА ТАРИФОВ
  if (input.serviceType === 'STANDARD') {
    if (rooms === 1) {
      price = area <= 25 ? 160 : 170;
      durationMins = 180;
    } else if (rooms === 2) {
      price = 200;
      durationMins = 240;
    } else if (rooms === 3) {
      price = 240;
      durationMins = 300;
    } else if (rooms === 4) {
      price = 290;
      durationMins = 360;
    } else {
      price = 330;
      durationMins = 420;
    }
    price += (baths >= 2 ? (baths - 1) * 50 : 0);
    durationMins += (baths >= 2 ? (baths - 1) * 60 : 0);
    if (input.hasStairs) { price += 25; durationMins += 20; }

  } else if (input.serviceType === 'STANDARD_PLUS') {
    if (rooms === 1) {
      price = 240;
      durationMins = 240;
    } else if (rooms === 2) {
      price = 300;
      durationMins = 360;
    } else if (rooms === 3) {
      price = 360;
      durationMins = 420;
    } else if (rooms === 4) {
      price = 420;
      durationMins = 480;
    } else {
      price = 480;
      durationMins = 540;
    }
    price += (baths >= 2 ? (baths - 1) * 65 : 0);
    durationMins += (baths >= 2 ? (baths - 1) * 80 : 0);
    if (input.hasStairs) { price += 35; durationMins += 30; }

  } else if (input.serviceType === 'GENERAL') {
    if (rooms === 1) {
      price = area <= 25 ? 510 : 535;
      durationMins = 540;
    } else if (rooms === 2) {
      price = 650;
      durationMins = 720;
    } else if (rooms === 3) {
      price = 800;
      durationMins = 900;
    } else if (rooms === 4) {
      price = 1020;
      durationMins = 1080;
    } else {
      price = 1100;
      durationMins = 1200;
    }
    price += (baths >= 2 ? (baths - 1) * 90 : 0);
    durationMins += (baths >= 2 ? (baths - 1) * 210 : 0);
    if (input.hasStairs) { price += 35; durationMins += 35; }

  } else {
    if (rooms === 1) {
      price = 600;
      durationMins = 600;
    } else if (rooms === 2) {
      price = 780;
      durationMins = 800;
    } else if (rooms === 3) {
      price = 960;
      durationMins = 1000;
    } else if (rooms === 4) {
      price = 1200;
      durationMins = 1200;
    } else {
      price = 1300;
      durationMins = 1350;
    }
    price += (baths >= 2 ? (baths - 1) * 100 : 0);
    durationMins += (baths >= 2 ? (baths - 1) * 240 : 0);
    if (input.hasStairs) { price += 40; durationMins += 40; }
  }

  // 2. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ
  if (input.windowsCount) { price += input.windowsCount * 35; durationMins += input.windowsCount * 30; }
  if (input.balconyWindowsCount) { price += input.balconyWindowsCount * 45; durationMins += input.balconyWindowsCount * 40; }
  if (input.mosquitoNetsCount) { price += input.mosquitoNetsCount * 15; durationMins += input.mosquitoNetsCount * 10; }
  if (input.hasBalcony) { price += 35; durationMins += 30; }
  if (input.hasGlassBalcony) { price += 55; durationMins += 45; }

  if (input.hasOven) { price += 45; durationMins += 30; }
  if (input.hasHood) { price += 40; durationMins += 30; }
  if (input.hasMicrowave) { price += 20; durationMins += 15; }
  if (input.hasFridge) { price += 35; durationMins += 30; }
  if (input.hasFridgeFreeze) { price += 50; durationMins += 45; }
  if (input.hasKitchenClosets) { price += 100; durationMins += 60; }
  if (input.closetsCount) { price += input.closetsCount * 50; durationMins += input.closetsCount * 30; }
  if (input.hasDishwasherClean) { price += 20; durationMins += 15; }
  if (input.hasWashingMachineClean) { price += 30; durationMins += 20; }

  if (input.hasBlinds) { price += 40; durationMins += 30; }
  if (input.hasVentilation) { price += 20; durationMins += 15; }
  if (input.hasMoldRemoval) { price += 40; durationMins += 30; }
  if (input.hasPetHair) { price += 40; durationMins += 30; }
  if (input.hasCatLitter) { price += 20; durationMins += 15; }
  if (input.furnitureMoveCount) { price += input.furnitureMoveCount * 15; durationMins += input.furnitureMoveCount * 10; }
  if (input.hasPipeClog) { price += 15; durationMins += 15; }
  if (input.hasLadderRental) { price += 90; }
  if (input.tileGroutAreaM2) { price += input.tileGroutAreaM2 * 15; durationMins += input.tileGroutAreaM2 * 15; }

  // Пароочиститель (учитываем и boolean флаг, и количество зон)
  if (input.hasSteamer || input.steamerZonesCount) {
    const zones = Math.max(1, input.steamerZonesCount || 1);
    price += zones * 75;
    durationMins += zones * 45;
  }

  if (input.curtainsPairsCount) { price += input.curtainsPairsCount * 65; durationMins += input.curtainsPairsCount * 45; }
  if (input.laundryHours) { price += input.laundryHours * 50; durationMins += input.laundryHours * 60; }

  const ironing = input.ironingHours || input.hasIroningHours || 0;
  if (ironing > 0) { price += ironing * 50; durationMins += ironing * 60; }

  const dishes = input.dishesHours || input.hasDishesHours || 0;
  if (dishes > 0) { price += dishes * 40; durationMins += dishes * 60; }

  if (input.organizingHours) { price += input.organizingHours * 50; durationMins += input.organizingHours * 60; }
  if (input.gardenHours) { price += input.gardenHours * 50; durationMins += input.gardenHours * 60; }

  if (input.hasVacuum) { price += 30; }

  // 3. ХИМЧИСТКА
  if (input.drySofa2) { price += input.drySofa2 * 180; durationMins += input.drySofa2 * 60; }
  if (input.drySofa3) { price += input.drySofa3 * 200; durationMins += input.drySofa3 * 75; }
  if (input.drySofaCorner4) { price += input.drySofaCorner4 * 220; durationMins += input.drySofaCorner4 * 90; }
  if (input.drySofaCorner5) { price += input.drySofaCorner5 * 240; durationMins += input.drySofaCorner5 * 105; }
  if (input.drySofaBig) { price += input.drySofaBig * 260; durationMins += input.drySofaBig * 120; }
  if (input.dryArmchair) { price += input.dryArmchair * 60; durationMins += input.dryArmchair * 30; }
  if (input.dryChair) { price += input.dryChair * 15; durationMins += input.dryChair * 15; }
  if (input.dryPouf) { price += input.dryPouf * 30; durationMins += input.dryPouf * 20; }
  if (input.dryPillowsSmall) { price += input.dryPillowsSmall * 15; durationMins += input.dryPillowsSmall * 10; }
  if (input.dryPillowsBig) { price += input.dryPillowsBig * 25; durationMins += input.dryPillowsBig * 15; }
  if (input.dryHeadboard) { price += input.dryHeadboard * 70; durationMins += input.dryHeadboard * 45; }
  if (input.dryMattressSingle) { price += input.dryMattressSingle * 90; durationMins += input.dryMattressSingle * 45; }
  if (input.dryMattressDouble) { price += input.dryMattressDouble * 140; durationMins += input.dryMattressDouble * 60; }
  if (input.dryMattressSide) { price += input.dryMattressSide * 90; durationMins += input.dryMattressSide * 45; }
  if (input.dryCarpetM2) { price += input.dryCarpetM2 * 15; durationMins += input.dryCarpetM2 * 15; }

  // 4. ДЕЛЕНИЕ НА БРИГАДУ
  const cleaners = Math.max(1, input.cleanersCount || 1);
  const actualDurationMinutes = Math.ceil((durationMins / cleaners) / 30) * 30;

  const hours = Math.floor(actualDurationMinutes / 60);
  const minutes = actualDurationMinutes % 60;
  const formattedDuration = `${hours > 0 ? hours + ' ч ' : ''}${minutes > 0 ? minutes + ' мин' : ''}`.trim() || '30 мин';

  const [startH, startM] = (input.startTime || '10:00').split(':').map(Number);
  const totalStartMinutes = (startH || 10) * 60 + (startM || 0);
  const totalEndMinutes = totalStartMinutes + actualDurationMinutes;
  
  const endH = Math.floor(totalEndMinutes / 60) % 24;
  const endM = totalEndMinutes % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  return { totalPrice: price, baseDurationMinutes: durationMins, actualDurationMinutes, formattedDuration, endTime };
}
