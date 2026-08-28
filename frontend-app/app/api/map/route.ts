import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const orders = await prisma.order.findMany({
      where: {
        date: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { timeSlot: 'asc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Ошибка загрузки точек карты:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
