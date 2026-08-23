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

  // 1. БАЗОВАЯ СЕТКА ПО ТИПУ УБОРКИ (Обновленная логика санузлов)
  if (input.serviceType === 'STANDARD') {
    const basePrice = rooms === 1 ? (area <= 25 ? 160 : 170) :
                      rooms === 2 ? 200 :
                      rooms === 3 ? 240 :
                      rooms === 4 ? 290 : 330 + (rooms - 5) * 40;
    
    price = basePrice + (baths >= 2 ? 50 : 0); // +50 за 2-й санузел
    durationMins = (rooms === 1 ? 180 : rooms === 2 ? 240 : rooms === 3 ? 300 : rooms === 4 ? 360 : 420 + (rooms - 5) * 40) + (baths >= 2 ? 60 : 0);
  } else if (input.serviceType === 'STANDARD_PLUS') {
    const basePrice = rooms === 1 ? 240 : rooms === 2 ? 300 : rooms === 3 ? 360 : rooms === 4 ? 420 : 480 + (rooms - 5) * 50;
    
    price = basePrice + (baths >= 2 ? 65 : 0); // +65 за 2-й санузел
    durationMins = (rooms === 1 ? 240 : rooms === 2 ? 360 : rooms === 3 ? 420 : rooms === 4 ? 480 : 540 + (rooms - 5) * 60) + (baths >= 2 ? 80 : 0);
  } else {
    // GENERAL & AFTER_REPAIR
    const basePrice = rooms === 1 ? (area <= 25 ? 510 : 535) : rooms === 2 ? 650 : rooms === 3 ? 800 : rooms === 4 ? 1020 : 1100 + (rooms - 5) * 60;
    
    price = basePrice + (baths >= 2 ? 90 : 0); // +90 за 2-й санузел
    durationMins = (rooms === 1 ? 540 : rooms === 2 ? 720 : rooms === 3 ? 900 : rooms === 4 ? 1080 : 1200 + (rooms - 5) * 150) + (baths >= 2 ? 210 : 0);
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
