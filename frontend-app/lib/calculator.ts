export type ServiceType = 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR';

export interface AddOnRate {
  price: number;
  durationMins: number;
}

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
  startTime: string;
  addonRates?: Record<string, AddOnRate>;
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

  // 1. БАЗОВАЯ СЕТКА ПО ТИПУ УБОРКИ
  if (input.serviceType === 'STANDARD') {
    const basePrice = rooms === 1 ? (area <= 25 ? 160 : 170) : rooms === 2 ? 200 : rooms === 3 ? 240 : rooms === 4 ? 290 : 330 + (rooms - 5) * 40;
    price = basePrice + (baths >= 2 ? (baths - 1) * 50 : 0);
    durationMins = (rooms === 1 ? 180 : rooms === 2 ? 240 : rooms === 3 ? 300 : rooms === 4 ? 360 : 420 + (rooms - 5) * 40) + (baths >= 2 ? (baths - 1) * 60 : 0);
  } else if (input.serviceType === 'STANDARD_PLUS') {
    const basePrice = rooms === 1 ? 240 : rooms === 2 ? 300 : rooms === 3 ? 360 : rooms === 4 ? 420 : 480 + (rooms - 5) * 50;
    price = basePrice + (baths >= 2 ? (baths - 1) * 65 : 0);
    durationMins = (rooms === 1 ? 240 : rooms === 2 ? 360 : rooms === 3 ? 420 : rooms === 4 ? 480 : 540 + (rooms - 5) * 60) + (baths >= 2 ? (baths - 1) * 80 : 0);
  } else if (input.serviceType === 'GENERAL') {
    const basePrice = rooms === 1 ? (area <= 25 ? 510 : 535) : rooms === 2 ? 650 : rooms === 3 ? 800 : rooms === 4 ? 1020 : 1100 + (rooms - 5) * 60;
    price = basePrice + (baths >= 2 ? (baths - 1) * 90 : 0);
    durationMins = (rooms === 1 ? 540 : rooms === 2 ? 720 : rooms === 3 ? 900 : rooms === 4 ? 1080 : 1200 + (rooms - 5) * 150) + (baths >= 2 ? (baths - 1) * 210 : 0);
  } else {
    // AFTER_REPAIR (После ремонта: базово от 10 zł за м² либо по комнатам с повышенным тарифом)
    const basePrice = rooms === 1 ? 600 : rooms === 2 ? 780 : rooms === 3 ? 960 : rooms === 4 ? 1200 : 1300 + (rooms - 5) * 80;
    price = basePrice + (baths >= 2 ? (baths - 1) * 100 : 0);
    durationMins = (rooms === 1 ? 600 : rooms === 2 ? 800 : rooms === 3 ? 1000 : rooms === 4 ? 1200 : 1350 + (rooms - 5) * 160) + (baths >= 2 ? (baths - 1) * 240 : 0);
  }

  // 2. ДОПЛАТА ЗА ПРЕВЫШЕНИЕ ПЛОЩАДИ (МЕТРАЖ)
  // Базовая норма: 1к = 40м², 2к = 65м², 3к = 90м², 4к = 115м²
  const baseAllowedArea = (rooms * 25) + 15;
  const extraM2 = Math.max(0, area - baseAllowedArea);

  if (extraM2 > 0) {
    // Ставка за лишний м² в зависимости от сложности уборки
    const ratePerM2 = input.serviceType === 'AFTER_REPAIR' ? 8 : input.serviceType === 'GENERAL' ? 6 : 4;
    price += extraM2 * ratePerM2;
    // Добавляем время: каждые 10 лишних м² ~ 20-30 минут
    durationMins += Math.round(extraM2 * 2.5);
  }

  // Функция безопасного извлечения цены из БД или дефолтной
  const getRate = (code: string, defPrice: number, defDur: number) => ({
    price: input.addonRates?.[code]?.price ?? defPrice,
    durationMins: input.addonRates?.[code]?.durationMins ?? defDur,
  });

  // 3. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ
  if (input.windowsCount > 0) { price += input.windowsCount * 35; durationMins += input.windowsCount * 30; }
  if (input.hasOven) { const r = getRate('oven', 45, 30); price += r.price; durationMins += r.durationMins; }
  if (input.hasFridge) { const r = getRate('fridge', 35, 30); price += r.price; durationMins += r.durationMins; }
  if (input.hasFridgeFreeze) { const r = getRate('fridgeFreeze', 50, 45); price += r.price; durationMins += r.durationMins; }
  if (input.hasMicrowave) { const r = getRate('microwave', 20, 15); price += r.price; durationMins += r.durationMins; }
  if (input.hasBalcony) { const r = getRate('balcony', 35, 30); price += r.price; durationMins += r.durationMins; }
  if (input.hasKitchenClosets) { const r = getRate('kitchenClosets', 100, 60); price += r.price; durationMins += r.durationMins; }
  if (input.hasStairs) { const r = getRate('stairs', 30, 20); price += r.price; durationMins += r.durationMins; }
  if (input.hasSteamer) { const r = getRate('steamer', 75, 45); price += r.price; durationMins += r.durationMins; }
  if (input.hasVacuum) { const r = getRate('vacuum', 30, 0); price += r.price; durationMins += r.durationMins; }
  
  if (input.hasDishesHours) { price += input.hasDishesHours * 40; durationMins += input.hasDishesHours * 60; }
  if (input.hasIroningHours) { price += input.hasIroningHours * 50; durationMins += input.hasIroningHours * 60; }

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

  // 5. РАСПРЕДЕЛЕНИЕ НА БРИГАДУ И ОКРУГЛЕНИЕ
  const cleaners = Math.max(1, input.cleanersCount || 1);
  const rawDividedMins = durationMins / cleaners;
  const actualDurationMinutes = Math.ceil(rawDividedMins / 30) * 30;

  const hours = Math.floor(actualDurationMinutes / 60);
  const minutes = actualDurationMinutes % 60;
  const formattedDuration = `${hours > 0 ? hours + ' ч ' : ''}${minutes > 0 ? minutes + ' мин' : ''}`.trim() || '30 мин';

  // 6. ВРЕМЯ ЗАВЕРШЕНИЯ
  const [startH, startM] = (input.startTime || '10:00').split(':').map(Number);
  const totalStartMinutes = (startH || 10) * 60 + (startM || 0);
  const totalEndMinutes = totalStartMinutes + actualDurationMinutes;
  
  const endH = Math.floor(totalEndMinutes / 60) % 24;
  const endM = totalEndMinutes % 60;
  const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  return { totalPrice: price, baseDurationMinutes: durationMins, actualDurationMinutes, formattedDuration, endTime };
}
