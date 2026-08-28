import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      ordersToday,
      newOrdersCount,
      inProgressCount,
      allCompletedOrders,
      cleaners,
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          assignedCleaners: {
            include: { cleaner: true },
          },
        },
        orderBy: { timeSlot: 'asc' },
      }),
      prisma.order.count({ where: { status: 'NEW' } }),
      prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.order.findMany({
        where: { status: 'COMPLETED' },
        select: { price: true },
      }),
      prisma.cleaner.findMany({
        where: { isActive: true },
        select: { id: true, name: true, district: true, rating: true },
      }),
    ]);

    const totalRevenue = allCompletedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const todayRevenue = ordersToday
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + (o.price || 0), 0);

    return NextResponse.json({
      todayOrders: ordersToday,
      counts: {
        todayTotal: ordersToday.length,
        newOrders: newOrdersCount,
        inProgress: inProgressCount,
        activeCleaners: cleaners.length,
      },
      finance: {
        totalRevenue,
        todayRevenue,
      },
      cleaners,
    });
  } catch (error) {
    console.error('Ошибка загрузки дашборда:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
