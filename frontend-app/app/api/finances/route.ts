import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    // 1. Загружаем список всех клинеров
    const cleaners = await prisma.cleaner.findMany({
      orderBy: { name: 'asc' },
    });

    // 2. Загружаем все заказы с привязанными клинерами
    const allOrders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' as any } },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    // Фильтруем по выбранному месяцу, если он указан
    const filteredOrders = month
      ? allOrders.filter(o => o.date.toISOString().startsWith(month))
      : allOrders;

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const completedOrders = filteredOrders.filter(o => o.status === ('COMPLETED' as any));
    const completedRevenue = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);

    // 3. Считаем начисления каждому клинеру по выполненным заказам
    const cleanerStats = cleaners.map(cleaner => {
      // Находим все завершенные заказы, где участвовал данный клинер
      const completedForCleaner = completedOrders.filter(order =>
        order.assignedCleaners.some(ac => ac.cleanerId === cleaner.id || (ac.cleaner && ac.cleaner.id === cleaner.id))
      );

      const totalEarned = completedForCleaner.reduce((sum, order) => {
        const orderPrice = order.price || 0;
        // Базовая ставка: если указана дробью (0.4 = 40%) или дефолтные 40%
        const rate = cleaner.hourlyRate && cleaner.hourlyRate <= 1 ? cleaner.hourlyRate : 0.4;
        return sum + (orderPrice * rate);
      }, 0);

      return {
        id: cleaner.id,
        name: cleaner.name,
        phone: cleaner.phone,
        telegramHandle: cleaner.telegramHandle,
        completedCount: completedForCleaner.length,
        totalPayout: Math.round(totalEarned),
      };
    });

    const totalPayouts = cleanerStats.reduce((sum, c) => sum + c.totalPayout, 0);
    const netProfit = completedRevenue - totalPayouts;

    return NextResponse.json({
      totalRevenue,
      completedRevenue,
      totalPayouts,
      netProfit,
      ordersCount: filteredOrders.length,
      completedCount: completedOrders.length,
      cleanerStats,
    });
  } catch (error) {
    console.error('Ошибка загрузки финансов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
