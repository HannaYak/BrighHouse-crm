import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// Получить смены всех клинеров на выбранную дату
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Параметр date обязателен' }, { status: 400 });
    }

    const targetDate = new Date(dateParam);
    targetDate.setHours(0, 0, 0, 0);

    const shifts = await prisma.cleanerShift.findMany({
      where: {
        date: targetDate,
      },
    });

    return NextResponse.json(shifts);
  } catch (error) {
    console.error('Ошибка загрузки смен:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// Установить индивидуальную смену или отгул
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cleanerId, date, startTime, endTime, isWorking } = body;

    if (!cleanerId || !date) {
      return NextResponse.json({ error: 'cleanerId и date обязательны' }, { status: 400 });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const shift = await prisma.cleanerShift.upsert({
      where: {
        cleanerId_date: {
          cleanerId: Number(cleanerId),
          date: targetDate,
        },
      },
      update: {
        startTime: startTime || '08:00',
        endTime: endTime || '20:00',
        isWorking: isWorking !== undefined ? Boolean(isWorking) : true,
      },
      create: {
        cleanerId: Number(cleanerId),
        date: targetDate,
        startTime: startTime || '08:00',
        endTime: endTime || '20:00',
        isWorking: isWorking !== undefined ? Boolean(isWorking) : true,
      },
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error('Ошибка сохранения смены:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
