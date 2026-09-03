import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

// Сохранить базовый шаблон графика клинера или добавить смену
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanerId = Number(id);
    const body = await request.json();

    // 1. Обновление базового шаблона (постоянный график)
    if (body.type === 'TEMPLATE') {
      const updated = await prisma.cleaner.update({
        where: { id: cleanerId },
        data: {
          workDays: body.workDays,
          defaultStartTime: body.defaultStartTime || '08:00',
          defaultEndTime: body.defaultEndTime || '20:00',
        },
      });
      return NextResponse.json(updated);
    }

    // 2. Установка точечной смены на конкретный день
    if (body.type === 'SINGLE_DAY') {
      const shiftDate = new Date(body.date);
      const shift = await prisma.cleanerShift.upsert({
        where: {
          cleanerId_date: {
            cleanerId,
            date: shiftDate,
          },
        },
        update: {
          isWorking: body.isWorking ?? true,
          startTime: body.startTime || '08:00',
          endTime: body.endTime || '20:00',
        },
        create: {
          cleanerId,
          date: shiftDate,
          isWorking: body.isWorking ?? true,
          startTime: body.startTime || '08:00',
          endTime: body.endTime || '20:00',
        },
      });
      return NextResponse.json(shift);
    }

    return NextResponse.json({ error: 'Неизвестный тип запроса' }, { status: 400 });
  } catch (error) {
    console.error('Ошибка сохранения графика:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
