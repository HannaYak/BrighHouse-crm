import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startTimeParam = searchParams.get('startTime') || '10:00';
    const endTimeParam = searchParams.get('endTime') || '14:00'; 

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
    
    // БУФЕР НА ДОРОГУ ДО И ПОСЛЕ КАЖДОГО ЗАКАЗА
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

      // Получаем все заказы этого клинера на эту дату
      const cleanerOrders = orders.filter((o) =>
        o.assignedCleaners.some((ac) => ac.cleanerId === cleaner.id)
      );

      let isBusy = false;
      const busyOrders: string[] = [];

      // Проверяем накладки по времени
      if (isWorkingToday) {
        for (const ord of cleanerOrders) {
          // ИСПРАВЛЕНИЕ: берем строку только из поля timeSlot
          const slot = ord.timeSlot || '10:00 — 14:00';
          const parts = slot.split(/[-—]/).map((s) => s.trim());
          const [sh, sm] = (parts[0] || '10:00').split(':').map(Number);
          const [eh, em] = (parts[1] || '14:00').split(':').map(Number);

          // К текущему заказу клинера плюсуем буфер: 1 час до начала и 1 час после конца
          const ordStartMins = (isNaN(sh) ? 10 : sh) * 60 + (isNaN(sm) ? 0 : sm) - BUFFER_MINUTES;
          const ordEndMins = (isNaN(eh) ? 14 : eh) * 60 + (isNaN(em) ? 0 : em) + BUFFER_MINUTES;

          if (
            (targetStartMins >= ordStartMins && targetStartMins < ordEndMins) ||
            (targetEndMins > ordStartMins && targetEndMins <= ordEndMins) ||
            (targetStartMins <= ordStartMins && targetEndMins >= ordEndMins)
          ) {
            isBusy = true;
            busyOrders.push(ord.orderNumber || 'Заказ');
          }
        }
      }

      const shiftStartStr = shift?.startTime || cleaner.defaultStartTime || '08:00';
      const shiftEndStr = shift?.endTime || cleaner.defaultEndTime || '20:00';
      const workHoursStr = `${shiftStartStr} — ${shiftEndStr}`;

      return {
        id: cleaner.id,
        name: cleaner.name,
        district: cleaner.district,
        isWorking: isWorkingToday,
        available: isWorkingToday && !isBusy,
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
