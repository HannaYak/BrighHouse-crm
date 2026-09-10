import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentMethod = searchParams.get('paymentMethod'); // Фильтр по счету/карте

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const cleaners = await prisma.cleaner.findMany({
      orderBy: { name: 'asc' },
    });

    // 1. Заказы за период
    const orders = await prisma.order.findMany({
      where: {
        status: { not: 'CANCELLED' as any },
        ...(startDate && endDate ? { date: dateFilter } : {}),
        ...(paymentMethod && paymentMethod !== 'ALL' ? { paymentMethod } : {}),
      },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
        cashCollectedBy: true,
      },
      orderBy: { date: 'desc' },
    });

    // 2. Расходы и распределение прибыли
    const expenses = await prisma.expense.findMany({
      where: {
        ...(startDate && endDate ? { date: dateFilter } : {}),
      },
      include: { cleaner: true },
      orderBy: { date: 'desc' },
    });

    const getOrderHours = (order: any): number => {
      const slot = order.timeSlot || '';
      if (slot.includes('—')) {
        const [start, end] = slot.split('—').map((s: string) => s.trim());
        const [sh, sm] = (start || '10:00').split(':').map(Number);
        const [eh, em] = (end || '13:30').split(':').map(Number);
        const diffMins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
        if (diffMins > 0) return diffMins / 60;
      }
      return 3.5;
    };

    const getHourlyRate = (serviceType: string): number => {
      const isHeavy = ['GENERAL', 'AFTER_REPAIR', 'OFFICE_GENERAL'].includes(serviceType);
      return isHeavy ? 35 : 30;
    };

    const completedOrders = orders.filter((o) => o.status === ('COMPLETED' as any));
    const completedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    // Разбивка выручки по счетам/кошелькам
    const paymentBreakdown: Record<string, number> = {};
    completedOrders.forEach((o: any) => {
      const method = o.paymentMethod || 'CASH';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (Number(o.price) || 0);
    });

    // Расчет KPI клинеров
    const cleanerStats = cleaners.map((cleaner) => {
      const completedForCleaner = completedOrders.filter((order) =>
        order.assignedCleaners.some(
          (ac) => ac.cleanerId === cleaner.id || (ac.cleaner && ac.cleaner.id === cleaner.id)
        )
      );

      let totalHours = 0;
      let totalEarned = 0;
      let generatedRevenue = 0;

      completedForCleaner.forEach((order) => {
        const hours = getOrderHours(order);
        const rate = getHourlyRate(order.serviceType);
        const teamCount = Math.max(1, order.assignedCleaners.length);

        totalHours += hours;
        totalEarned += hours * rate;
        generatedRevenue += Math.round((Number(order.price) || 0) / teamCount);
      });

      // Нал, который клинер лично забрал с заказов на руки
      const cashTakenFromOrders = completedOrders
        .filter((o: any) => o.cashCollectedById === cleaner.id)
        .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

      // Прямые выплаты/авансы из журнала расходов
      const directPayouts = expenses
        .filter((e) => e.cleanerId === cleaner.id && e.type === 'EXPENSE')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const totalReceived = cashTakenFromOrders + directPayouts;
      const totalAccrued = Math.round(totalEarned);
      const balance = totalAccrued - totalReceived; // Плюс: компания должна клинеру. Минус: клинер должен сдать нал в кассу!

      return {
        id: cleaner.id,
        name: cleaner.name,
        phone: cleaner.phone,
        completedCount: completedForCleaner.length,
        totalHours: Math.round(totalHours * 10) / 10,
        generatedRevenue,
        totalAccrued,
        cashTakenFromOrders,
        directPayouts,
        totalReceived,
        balance,
      };
    });

    const totalCleanersAccrued = cleanerStats.reduce((sum, c) => sum + c.totalAccrued, 0);

    // Операционные расходы (без дивидендов и зарплат клинеров)
    const opexExpenses = expenses
      .filter((e) => e.type === 'EXPENSE' && !['Зарплата клинеру', 'Аванс клинеру', 'Дивиденды владельцам', 'Резервный фонд'].includes(e.category))
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // Чистая прибыль бизнеса
    const netProfit = completedRevenue - totalCleanersAccrued - opexExpenses;
    const marginPercent = completedRevenue > 0 ? Math.round((netProfit / completedRevenue) * 100) : 0;

    // Выплаты учредителям и резерв
    const dividendsPaid = expenses
      .filter((e) => e.type === 'EXPENSE' && e.category === 'Дивиденды владельцам')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const reserveFundAdded = expenses
      .filter((e) => e.type === 'EXPENSE' && e.category === 'Резервный фонд')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      summary: {
        totalRevenue: completedRevenue,
        totalCleanersAccrued,
        opexExpenses,
        netProfit,
        marginPercent,
        dividendsPaid,
        reserveFundAdded,
        retainedEarnings: netProfit - dividendsPaid - reserveFundAdded, // Остаток после дележки
        completedCount: completedOrders.length,
      },
      paymentBreakdown,
      cleanerStats: cleanerStats.filter((c) => c.completedCount > 0 || c.totalAccrued > 0 || c.totalReceived > 0),
      expenses,
      recentOrders: completedOrders,
    });
  } catch (error: any) {
    console.error('Ошибка расчета финансов:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, category, amount, date, comment, cleanerId } = body;

    if (!category || !amount) {
      return NextResponse.json({ error: 'Категория и сумма обязательны' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        type: type || 'EXPENSE',
        category,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        comment: comment || '',
        cleanerId: cleanerId ? Number(cleanerId) : null,
      },
      include: { cleaner: true },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error('Ошибка сохранения операции:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
