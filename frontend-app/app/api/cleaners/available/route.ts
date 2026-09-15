import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time') || '10:00';

    if (!dateParam) {
      return NextResponse.json({ error: 'Не указана дата' }, { status: 400 });
    }

    const targetDate = new Date(dateParam);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Получаем все заказы на эту дату, которые не отменены
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

    const cleaners = await prisma.cleaner.findMany({
      where: { status: 'active' },
    });

    const [targetH, targetM] = timeParam.split(':').map(Number);
    const targetStartMins = targetH * 60 + (targetM || 0);
    // Допустим, стандартная длительность нового заказа около 3-4 часов по умолчанию
    const targetEndMins = targetStartMins + 240; 
    const BUFFER_MINUTES = 60; // 1 час буфера на дорогу

    const result = cleaners.map((cleaner) => {
      const cleanerOrders = orders.filter((o) =>
        o.assignedCleaners.some((ac) => ac.cleanerId === cleaner.id)
      );

      let isBusy = false;
      const busyOrders: string[] = [];

      for (const ord of cleanerOrders) {
        const slot = ord.timeSlot || `${ord.startTime || '10:00'} — ${ord.endTime || '14:00'}`;
        const parts = slot.split('—').map((s) => s.trim());
        const [sh, sm] = (parts[0] || '10:00').split(':').map(Number);
        const [eh, em] = (parts[1] || '14:00').split(':').map(Number);

        const ordStartMins = sh * 60 + (sm || 0) - BUFFER_MINUTES; // с учетом буфера до
        const ordEndMins = eh * 60 + (em || 0) + BUFFER_MINUTES;   // с учетом буфера после

        // Проверяем пересечение интервалов времени
        if (
          (targetStartMins >= ordStartMins && targetStartMins < ordEndMins) ||
          (targetEndMins > ordStartMins && targetEndMins <= ordEndMins) ||
          (targetStartMins <= ordStartMins && targetEndMins >= ordEndMins)
        ) {
          isBusy = true;
          busyOrders.push(ord.orderNumber || 'Заказ');
        }
      }

      const shiftStart = cleaner.shiftStart ?? 9;
      const shiftEnd = cleaner.shiftEnd ?? 16;
      const workHoursStr = `${String(shiftStart).padStart(2, '0')}:00 — ${String(shiftEnd).padStart(2, '0')}:00`;

      return {
        id: cleaner.id,
        name: cleaner.name,
        district: cleaner.district,
        available: !isBusy,
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
