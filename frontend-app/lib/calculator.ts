export interface CleaningParams {
  rooms: number;
  bathrooms: number;
  areaM2?: number;
  isGeneral?: boolean;
  isAfterRepair?: boolean;
  windowsCount?: number;
  hasOven?: boolean;
  hasFridge?: boolean;
}

export function calculateOrderDuration(params: CleaningParams, cleanersCount: number = 1): {
  totalHours: number;
  durationPerCleaner: number;
} {
  // Базовые человеко-часы
  let baseHours = 1.5;
  baseHours += params.rooms * 0.75;
  baseHours += params.bathrooms * 1.0;

  if (params.areaM2 && params.areaM2 > 60) {
    baseHours += ((params.areaM2 - 60) / 20) * 0.5;
  }

  // Коэффициенты типа уборки
  if (params.isAfterRepair) {
    baseHours *= 2.0;
  } else if (params.isGeneral) {
    baseHours *= 1.5;
  }

  // Дополнительные опции
  if (params.windowsCount) baseHours += params.windowsCount * 0.4;
  if (params.hasOven) baseHours += 0.5;
  if (params.hasFridge) baseHours += 0.5;

  const count = Math.max(1, cleanersCount);
  const duration = Number((baseHours / count).toFixed(2));

  return {
    totalHours: Number(baseHours.toFixed(2)),
    durationPerCleaner: duration,
  };
}
