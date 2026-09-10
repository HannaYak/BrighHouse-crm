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

    // 2. Загружаем все активные заказы
    const allOrders = await prisma.order.findMany({
      where: { status: { not: 'CANCELLED' as any } },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    // Фильтруем по выбранному месяцу (YYYY-MM), если передан
    const filteredOrders = month
      ? allOrders.filter((o) => {
          const d = new Date(o.date).toISOString().slice(0, 7);
          return d === month;
        })
      : allOrders;

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const completedOrders = filteredOrders.filter((o) => o.status === ('COMPLETED' as any));
    const completedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    // Вспомогательная функция расчета часов из строки таймслота ("10:00 — 14:30")
    const getOrderHours = (order: any): number => {
      const slot = order.timeSlot || '';
      if (slot.includes('—')) {
        const [start, end] = slot.split('—').map((s: string) => s.trim());
        const [sh, sm] = (start || '10:00').split(':').map(Number);
        const [eh, em] = (end || '13:30').split(':').map(Number);
        const diffMins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
        if (diffMins > 0) {
          return diffMins / 60;
        }
      }
      return 3.5; // Базовое резервное значение при отсутствии слота
    };

    // Вспомогательная функция определения почасовой ставки
    const getHourlyRate = (serviceType: string): number => {
      const isHeavy = ['GENERAL', 'AFTER_REPAIR', 'OFFICE_GENERAL'].includes(serviceType);
      return isHeavy ? 35 : 30;
    };

    // 3. Считаем начисления каждому клинеру по фактически завершенным уборкам
    const cleanerStats = cleaners.map((cleaner) => {
      const completedForCleaner = completedOrders.filter((order) =>
        order.assignedCleaners.some(
          (ac) => ac.cleanerId === cleaner.id || (ac.cleaner && ac.cleaner.id === cleaner.id)
        )
      );

      let totalHours = 0;
      let totalEarned = 0;

      completedForCleaner.forEach((order) => {
        const hours = getOrderHours(order);
        const rate = getHourlyRate(order.serviceType);
        
        totalHours += hours;
        totalEarned += hours * rate;
      });

      return {
        id: cleaner.id,
        name: cleaner.name,
        phone: cleaner.phone,
        telegramHandle: cleaner.telegramHandle,
        completedCount: completedForCleaner.length,
        totalHours: Math.round(totalHours * 10) / 10,
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
      cleanerStats: cleanerStats.sort((a, b) => b.totalPayout - a.totalPayout),
    });
  } catch (error) {
    console.error('Ошибка загрузки финансов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
