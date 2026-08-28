import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    
    // Границы сегодняшнего дня
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Границы текущего месяца
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todayOrders, monthOrders, completedMonthOrders, cleaners] = await Promise.all([
      // Заказы на сегодня
      prisma.order.findMany({
        where: {
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        include: {
          assignedCleaners: {
            include: { cleaner: true },
          },
        },
        orderBy: { timeSlot: 'asc' },
      }),

      // Все заказы за текущий месяц
      prisma.order.findMany({
        where: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),

      // Выполненные заказы за месяц с назначенными клинерами
      prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          assignedCleaners: true,
        },
      }),

      // Список всех клинеров
      prisma.cleaner.findMany(),
    ]);

    // Расчет финансовых KPI
    const totalRevenueMonth = completedMonthOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const completedMonthCount = completedMonthOrders.length;
    const avgCheck = completedMonthCount > 0 ? Math.round(totalRevenueMonth / completedMonthCount) : 0;

    // Подсчет выполненных уборок для каждого клинера
    const cleanerPerformance = cleaners
      .map((c) => {
        const completedCount = completedMonthOrders.filter((o) =>
          o.assignedCleaners?.some((ac: any) => ac.cleanerId === c.id)
        ).length;

        return {
          id: c.id,
          name: c.name,
          district: c.district || 'Район не указан',
          isLinked: Boolean((c as any).telegramChatId || (c as any).telegramId),
          completedCount,
        };
      })
      .sort((a, b) => b.completedCount - a.completedCount);

    return NextResponse.json({
      totalRevenueMonth,
      completedMonthCount,
      avgCheck,
      todayCount: todayOrders.length,
      monthCount: monthOrders.length,
      todayOrders,
      cleanerPerformance,
    });
  } catch (error) {
    console.error('Ошибка загрузки данных дашборда:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
