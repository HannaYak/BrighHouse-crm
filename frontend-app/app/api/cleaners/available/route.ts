import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const orderTime = searchParams.get('time') || '10:00';

    if (!dateStr) {
      return NextResponse.json({ error: 'Укажите дату' }, { status: 400 });
    }

    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay(); // 1=Пн, 7=Вс

    const cleaners = await prisma.cleaner.findMany({
      where: { status: 'active' },
      include: {
        shifts: {
          where: { date: targetDate },
        },
        assignments: {
          where: {
            order: {
              date: targetDate,
              status: { notIn: ['CANCELLED'] },
            },
          },
          include: { order: true },
        },
      },
    });

    const availableCleaners = cleaners.map((c) => {
      const explicitShift = c.shifts[0];

      let isWorking = false;
      let shiftStart = c.defaultStartTime || '08:00';
      let shiftEnd = c.defaultEndTime || '20:00';

      if (explicitShift) {
        isWorking = explicitShift.isWorking;
        shiftStart = explicitShift.startTime;
        shiftEnd = explicitShift.endTime;
      } else {
        isWorking = (c.workDays || [1, 2, 3, 4, 5]).includes(dayOfWeek);
      }

      // Проверяем пересечение по времени
      const isTimeFit = orderTime >= shiftStart && orderTime <= shiftEnd;
      const busyOrders = c.assignments.map((a) => a.order.orderNumber);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        district: c.district,
        isWorking,
        isTimeFit,
        isBusy: busyOrders.length > 0,
        busyOrders,
        workHours: `${shiftStart} - ${shiftEnd}`,
        available: isWorking && isTimeFit && busyOrders.length === 0,
      };
    });

    return NextResponse.json(availableCleaners);
  } catch (error) {
    console.error('Ошибка проверки доступности:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
