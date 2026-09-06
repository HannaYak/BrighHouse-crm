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
  hasHood?: boolean;              // 40 zł (вытяжка)
  hasMicrowave?: boolean;         // 20 zł
  hasFridge?: boolean;            // 35 zł
  hasFridgeFreeze?: boolean;      // 50 zł
  hasKitchenClosets?: boolean;    // 100 zł
  closetsCount?: number;          // 50 zł за шкаф
  hasDishwasherClean?: boolean;   // 20 zł
  hasWashingMachineClean?: boolean;// 30 zł

  // Дополнительно по дому
  hasStairs?: boolean;            // 25 / 35 / 35 zł
  hasBlinds?: boolean;            // 40 zł (жалюзи)
  hasVentilation?: boolean;       // 20 zł (вентиляция)
  hasMoldRemoval?: boolean;       // 40 zł (плесень)
  hasPetHair?: boolean;           // 40 zł (шерсть)
  hasCatLitter?: boolean;         // 20 zł (лоток)
  furnitureMoveCount?: number;    // 15 zł за шт
  hasPipeClog?: boolean;          // 15 zł (прочистка труб)
  hasLadderRental?: boolean;      // 90 zł (наша стремянка)
  tileGroutAreaM2?: number;       // 15 zł за м² (швы)
  steamerZonesCount?: number;     // 75 zł за зону

  // Почасовые и текстиль
  curtainsPairsCount?: number;    // 65 zł за пару
  laundryHours?: number;          // 50 zł/ч
  ironingHours?: number;          // 50 zł/ч
  dishesHours?: number;           // 40 zł/ч
  organizingHours?: number;       // 50 zł/ч (разбор вещей)
  gardenHours?: number;           // 50 zł/ч (огрудки)

  // Базовые флаги оборудования
  hasVacuum?: boolean;            // 30 zł
  hasKeys?: boolean;

  // Химчистка
  drySofa2?: number;
  drySofa3?: number;
  drySofaCorner4?: number;
  drySofaCorner5?: number;
  drySofaBig?: number;
  dryArmchair?: number;
  dryChair?: number;
  dryMattressSide?: number;
  dryCarpetM2?: number;

  cleanersCount: number;
  startTime: string;
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

  let maxAllowedArea = 50;

  // 1. БАЗОВАЯ СЕТКА ПО ТАРИФАМ
  if (input.serviceType === 'STANDARD') {
    if (rooms === 1) {
      price = area <= 25 ? 160 : 170;
      maxAllowedArea = 34;
      durationMins = 180;
    } else if (rooms === 2) {
      price = 200;
      maxAllowedArea = 50;
      durationMins = 240;
    } else if (rooms === 3) {
      price = 240;
      maxAllowedArea = 80;
      durationMins = 300;
    } else if (rooms === 4) {
      price = 290;
      maxAllowedArea = 100;
      durationMins = 360;
    } else {
      price = 330 + (rooms - 5) * 40;
      maxAllowedArea = 125 + (rooms - 5) * 20;
      durationMins = 420 + (rooms - 5) * 40;
    }
    price += (baths >= 2 ? (baths - 1) * 50 : 0);
    durationMins += (baths >= 2 ? (baths - 1) * 60 : 0);
    if (input.hasStairs) { price += 25; durationMins += 20; }

  } else if (input.serviceType === 'STANDARD_PLUS') {
    if (rooms === 1) {
      price = 240;
      maxAllowedArea = 34;
      durationMins = 240;
    } else if (rooms === 2) {
      price = 300;
      maxAllowedArea = 50;
      durationMins = 360;
    } else if (rooms === 3) {
      price = 360;
      maxAllowedArea = 80;
      durationMins = 420;
    } else if (rooms === 4) {
      price = 420;
      maxAllowedArea = 100;
      durationMins = 480;
    } else {
      price = 480 + (rooms - 5) * 50;
      maxAllowedArea = 125 + (rooms - 5) * 20;
      durationMins = 540 + (rooms - 5) * 60;
    }
    price += (baths >= 2 ? (baths - 1) * 65 : 0);
    durationMins += (baths >= 2 ? (baths - 1) * 80 : 0);
    if (input.hasStairs) { price += 35; durationMins += 30; }

  } else if (input.serviceType === 'GENERAL') {
    if (rooms === 1) {
      price = area <= 25 ? 510 : 535;
      maxAllowedArea = 34;
      durationMins = 540;
    } else if (rooms === 2) {
      price = 650;
      maxAllowedArea = 50;
      durationMins = 720;
    } else if (rooms === 3) {
      price = 800;
      maxAllowedArea = 80;
      durationMins = 900;
    } else if (rooms === 4) {
      price = 1020;
      maxAllowedArea = 100;
      durationMins = 1080;
    } else {
      price = 1100 + (rooms - 5) * 60;
      maxAllowedArea = 125 + (rooms - 5) * 20;
      durationMins = 1200 + (rooms - 5) * 150;
    }
    price += (baths >= 2 ? (baths - 1) * 90 : 0);
    durationMins += (baths >= 2 ? (baths - 1) * 210 : 0);
    if (input.hasStairs) { price += 35; durationMins += 35; }

  } else {
    // ПОСЛЕ РЕМОНТА
    price = rooms === 1 ? 600 : rooms === 2 ? 780 : rooms === 3 ? 960 : rooms === 4 ? 1200 : 1300;
    maxAllowedArea = rooms === 1 ? 34 : rooms === 2 ? 50 : rooms === 3 ? 80 : 100;
    durationMins = 600 + (rooms - 1) * 200;
    price += (baths >= 2 ? (baths - 1) * 100 : 0);
    if (input.hasStairs) { price += 40; durationMins += 40; }
  }

  // 2. ДОПЛАТА ЗА ПРЕВЫШЕНИЕ МЕТРАЖА СВЕРХ СЕТКИ ТАРИФА
  const extraArea = Math.max(0, area - maxAllowedArea);
  if (extraArea > 0) {
    const ratePerExtraM2 = input.serviceType === 'AFTER_REPAIR' ? 8 : input.serviceType === 'GENERAL' ? 6 : 4;
    price += extraArea * ratePerExtraM2;
    durationMins += Math.round(extraArea * 2.5);
  }

  // 3. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ ПО ОФИЦИАЛЬНОМУ ПРАЙСУ
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
  if (input.steamerZonesCount) { price += input.steamerZonesCount * 75; durationMins += input.steamerZonesCount * 45; }

  if (input.curtainsPairsCount) { price += input.curtainsPairsCount * 65; durationMins += input.curtainsPairsCount * 45; }
  if (input.laundryHours) { price += input.laundryHours * 50; durationMins += input.laundryHours * 60; }
  if (input.ironingHours) { price += input.ironingHours * 50; durationMins += input.ironingHours * 60; }
  if (input.dishesHours) { price += input.dishesHours * 40; durationMins += input.dishesHours * 60; }
  if (input.organizingHours) { price += input.organizingHours * 50; durationMins += input.organizingHours * 60; }
  if (input.gardenHours) { price += input.gardenHours * 50; durationMins += input.gardenHours * 60; }

  if (input.hasVacuum) { price += 30; }

  // 4. ХИМЧИСТКА
  if (input.drySofa2) { price += input.drySofa2 * 180; durationMins += input.drySofa2 * 60; }
  if (input.drySofa3) { price += input.drySofa3 * 200; durationMins += input.drySofa3 * 75; }
  if (input.drySofaCorner4) { price += input.drySofaCorner4 * 220; durationMins += input.drySofaCorner4 * 90; }
  if (input.drySofaCorner5) { price += input.drySofaCorner5 * 240; durationMins += input.drySofaCorner5 * 105; }
  if (input.drySofaBig) { price += input.drySofaBig * 260; durationMins += input.drySofaBig * 120; }
  if (input.dryArmchair) { price += input.dryArmchair * 60; durationMins += input.dryArmchair * 30; }
  if (input.dryChair) { price += input.dryChair * 15; durationMins += input.dryChair * 15; }
  if (input.dryMattressSide) { price += input.dryMattressSide * 90; durationMins += input.dryMattressSide * 45; }
  if (input.dryCarpetM2) { price += input.dryCarpetM2 * 15; durationMins += input.dryCarpetM2 * 15; }

  // 5. ДЕЛЕНИЕ НА БРИГАДУ И ТАЙМИНГ
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
