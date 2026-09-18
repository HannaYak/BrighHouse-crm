export type ServiceType = 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR' | 'OFFICE_REGULAR' | 'OFFICE_GENERAL';
export type DiscountTarget = 'ALL' | 'BASE_ONLY' | 'DRY_CLEAN_ONLY' | 'ADDONS_ONLY';
export type SubscriptionType = 'NONE' | 'SUB_100_OFF' | 'SUB_4_MONTH' | 'SUB_2_MONTH';

export interface AddOnRate {
  price: number;
  durationMins: number;
}

export interface CalculationInput {
  serviceType: ServiceType;
  areaM2: number;
  roomsCount: number;
  bathroomsCount: number;
  windowsCount: number;
  showcaseWindowsCount?: number;
  balconyWindowsCount?: number;

  // Кухня и техника
  hasOven?: boolean;
  hasHood?: boolean;
  hasFridge?: boolean;
  hasFridgeFreeze?: boolean;
  hasMicrowave?: boolean;
  hasDishwasherClean?: boolean;
  hasWashingMachineClean?: boolean;
  hasKitchenClosets?: boolean;
  closetsCount?: number;

  // Специфические допы
  hasBalcony?: boolean;
  hasGlassBalcony?: boolean;
  hasStairs?: boolean;
  hasSteamer?: boolean;
  steamerZonesCount?: number;
  hasBlinds?: boolean;
  hasVentilation?: boolean;
  hasMoldRemoval?: boolean;
  hasPetHair?: boolean;
  hasCatLitter?: boolean;
  furnitureMoveCount?: number;
  hasPipeClog?: boolean;
  hasLadderRental?: boolean;
  tileGroutAreaM2?: number;

  // Часовые допы
  curtainsPairsCount?: number;
  laundryHours?: number;
  ironingHours?: number;
  hasIroningHours?: number;
  dishesHours?: number;
  hasDishesHours?: number;
  organizingHours?: number;
  gardenHours?: number;

  // Общие опции
  hasVacuum?: boolean;
  hasPets?: boolean;
  hasKeys?: boolean;

  // Химчистка
  drySofa2?: number;
  drySofa3?: number;
  drySofaCorner4?: number;
  drySofaCorner5?: number;
  drySofaBig?: number;
  drySofaU?: number;
  dryArmchair?: number;
  dryChair?: number;
  dryPouf?: number;
  dryPillowsSmall?: number;
  dryPillowsBig?: number;
  dryHeadboard?: number;
  dryMattressSingle?: number;
  dryMattressDouble?: number;
  dryMattressSide?: number;
  dryCarpetM2?: number;

  // Технические поля
  cleanersCount: number;
  startTime: string;
  addonRates: Record<string, { price: number; durationMins: number }>;
  discountPercent?: number;
  discountFixed?: number;
  discountTarget?: DiscountTarget;
  subscriptionType?: SubscriptionType;
  isComboGeneralDryClean?: boolean;
}

export interface CalculationResult {
  totalPrice: number;
  basePrice: number;
  addonsPrice: number;
  dryCleanPrice: number;
  discountAmount: number;
  baseDurationMinutes: number;
  actualDurationMinutes: number;
  formattedDuration: string;
  endTime: string;
  specialistRevenue: number; // Окна + химчистка для мастеров
}

