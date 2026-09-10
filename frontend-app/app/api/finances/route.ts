import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // YYYY-MM-DD

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    // 1. Клинеры
    const cleaners = await prisma.cleaner.findMany({
      orderBy: { name: 'asc' },
    });

    // 2. Заказы за период
    const orders = await prisma.order.findMany({
      where: {
        status: { not: 'CANCELLED' as any },
        ...(startDate && endDate ? { date: dateFilter } : {}),
      },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    // 3. Ручные расходы и доходы за период
    const expenses = await prisma.expense.findMany({
      where: {
        ...(startDate && endDate ? { date: dateFilter } : {}),
      },
      include: {
        cleaner: true,
      },
      orderBy: { date: 'desc' },
    });

    // Хелпер вычисления часов из timeSlot
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

    // Дополнительные ручные доходы
    const manualIncome = expenses
      .filter((e) => e.type === 'INCOME')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const totalRevenue = completedRevenue + manualIncome;

    // Расчёт начислений по клинерам
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

      // Выплаты/авансы, выданные этому клинеру через модуль расходов
      const payoutsIssued = expenses
        .filter((e) => e.cleanerId === cleaner.id && e.type === 'EXPENSE')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        id: cleaner.id,
        name: cleaner.name,
        phone: cleaner.phone,
        completedCount: completedForCleaner.length,
        totalHours: Math.round(totalHours * 10) / 10,
        generatedRevenue,
        totalAccrued: Math.round(totalEarned), // Начислено по ставке 30/35 zł
        payoutsIssued,                         // Фактически выплачено
        balanceDue: Math.round(totalEarned) - payoutsIssued, // Остаток к выплате
      };
    });

    const totalCleanersAccrued = cleanerStats.reduce((sum, c) => sum + c.totalAccrued, 0);

    // Все операционные расходы (кроме прямых выплат клинерам, чтобы не задваивать ФОТ)
    const opexExpenses = expenses
      .filter((e) => e.type === 'EXPENSE' && e.category !== 'Зарплата клинеру')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const netProfit = totalRevenue - totalCleanersAccrued - opexExpenses;
    const marginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    return NextResponse.json({
      summary: {
        totalRevenue,
        completedRevenue,
        manualIncome,
        totalCleanersAccrued,
        opexExpenses,
        netProfit,
        marginPercent,
        completedCount: completedOrders.length,
      },
      cleanerStats: cleanerStats.filter((c) => c.completedCount > 0 || c.totalAccrued > 0 || c.payoutsIssued > 0),
      expenses,
    });
  } catch (error: any) {
    console.error('Ошибка финансов:', error);
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
    console.error('Ошибка сохранения расхода:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID записи обязателен' }, { status: 400 });
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления расхода:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
