export type ServiceType =
  | 'STANDARD'
  | 'STANDARD_PLUS'
  | 'GENERAL'
  | 'AFTER_REPAIR'
  | 'OFFICE_REGULAR'  // Офис обычная (4 zł/м²)
  | 'OFFICE_GENERAL'; // Офис генеральная (12 zł/м²)

export interface AddOnRate {
  price: number;
  durationMins: number;
}

export interface CalculationInput {
  serviceType: ServiceType;
  roomsCount: number;
  bathroomsCount: number;
  areaM2: number;

  // Окна и балконы
 windowsCount?: number;          // 35 zł (обычные)
  balconyWindowsCount?: number;   // 45 zł (балконные)
  showcaseWindowsCount?: number;  // 50 zł (витрины в коммерции)
  mosquitoNetsCount?: number;     // 15 zł    // 15 zł
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

  // Дополнительно по дому/офису
  hasStairs?: boolean;            // 25 / 35 / 35 / 40 zł
  hasSteamer?: boolean;           // 75 zł
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
  hasPets?: boolean;
  hasKeys?: boolean;

  // Химчистка
  drySofa2?: number;              // 180 zł
  drySofa3?: number;              // 200 zł
  drySofaCorner4?: number;        // 220 zł
  drySofaCorner5?: number;        // 240 zł
  drySofaBig?: number;            // 260 zł
  dryArmchair?: number;           // 60 zł
  dryChair?: number;              // 15 zł
  dryPouf?: number;               // 30 zł
  dryPillowsSmall?: number;       // 15 zł
  dryPillowsBig?: number;         // 25 zł
  dryHeadboard?: number;          // 70 zł
  dryMattressSingle?: number;     // 90 zł
  dryMattressDouble?: number;     // 140 zł
  dryMattressSide?: number;       // 90 zł (обратная совместимость)
  dryCarpetM2?: number;           // 15 zł/м²

  cleanersCount: number;
  startTime: string;
  addonRates?: Record<string, AddOnRate>; // Динамические цены из базы
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
    // Определение категории по метражу (до 34м² -> 1к, до 50м² -> 2к, до 80м² -> 3к, до 100м² -> 4к, до 125м² -> 5к)
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

    // Берем категорию по максимуму: комнат или фактического метража
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

  // ==========================================
  // 3. ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ (С ПОДДЕРЖКОЙ ДИНАМИЧЕСКИХ ЦЕН)
  // ==========================================
  if (input.windowsCount) {
    const r = getRate('window', 35, 30);
    price += input.windowsCount * r.price;
    durationMins += input.windowsCount * r.durationMins;
  }
  if (input.balconyWindowsCount) {
    const r = getRate('balconyWindow', 45, 40);
    price += input.balconyWindowsCount * r.price;
    durationMins += input.balconyWindowsCount * r.durationMins;
  }
  if (input.showcaseWindowsCount) {
    const r = getRate('showcaseWindow', 50, 40);
    price += input.showcaseWindowsCount * r.price;
    durationMins += input.showcaseWindowsCount * r.durationMins;
  }
  if (input.mosquitoNetsCount) {
    const r = getRate('mosquitoNet', 15, 10);
    price += input.mosquitoNetsCount * r.price;
    durationMins += input.mosquitoNetsCount * r.durationMins;
  }
  if (input.hasBalcony) {
    const r = getRate('balcony', 35, 30);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasGlassBalcony) {
    const r = getRate('glassBalcony', 55, 45);
    price += r.price;
    durationMins += r.durationMins;
  }

  if (input.hasOven) {
    const r = getRate('oven', 45, 30);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasHood) {
    const r = getRate('hood', 40, 30);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasMicrowave) {
    const r = getRate('microwave', 20, 15);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasFridge) {
    const r = getRate('fridge', 35, 30);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasFridgeFreeze) {
    const r = getRate('fridgeFreeze', 50, 45);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasKitchenClosets) {
    const r = getRate('kitchenClosets', 100, 60);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.closetsCount) {
    const r = getRate('closet', 50, 30);
    price += input.closetsCount * r.price;
    durationMins += input.closetsCount * r.durationMins;
  }
  if (input.hasDishwasherClean) {
    const r = getRate('dishwasher', 20, 15);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasWashingMachineClean) {
    const r = getRate('washingMachine', 30, 20);
    price += r.price;
    durationMins += r.durationMins;
  }

  if (input.hasBlinds) {
    const r = getRate('blinds', 40, 30);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasVentilation) {
    const r = getRate('ventilation', 20, 15);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasMoldRemoval) {
    const r = getRate('mold', 40, 30);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasPetHair) {
    const r = getRate('petHair', 40, 30);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.hasCatLitter) {
    const r = getRate('catLitter', 20, 15);
    price += r.price;
    durationMins += r.durationMins;
  }
  if (input.furnitureMoveCount) {
    price += input.furnitureMoveCount * 15;
    durationMins += input.furnitureMoveCount * 10;
  }
  if (input.hasPipeClog) {
    price += 15;
    durationMins += 15;
  }
  if (input.hasLadderRental) {
    price += 90;
  }
  if (input.tileGroutAreaM2) {
    price += input.tileGroutAreaM2 * 15;
    durationMins += input.tileGroutAreaM2 * 15;
  }

  // Пароочиститель
  if (input.hasSteamer || input.steamerZonesCount) {
    const r = getRate('steamer', 75, 45);
    const zones = Math.max(1, input.steamerZonesCount || 1);
    price += zones * r.price;
    durationMins += zones * r.durationMins;
  }

  // Текстиль и почасовые
  if (input.curtainsPairsCount) {
    price += input.curtainsPairsCount * 65;
    durationMins += input.curtainsPairsCount * 45;
  }
  if (input.laundryHours) {
    price += input.laundryHours * 50;
    durationMins += input.laundryHours * 60;
  }

  const ironing = input.ironingHours || input.hasIroningHours || 0;
  if (ironing > 0) {
    const r = getRate('ironing', 50, 60);
    price += ironing * r.price;
    durationMins += ironing * r.durationMins;
  }

  const dishes = input.dishesHours || input.hasDishesHours || 0;
  if (dishes > 0) {
    const r = getRate('dishes', 40, 60);
    price += dishes * r.price;
    durationMins += dishes * r.durationMins;
  }

  if (input.organizingHours) {
    price += input.organizingHours * 50;
    durationMins += input.organizingHours * 60;
  }
  if (input.gardenHours) {
    price += input.gardenHours * 50;
    durationMins += input.gardenHours * 60;
  }

  if (input.hasVacuum) {
    const r = getRate('vacuum', 30, 0);
    price += r.price;
  }

  // ==========================================
  // 4. ХИМЧИСТКА
  // ==========================================
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

  return { totalPrice: price, baseDurationMinutes: durationMins, actualDurationMinutes, formattedDuration, endTime };
}