export function calculateBrightHouseOrder(input: CalculationInput): CalculationResult {
  let price = 0;
  let durationMins = 0;
  let specialistTotal = 0;
  let addonsTotal = 0;
  let dryCleanTotal = 0;

  const rawRooms = Math.max(1, Number(input.roomsCount) || 1);
  const baths = Math.max(1, Number(input.bathroomsCount) || 1);
  const area = Math.max(1, Number(input.areaM2) || 45);

  // Хелпер: берет цену из настроек БД, если задана, иначе дефолтную
  const getRate = (code: string, defPrice: number, defDur: number) => ({
    price: input.addonRates?.[code]?.price ?? defPrice,
    durationMins: input.addonRates?.[code]?.durationMins ?? defDur,
  });

  // ==========================================
  // 1. КОММЕРЧЕСКИЕ ПОМЕЩЕНИЯ (ОФИСЫ)
  // ==========================================
  if (input.serviceType === 'OFFICE_REGULAR') {
    price = Math.max(150, area * 4);
    durationMins = Math.max(120, Math.round((area / 40) * 60));
  } else if (input.serviceType === 'OFFICE_GENERAL') {
    price = Math.max(350, area * 12);
    durationMins = Math.max(180, Math.round((area / 18) * 60));
  }
  // ==========================================
  // 2. ЖИЛЫЕ ПОМЕЩЕНИЯ (КВАРТИРЫ И ДОМА)
  // ==========================================
  else {
    let areaTier = 1;
    if (area > 125) {
      areaTier = 5 + Math.ceil((area - 125) / 25);
    } else if (area > 100) {
      areaTier = 5;
    } else if (area > 80) {
      areaTier = 4;
    } else if (area > 50) {
      areaTier = 3;
    } else if (area > 34) {
      areaTier = 2;
    } else {
      areaTier = 1;
    }

    const effectiveTier = Math.max(rawRooms, areaTier);

    if (input.serviceType === 'STANDARD') {
      if (effectiveTier === 1) {
        price = area <= 25 ? 160 : 170;
        durationMins = 180;
      } else if (effectiveTier === 2) {
        price = 200;
        durationMins = 240;
      } else if (effectiveTier === 3) {
        price = 240;
        durationMins = 300;
      } else if (effectiveTier === 4) {
        price = 290;
        durationMins = 360;
      } else if (effectiveTier === 5) {
        price = 330;
        durationMins = 420;
      } else {
        price = 330 + (effectiveTier - 5) * 40;
        durationMins = 420 + (effectiveTier - 5) * 40;
      }

      price += (baths >= 2 ? (baths - 1) * 50 : 0);
      durationMins += (baths >= 2 ? (baths - 1) * 60 : 0);
      if (input.hasStairs) {
        const r = getRate('stairs', 25, 20);
        price += r.price;
        durationMins += r.durationMins;
      }

    } else if (input.serviceType === 'STANDARD_PLUS') {
      if (effectiveTier === 1) {
        price = 240;
        durationMins = 240;
      } else if (effectiveTier === 2) {
        price = 300;
        durationMins = 360;
      } else if (effectiveTier === 3) {
        price = 360;
        durationMins = 420;
      } else if (effectiveTier === 4) {
        price = 420;
        durationMins = 480;
      } else if (effectiveTier === 5) {
        price = 480;
        durationMins = 540;
      } else {
        price = 480 + (effectiveTier - 5) * 50;
        durationMins = 540 + (effectiveTier - 5) * 60;
      }

      price += (baths >= 2 ? (baths - 1) * 65 : 0);
      durationMins += (baths >= 2 ? (baths - 1) * 80 : 0);
      if (input.hasStairs) {
        const r = getRate('stairs', 35, 30);
        price += r.price;
        durationMins += r.durationMins;
      }

    } else if (input.serviceType === 'GENERAL') {
      if (effectiveTier === 1) {
        price = area <= 25 ? 510 : 535;
        durationMins = 540;
      } else if (effectiveTier === 2) {
        price = 650;
        durationMins = 720;
      } else if (effectiveTier === 3) {
        price = 800;
        durationMins = 900;
      } else if (effectiveTier === 4) {
        price = 1020;
        durationMins = 1080;
      } else if (effectiveTier === 5) {
        price = 1100;
        durationMins = 1200;
      } else {
        price = 1100 + (effectiveTier - 5) * 60;
        durationMins = 1200 + (effectiveTier - 5) * 150;
      }

      price += (baths >= 2 ? (baths - 1) * 90 : 0);
      durationMins += (baths >= 2 ? (baths - 1) * 210 : 0);
      if (input.hasStairs) {
        const r = getRate('stairs', 35, 35);
        price += r.price;
        durationMins += r.durationMins;
      }

    } else {
      // AFTER_REPAIR (После ремонта)
      if (effectiveTier === 1) {
        price = 600;
        durationMins = 600;
      } else if (effectiveTier === 2) {
        price = 780;
        durationMins = 800;
      } else if (effectiveTier === 3) {
        price = 960;
        durationMins = 1000;
      } else if (effectiveTier === 4) {
        price = 1200;
        durationMins = 1200;
      } else {
        price = 1300 + (effectiveTier - 5) * 80;
        durationMins = 1350 + (effectiveTier - 5) * 150;
      }

      price += (baths >= 2 ? (baths - 1) * 100 : 0);
      durationMins += (baths >= 2 ? (baths - 1) * 240 : 0);
      if (input.hasStairs) {
        const r = getRate('stairs', 40, 40);
        price += r.price;
        durationMins += r.durationMins;
      }
    }
  }

  const basePrice = price; // Фиксируем чистую базовую стоимость уборки

  // ==========================================
  // 3. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ (С ПОДДЕРЖКОЙ ДИНАМИЧЕСКИХ ЦЕН)
  // ==========================================
  if (input.windowsCount) {
    const r = getRate('window', 35, 30);
    const sum = input.windowsCount * r.price;
    price += sum;
    addonsTotal += sum;
    specialistTotal += sum;
    durationMins += input.windowsCount * r.durationMins;
  }
  if (input.balconyWindowsCount) {
    const r = getRate('balconyWindow', 45, 40);
    const sum = input.balconyWindowsCount * r.price;
    price += sum;
    addonsTotal += sum;
    specialistTotal += sum;
    durationMins += input.balconyWindowsCount * r.durationMins;
  }
  if (input.showcaseWindowsCount) {
    const r = getRate('showcaseWindow', 50, 40);
    const sum = input.showcaseWindowsCount * r.price;
    price += sum;
    addonsTotal += sum;
    specialistTotal += sum;
    durationMins += input.showcaseWindowsCount * r.durationMins;
  }
  if (input.mosquitoNetsCount) {
    const r = getRate('mosquitoNet', 15, 10);
    const sum = input.mosquitoNetsCount * r.price;
    price += sum;
    addonsTotal += sum;
    durationMins += input.mosquitoNetsCount * r.durationMins;
  }
  if (input.hasBalcony) {
    const r = getRate('balcony', 35, 30);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasGlassBalcony) {
    const r = getRate('glassBalcony', 55, 45);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }

  if (input.hasOven) {
    const r = getRate('oven', 45, 30);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasHood) {
    const r = getRate('hood', 40, 30);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasMicrowave) {
    const r = getRate('microwave', 20, 15);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasFridge) {
    const r = getRate('fridge', 35, 30);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasFridgeFreeze) {
    const r = getRate('fridgeFreeze', 50, 45);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasKitchenClosets) {
    const r = getRate('kitchenClosets', 100, 60);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.closetsCount) {
    const r = getRate('closet', 50, 30);
    const sum = input.closetsCount * r.price;
    price += sum;
    addonsTotal += sum;
    durationMins += input.closetsCount * r.durationMins;
  }
  if (input.hasDishwasherClean) {
    const r = getRate('dishwasher', 20, 15);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasWashingMachineClean) {
    const r = getRate('washingMachine', 30, 20);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }

  if (input.hasBlinds) {
    const r = getRate('blinds', 40, 30);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasVentilation) {
    const r = getRate('ventilation', 20, 15);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasMoldRemoval) {
    const r = getRate('mold', 40, 30);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasPetHair) {
    const r = getRate('petHair', 40, 30);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasCatLitter) {
    const r = getRate('catLitter', 20, 15);
    price += r.price;
    addonsTotal += r.price;
    durationMins += r.durationMins;
  }
  if (input.furnitureMoveCount) {
    const sum = input.furnitureMoveCount * 15;
    price += sum;
    addonsTotal += sum;
    durationMins += input.furnitureMoveCount * 10;
  }
  if (input.hasPipeClog) {
    price += 15;
    addonsTotal += 15;
    durationMins += 15;
  }
  if (input.hasLadderRental) {
    price += 90;
    addonsTotal += 90;
  }
  if (input.tileGroutAreaM2) {
    const sum = input.tileGroutAreaM2 * 15;
    price += sum;
    addonsTotal += sum;
    durationMins += input.tileGroutAreaM2 * 15;
  }

  // Пароочиститель
  if (input.hasSteamer || input.steamerZonesCount) {
    const r = getRate('steamer', 75, 45);
    const zones = Math.max(1, input.steamerZonesCount || 1);
    const sum = zones * r.price;
    price += sum;
    addonsTotal += sum;
    durationMins += zones * r.durationMins;
  }

  // Текстиль и почасовые
  if (input.curtainsPairsCount) {
    const sum = input.curtainsPairsCount * 65;
    price += sum;
    addonsTotal += sum;
    durationMins += input.curtainsPairsCount * 45;
  }
  if (input.laundryHours) {
    const sum = input.laundryHours * 50;
    price += sum;
    addonsTotal += sum;
    durationMins += input.laundryHours * 60;
  }

  const ironing = input.ironingHours || input.hasIroningHours || 0;
  if (ironing > 0) {
    const r = getRate('ironing', 50, 60);
    const sum = ironing * r.price;
    price += sum;
    addonsTotal += sum;
    durationMins += ironing * r.durationMins;
  }

  const dishes = input.dishesHours || input.hasDishesHours || 0;
  if (dishes > 0) {
    const r = getRate('dishes', 40, 60);
    const sum = dishes * r.price;
    price += sum;
    addonsTotal += sum;
    durationMins += dishes * r.durationMins;
  }

  if (input.organizingHours) {
    const sum = input.organizingHours * 50;
    price += sum;
    addonsTotal += sum;
    durationMins += input.organizingHours * 60;
  }
  if (input.gardenHours) {
    const sum = input.gardenHours * 50;
    price += sum;
    addonsTotal += sum;
    durationMins += input.gardenHours * 60;
  }

  if (input.hasVacuum) {
    const r = getRate('vacuum', 30, 0);
    price += r.price;
    addonsTotal += r.price;
  }

  // ==========================================
  // 4. ХИМЧИСТКА (ПОЛНЫЙ РАЗВЕРНУТЫЙ СПИСОК)
  // ==========================================
  if (input.drySofa2) {
    const sum = input.drySofa2 * 180;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.drySofa2 * 60;
  }
  if (input.drySofa3) {
    const sum = input.drySofa3 * 200;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.drySofa3 * 75;
  }
  if (input.drySofaCorner4) {
    const sum = input.drySofaCorner4 * 220;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.drySofaCorner4 * 90;
  }
  if (input.drySofaCorner5) {
    const sum = input.drySofaCorner5 * 240;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.drySofaCorner5 * 105;
  }
  if (input.drySofaBig) {
    const sum = input.drySofaBig * 260;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.drySofaBig * 120;
  }
  if (input.dryArmchair) {
    const sum = input.dryArmchair * 60;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryArmchair * 30;
  }
  if (input.dryChair) {
    const sum = input.dryChair * 15;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryChair * 15;
  }
  if (input.dryPouf) {
    const sum = input.dryPouf * 30;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryPouf * 20;
  }
  if (input.dryPillowsSmall) {
    const sum = input.dryPillowsSmall * 15;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryPillowsSmall * 10;
  }
  if (input.dryPillowsBig) {
    const sum = input.dryPillowsBig * 25;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryPillowsBig * 15;
  }
  if (input.dryHeadboard) {
    const sum = input.dryHeadboard * 70;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryHeadboard * 45;
  }
  if (input.dryMattressSingle) {
    const sum = input.dryMattressSingle * 90;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryMattressSingle * 45;
  }
  if (input.dryMattressDouble) {
    const sum = input.dryMattressDouble * 140;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryMattressDouble * 60;
  }
  if (input.dryMattressSide) {
    const sum = input.dryMattressSide * 90;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryMattressSide * 45;
  }
  if (input.dryCarpetM2) {
    const sum = input.dryCarpetM2 * 15;
    price += sum;
    dryCleanTotal += sum;
    specialistTotal += sum;
    durationMins += input.dryCarpetM2 * 15;
  }

  // ==========================================
  // 5. ДЕЛЕНИЕ НА БРИГАДУ И ТАЙМИНГ
  // ==========================================
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

  // ==========================================
  // 6. РАСЧЁТ СКИДОК, АКЦИЙ И АБОНЕМЕНТОВ
  // ==========================================
  let discountAmount = 0;

  const hasGeneralCleaning = input.serviceType === 'GENERAL' || input.serviceType === 'AFTER_REPAIR';
  const hasDryCleaning = dryCleanTotal > 0;

  // 1. Авто-комбо: Генералка/После ремонта + Химчистка = 10% на всю сумму
  if (input.isComboGeneralDryClean || (hasGeneralCleaning && hasDryCleaning)) {
    discountAmount += price * 0.10;
  } else {
    // 2. Абонементы
    if (input.subscriptionType === 'SUB_100_OFF') {
      discountAmount += 100;
    } else if (input.subscriptionType === 'SUB_4_MONTH') {
      discountAmount += basePrice * 0.15;
    } else if (input.subscriptionType === 'SUB_2_MONTH') {
      discountAmount += basePrice * 0.10;
    }

    // 3. Ручные скидки с таргетом (на что распространяется)
    const target = input.discountTarget || 'ALL';
    let targetSum = price;
    if (target === 'BASE_ONLY') targetSum = basePrice;
    if (target === 'DRY_CLEAN_ONLY') targetSum = dryCleanTotal;
    if (target === 'ADDONS_ONLY') targetSum = addonsTotal;

    if (input.discountPercent && input.discountPercent > 0) {
      discountAmount += targetSum * (input.discountPercent / 100);
    }
    if (input.discountFixed && input.discountFixed > 0) {
      discountAmount += Math.min(targetSum, input.discountFixed);
    }
  }

  discountAmount = Math.round(discountAmount);
  const finalPrice = Math.max(0, price - discountAmount);

  return {
    totalPrice: finalPrice,
    basePrice,
    addonsPrice: addonsTotal,
    dryCleanPrice: dryCleanTotal,
    discountAmount,
    specialistRevenue: specialistTotal,
    baseDurationMinutes: durationMins,
    actualDurationMinutes,
    formattedDuration,
    endTime,
  };
}
