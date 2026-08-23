export type ServiceType = 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR';

export interface CalculationInput {
  serviceType: ServiceType;
  roomsCount: number;
  bathroomsCount: number;
  areaM2: number;
  windowsCount: number;
  hasOven?: boolean;
  hasFridge?: boolean;
  hasFridgeFreeze?: boolean;
  hasMicrowave?: boolean;
  hasBalcony?: boolean;
  hasKitchenClosets?: boolean;
  hasDishesHours?: number;
  hasIroningHours?: number;
  hasVacuum?: boolean;
  hasPets?: boolean;
  hasKeys?: boolean;
  hasStairs?: boolean;
  hasSteamer?: boolean;
  
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
  startTime: string; // Формат "10:00"
}

export interface CalculationResult {
  totalPrice: number;
  baseDurationMinutes: number; // На 1 человека
  actualDurationMinutes: number; // С учетом бригады и округления
  formattedDuration: string; // "3 ч 30 мин"
  endTime: string; // "13:30"
}

export function calculateBrightHouseOrder(input: CalculationInput): CalculationResult {
  let price = 0;
  let durationMins = 0; // в минутах на 1 клинера

  const rooms = Math.max(1, input.roomsCount);
  const baths = Math.max(1, input.bathroomsCount);
  const area = input.areaM2 || 45;

  // 1. БАЗОВАЯ СЕТКА ПО ТИПУ УБОРКИ
  if (input.serviceType === 'STANDARD') {
    if (rooms === 1) {
      price = area <= 25 ? 160 : 170;
      durationMins = 180; // 3 ч
    } else if (rooms === 2) {
      price = 200;
      durationMins = 240; // 4 ч
    } else if (rooms === 3) {
      price = baths >= 2 ? 290 : 240;
      durationMins = baths >= 2 ? 360 : 300; // 6 ч или 5 ч
    } else if (rooms === 4) {
      price = baths >= 2 ? 340 : 290;
      durationMins = baths >= 2 ? 420 : 360; // 7 ч или 6 ч
    } else {
      // 5 комнат и более
      price = 330 + (rooms - 5) * 40 + (baths >= 2 ? 50 : 0);
      durationMins = 420 + (rooms - 5) * 40 + (baths >= 2 ? 60 : 0);
    }
  } else if (input.serviceType === 'STANDARD_PLUS') {
    if (rooms === 1) {
      price = 240;
      durationMins = 240; // 4 ч
    } else if (rooms === 2) {
      price = 300;
      durationMins = 360; // 6 ч
    } else if (rooms === 3) {
      price = baths >= 2 ? 425 : 360;
      durationMins = baths >= 2 ? 500 : 420;
    } else if (rooms === 4) {
      price = baths >= 2 ? 485 : 420;
      durationMins = baths >= 2 ? 560 : 480;
    } else {
      price = 480 + (rooms - 5) * 50 + (baths >= 2 ? 65 : 0);
      durationMins = 540 + (rooms - 5) * 60 + (baths >= 2 ? 80 : 0);
    }
  } else {
    // GENERAL & AFTER_REPAIR
    if (rooms === 1) {
      price = area <= 25 ? 510 : 535;
      durationMins = 540; // 9 ч
    } else if (rooms === 2) {
      price = 650;
      durationMins = 720; // 12 ч
    } else if (rooms === 3) {
      price = baths >= 2 ? 890 : 800;
      durationMins = baths >= 2 ? 1110 : 900;
    } else if (rooms === 4) {
      price = baths >= 2 ? 1110 : 1020;
      durationMins = baths >= 2 ? 1290 : 1080;
    } else {
      price = 1100 + (rooms - 5) * 60 + (baths >= 2 ? 90 : 0);
      durationMins = 1200 + (rooms - 5) * 150 + (baths >= 2 ? 210 : 0);
    }
  }

  // 2. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ
  if (input.windowsCount > 0) {
    price += input.windowsCount * 35;
    durationMins += input.windowsCount * 30;
  }
  if (input.hasOven) { price += 45; durationMins += 30; }
  if (input.hasFridge) { price += 35; durationMins += 30; }
  if (input.hasFridgeFreeze) { price += 50; durationMins += 45; }
  if (input.hasMicrowave) { price += 20; durationMins += 15; }
  if (input.hasBalcony) { price += 35; durationMins += 30; }
  if (input.hasKitchenClosets) { price += 100; durationMins += 60; }
  if (input.hasStairs) { price += 30; durationMins += 20; }
  if (input.hasSteamer) { price += 75; durationMins += 45; }
  if (input.hasVacuum) { price += 30; }
  if (input.hasDishesHours) { price += input.hasDishesHours * 40; durationMins += input.hasDishesHours * 60; }
  if (input.hasIroningHours) { price += input.hasIroningHours * 50; durationMins += input.hasIroningHours * 60; }

  // 3. ХИМЧИСТКА
  if (input.drySofa2) { price += input.drySofa2 * 180; durationMins += input.drySofa2 * 60; }
  if (input.drySofa3) { price += input.drySofa3 * 200; durationMins += input.drySofa3 * 75; }
  if (input.drySofaCorner4) { price += input.drySofaCorner4 * 220; durationMins += input.drySofaCorner4 * 90; }
  if (input.drySofaCorner5) { price += input.drySofaCorner5 * 240; durationMins += input.drySofaCorner5 * 105; }
  if (input.drySofaBig) { price += input.drySofaBig * 260; durationMins += input.drySofaBig * 120; }
  if (input.dryArmchair) { price += input.dryArmchair * 60; durationMins += input.dryArmchair * 30; }
  if (input.dryChair) { price += input.dryChair * 15; durationMins += input.dryChair * 15; }
  if (input.dryMattressSide) { price += input.dryMattressSide * 90; durationMins += input.dryMattressSide * 45; }
  if (input.dryCarpetM2) { price += input.dryCarpetM2 * 15; durationMins += input.dryCarpetM2 * 15; }

  // 4. ДЕЛЕНИЕ НА БРИГАДУ + КОЭФФИЦИЕНТ ТОЛПЫ (Округление вверх кратно 30 мин)
  const cleaners = Math.max(1, input.cleanersCount || 1);
  const rawDividedMins = durationMins / cleaners;
  
  // Округление вверх до ближайших 30 минут
  const actualDurationMinutes = Math.ceil(rawDividedMins / 30) * 30;

  // Форматирование длительности
  const hours = Math.floor(actualDurationMinutes / 60);
  const minutes = actualDurationMinutes % 60;
  const formattedDuration = `${hours > 0 ? hours + ' ч ' : ''}${minutes > 0 ? minutes + ' мин' : ''}`.trim() || '30 мин';

  // 5. РАСЧЕТ ВРЕМЕНИ ОКОНЧАНИЯ
  const [startH, startM] = (input.startTime || '10:00').split(':').map(Number);
  const totalStartMinutes = (startH || 10) * 60 + (startM || 0);
  const totalEndMinutes = totalStartMinutes + actualDurationMinutes;
  
  const endH = Math.floor(totalEndMinutes / 60) % 24;
  const endM = totalEndMinutes % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  return {
    totalPrice: price,
    baseDurationMinutes: durationMins,
    actualDurationMinutes,
    formattedDuration,
    endTime,
  };
}
