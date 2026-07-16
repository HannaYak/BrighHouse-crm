interface CalculateTimingParams {
  baseTimeMinutes: number;   // Базовое время услуги на 1 человека (из таблицы services)
  cleanersCount: number;     // Сколько клинеров назначено на заказ (минимум 1)
  startTimeISO: string;      // Время старта в формате ISO или строки даты
  travelBufferMinutes?: number; // Буфер на дорогу в минутах (опционально, по умолчанию 60)
}

interface TimingResult {
  durationMinutesOnSite: number; // Сколько времени клинеры проведут на объекте (округленное)
  endTimeISO: string;            // Время, когда уборка будет завершена
  nextAvailableTimeISO: string;  // Время, когда клинеры свободны для нового заказа (с учетом буфера)
}

/**
 * Автоматический расчет времени работы на объекте с учетом "коэффициента толпы"
 */
export function calculateOrderTiming({
  baseTimeMinutes,
  cleanersCount,
  startTimeISO,
  travelBufferMinutes = 60
}: CalculateTimingParams): TimingResult {
  
  const cleaners = Math.max(1, cleanersCount); // Защита от деления на 0
  
  // 1. Рассчитываем чистое время делением на количество человек
  const rawDuration = baseTimeMinutes / cleaners;
  
  // 2. Округляем вверх до 30 минут (кратность 30)
  // Например: 160 минут / 30 = 5.33 -> округляем до 6 -> 6 * 30 = 180 минут (3 часа)
  const durationMinutesOnSite = Math.ceil(rawDuration / 30) * 30;
  
  // 3. Работа со временем старта
  const start = new Date(startTimeISO);
  
  // Расчет времени окончания уборки
  const end = new Date(start.getTime() + durationMinutesOnSite * 60 * 1000);
  
  // Расчет времени, когда клинер освободится (Окончание + Дорожный буфер)
  const nextAvailable = new Date(end.getTime() + travelBufferMinutes * 60 * 1000);
  
  return {
    durationMinutesOnSite,
    endTimeISO: end.toISOString(),
    nextAvailableTimeISO: nextAvailable.toISOString()
  };
}
