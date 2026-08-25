import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Например: 2026-08

    // Загружаем всех клинеров и их выполненные заказы
    const cleaners = await prisma.cleaner.findMany({
      include: {
        assignedOrders: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Загружаем все заказы для общей финансовой сводки
    const allOrders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: {
        assignedCleaners: {
          include: { cleaner: true }
        }
      }
    });

    // Фильтруем заказы по месяцу, если передан параметр
    const filteredOrders = month
      ? allOrders.filter(o => o.date.toISOString().startsWith(month))
      : allOrders;

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const completedOrders = filteredOrders.filter(o => o.status === 'COMPLETED');
    const completedRevenue = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);

    // Считаем выплаты клинерам (по умолчанию 40% от стоимости заказа на бригаду или по индивидуальной ставке)
    const cleanerStats = cleaners.map(cleaner => {
      const completedAssignments = cleaner.assignedOrders.filter(
        ao => ao.order.status === 'COMPLETED' && (!month || ao.order.date.toISOString().startsWith(month))
      );

      const totalEarned = completedAssignments.reduce((sum, ao) => {
        const orderPrice = ao.order.price || 0;
        // Если ставка указана как процент (например, 0.4 = 40%) или дефолт 40%
        const rate = cleaner.hourlyRate && cleaner.hourlyRate <= 1 ? cleaner.hourlyRate : 0.4;
        return sum + (orderPrice * rate);
      }, 0);

      return {
        id: cleaner.id,
        name: cleaner.name,
        phone: cleaner.phone,
        telegramHandle: cleaner.telegramHandle,
        completedCount: completedAssignments.length,
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
