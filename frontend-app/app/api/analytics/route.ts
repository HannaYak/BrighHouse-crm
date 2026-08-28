import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    const totalOrders = orders.length;
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const avgCheck = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

    // Распределение по тарифам
    const serviceDistribution: Record<string, number> = {};
    orders.forEach((o) => {
      const type = o.serviceType || 'Стандарт';
      serviceDistribution[type] = (serviceDistribution[type] || 0) + 1;
    });

    // Распределение по статусам
    const statusDistribution: Record<string, number> = {
      NEW: 0,
      PROCESSING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    orders.forEach((o) => {
      if (statusDistribution[o.status] !== undefined) {
        statusDistribution[o.status] += 1;
      }
    });

    return NextResponse.json({
      summary: {
        totalOrders,
        completedOrdersCount: completedOrders.length,
        totalRevenue,
        avgCheck,
        conversionRate: totalOrders > 0 ? Math.round((completedOrders.length / totalOrders) * 100) : 0,
      },
      serviceDistribution,
      statusDistribution,
    });
  } catch (error) {
    console.error('Ошибка загрузки аналитики:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
