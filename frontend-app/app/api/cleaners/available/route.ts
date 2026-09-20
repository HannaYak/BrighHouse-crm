import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startTimeParam = searchParams.get('startTime') || searchParams.get('time') || '10:00';
    const endTimeParam = searchParams.get('endTime') || '14:00';
    const excludeOrderId = searchParams.get('excludeOrderId');

    if (!dateParam) {
      return NextResponse.json({ error: 'Не указана дата' }, { status: 400 });
    }

    const targetDateObj = new Date(dateParam);
    const currentDayOfWeek = targetDateObj.getDay() === 0 ? 7 : targetDateObj.getDay();

    const targetDate = new Date(dateParam);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // 1. Получаем все заказы на эту дату
    const orders = await prisma.order.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDay,
        },
        status: { not: 'CANCELLED' },
        ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
      },
      include: {
        assignedCleaners: true,
      },
    });

    // 2. Получаем клинеров
    const cleaners = await prisma.cleaner.findMany({
      where: { status: 'active' },
    });

    // 3. Получаем ручные смены/выходные на эту дату
    const shifts = await prisma.cleanerShift.findMany({
      where: { date: targetDate },
    });
    const shiftsMap: Record<number, any> = {};
    shifts.forEach((s) => {
      shiftsMap[s.cleanerId] = s;
    });

    // Парсим желаемое время НОВОГО заказа (которое сейчас в модалке)
    const [targetH, targetM] = startTimeParam.split(':').map(Number);
    const [targetEndH, targetEndM] = endTimeParam.split(':').map(Number);

    const targetStartMins = (isNaN(targetH) ? 10 : targetH) * 60 + (isNaN(targetM) ? 0 : targetM);
    const targetEndMins = (isNaN(targetEndH) ? 14 : targetEndH) * 60 + (isNaN(targetEndM) ? 0 : targetEndM);

    // БУФЕР НА ДОРОГУ МЕЖДУ ЗАКАЗАМИ (60 минут)[cite: 1]
    const BUFFER_MINUTES = 60;

    const result = cleaners.map((cleaner) => {
      // Базовые рабочие дни (если не заданы, считаем 1-5 пн-пт)
      const workDays = cleaner.workDays && cleaner.workDays.length > 0 ? cleaner.workDays : [1, 2, 3, 4, 5];
      let isWorkingToday = workDays.includes(currentDayOfWeek);

      const shift = shiftsMap[cleaner.id];
      if (shift) {
        if (shift.isWorking === false) isWorkingToday = false;
        else isWorkingToday = true;
      }

      const shiftStartStr = shift?.startTime || cleaner.defaultStartTime || '08:00';
      const shiftEndStr = shift?.endTime || cleaner.defaultEndTime || '16:00';

      const [clStartH, clStartM] = shiftStartStr.split(':').map(Number);
      const [clEndH, clEndM] = shiftEndStr.split(':').map(Number);
      const cleanerShiftStartMins = (isNaN(clStartH) ? 8 : clStartH) * 60 + (isNaN(clStartM) ? 0 : clStartM);
      const cleanerShiftEndMins = (isNaN(clEndH) ? 16 : clEndH) * 60 + (isNaN(clEndM) ? 0 : clEndM);

      // Проверка: попадает ли заказ в рамки смены
      const fitsShiftHours = targetStartMins >= cleanerShiftStartMins && targetEndMins <= cleanerShiftEndMins;

      // Получаем все заказы этого клинера на эту дату
      const cleanerOrders = orders.filter((o) =>
        o.assignedCleaners.some((ac) => ac.cleanerId === cleaner.id)
      );

      let isBusy = false;
      const busyOrders: string[] = [];

      // Проверяем накладки по времени
      if (isWorkingToday) {
        for (const ord of cleanerOrders) {
          const slot = ord.timeSlot || '10:00 — 14:00';
          const parts = slot.split(/[-—]/).map((s) => s.trim());
          const [sh, sm] = (parts[0] || '10:00').split(':').map(Number);
          const [eh, em] = (parts[1] || '14:00').split(':').map(Number);

          const ordStartPure = (isNaN(sh) ? 10 : sh) * 60 + (isNaN(sm) ? 0 : sm);
          const ordEndPure = (isNaN(eh) ? 14 : eh) * 60 + (isNaN(em) ? 0 : em);

          // С учетом буфера дороги
          const busyFrom = Math.max(0, ordStartPure - BUFFER_MINUTES);
          const busyUntil = ordEndPure + BUFFER_MINUTES;

          // Проверка пересечения отрезков [targetStartMins, targetEndMins] и [busyFrom, busyUntil]
          const hasOverlap = Math.max(targetStartMins, busyFrom) < Math.min(targetEndMins, busyUntil);

          if (hasOverlap) {
            isBusy = true;
            busyOrders.push(`${ord.orderNumber || 'Заказ'} (${parts[0] || '10:00'}-${parts[1] || '14:00'})`);
          }
        }
      }

      const isAvailable = isWorkingToday && fitsShiftHours && !isBusy;
      const workHoursStr = `${shiftStartStr} — ${shiftEndStr}`;

      return {
        id: cleaner.id,
        name: cleaner.name,
        district: cleaner.district,
        isWorking: isWorkingToday,
        fitsShiftHours,
        available: isAvailable,
        isBusy,
        busyOrders,
        workHours: workHoursStr,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Ошибка проверки доступности клинеров:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
