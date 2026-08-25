import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const currentMonthStr = now.toISOString().slice(0, 7);

    // Загружаем все заказы
    const allOrders = await prisma.order.findMany({
      include: {
        assignedCleaners: {
          include: { cleaner: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Загружаем всех клинеров
    const allCleaners = await prisma.cleaner.findMany({
      where: { status: 'ACTIVE' }
    });

    const nonCancelled = allOrders.filter(o => o.status !== ('CANCELLED' as any));
    
    // Заказы на сегодня
    const todayOrders = nonCancelled.filter(o => o.date.toISOString().startsWith(todayStr));
    
    // Заказы за текущий месяц
    const monthOrders = nonCancelled.filter(o => o.date.toISOString().startsWith(currentMonthStr));
    const completedMonthOrders = monthOrders.filter(o => o.status === ('COMPLETED' as any));

    const totalRevenueMonth = completedMonthOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const avgCheck = completedMonthOrders.length > 0 
      ? Math.round(totalRevenueMonth / completedMonthOrders.length) 
      : 0;

    // Статистика по типам услуг
    const serviceDistribution: { [key: string]: number } = {};
    monthOrders.forEach(o => {
      const type = o.serviceType || 'Стандарт';
      serviceDistribution[type] = (serviceDistribution[type] || 0) + 1;
    });

    // Топ клинеров по выполненным заказам
    const cleanerPerformance = allCleaners.map(cleaner => {
      const completedCount = allOrders.filter(o =>
        o.status === ('COMPLETED' as any) &&
        o.assignedCleaners.some(ac => ac.cleanerId === cleaner.id || (ac.cleaner && ac.cleaner.id === cleaner.id))
      ).length;

      return {
        id: cleaner.id,
        name: cleaner.name,
        district: cleaner.district,
        completedCount,
        isLinked: Boolean(cleaner.telegramChatId)
      };
    }).sort((a, b) => b.completedCount - a.completedCount);

    return NextResponse.json({
      todayCount: todayOrders.length,
      monthCount: monthOrders.length,
      completedMonthCount: completedMonthOrders.length,
      totalRevenueMonth,
      avgCheck,
      serviceDistribution,
      cleanerPerformance,
      todayOrders
    });
  } catch (error) {
    console.error('Ошибка аналитики дашборда:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
