import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const paymentMethod = searchParams.get('paymentMethod');

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
      dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const cleaners = await prisma.cleaner.findMany({
      orderBy: { name: 'asc' },
    });

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

    // Чек химчистки и окон/витрин
    const calculateSpecialistServicesRevenue = (order: any): number => {
      const dryCleanTotal =
        (Number(order.drySofa2) || 0) * 180 +
        (Number(order.drySofa3) || 0) * 200 +
        (Number(order.drySofaCorner4) || 0) * 220 +
        (Number((order as any).drySofaU) || 0) * 260 +
        (Number(order.dryArmchair) || 0) * 60 +
        (Number((order as any).dryChair) || 0) * 15 +
        (Number((order as any).dryPouf) || 0) * 30 +
        (Number((order as any).dryPillowsSmall) || 0) * 15 +
        (Number((order as any).dryPillowsBig) || 0) * 25 +
        (Number((order as any).dryHeadboard) || 0) * 70 +
        (Number((order as any).dryMattressSingle) || 0) * 90 +
        (Number((order as any).dryMattressDouble) || 0) * 140 +
        (Number(order.dryMattressSide) || 0) * 90 +
        (Number((order as any).dryCarpetM2) || 0) * 15;

      const windowsTotal =
        (Number(order.windowsCount) || 0) * 35 +
        (Number((order as any).balconyWindowsCount) || 0) * 45 +
        (Number((order as any).showcaseWindowsCount) || 0) * 50;

      return dryCleanTotal + windowsTotal;
    };

    // Общее число окон на заказе
    const getTotalWindowsCount = (order: any): number => {
      return (
        (Number(order.windowsCount) || 0) +
        (Number((order as any).balconyWindowsCount) || 0) +
        (Number((order as any).showcaseWindowsCount) || 0)
      );
    };

    const completedOrders = orders.filter((o) => o.status === ('COMPLETED' as any));
    const completedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    const paymentBreakdown: Record<string, number> = {};
    completedOrders.forEach((o: any) => {
      const method = o.paymentMethod || 'CASH';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (Number(o.price) || 0);
    });

    // Расчет начислений и баланса по сотрудникам
    const allStaffStats = cleaners.map((staff) => {
      const nameLower = (staff.name || '').toLowerCase();
      const tags: string[] = Array.isArray((staff as any).tags) ? (staff as any).tags : [];

      // 1. Учредители: Ханна или Админ (30% от ВСЕГО заказа)
      const isBoss =
        nameLower.includes('ханна') ||
        nameLower.includes('админ') ||
        tags.includes('учредитель') ||
        tags.includes('админ');

      // 2. Мастера химчистки: Химчистка 1 (30% от окон/химчистки) и Химчистка 2 (90% от окон/химчистки)
      const isDryClean2 = nameLower.includes('химчистка 2') || tags.includes('химчистка_2');
      const isDryClean1 =
        (nameLower.includes('химчистка 1') || nameLower.includes('химчистка1') || tags.includes('химчистка_1')) &&
        !isBoss;

      const isMaster = isDryClean1 || isDryClean2;
      const isSpecialist = isBoss || isMaster;

      const completedForStaff = completedOrders.filter((order) =>
        order.assignedCleaners.some(
          (ac) => ac.cleanerId === staff.id || (ac.cleaner && ac.cleaner.id === staff.id)
        )
      );

      let totalHours = 0;
      let totalEarned = 0;
      let generatedRevenue = 0;

      completedForStaff.forEach((order) => {
        const orderPrice = Number(order.price) || 0;
        const specialistServicesSubtotal = calculateSpecialistServicesRevenue(order);

        if (isBoss) {
          // Ханна и Админ: 30% от ВСЕГО ЧЕКА заказа
          const payout = Math.round(orderPrice * 0.3);
          totalEarned += payout;
          generatedRevenue += orderPrice;
          totalHours += getOrderHours(order);
        } else if (isMaster) {
          // Химчистка 1 (30%) и Химчистка 2 (90%) - ТОЛЬКО от окон и химчистки
          const rate = isDryClean2 ? 0.9 : 0.3;
          const targetBase = specialistServicesSubtotal > 0 ? specialistServicesSubtotal : orderPrice;
          const payout = Math.round(targetBase * rate);

          totalEarned += payout;
          generatedRevenue += targetBase;
          totalHours += getOrderHours(order);
        } else {
          // ОБЫЧНЫЙ КЛИНЕР
          const hours = getOrderHours(order);
          const totalWindows = getTotalWindowsCount(order);

          // Проверяем, есть ли на заказе Ханна, Админ или мастер Химчистки
          const hasWindowWasher = order.assignedCleaners.some((ac: any) => {
            const clName = (ac.cleaner?.name || ac.name || '').toLowerCase();
            const clTags: string[] = Array.isArray(ac.cleaner?.tags) ? ac.cleaner.tags : [];
            return (
              clName.includes('ханна') ||
              clName.includes('админ') ||
              clName.includes('химчист') ||
              clTags.includes('химчистка_1') ||
              clTags.includes('химчистка_2')
            );
          });

          // Определение почасовой ставки клинера:
          const isHeavyService = ['GENERAL', 'AFTER_REPAIR', 'OFFICE_GENERAL'].includes(order.serviceType);
          let hourlyRate = 30;

          if (isHeavyService) {
            hourlyRate = 35; // Генеральные и после ремонта всегда 35
          } else if (totalWindows >= 2 && !hasWindowWasher) {
            // Если 2+ окна и моют сами клинеры -> повышаем ставку до 35
            hourlyRate = 35;
          } else {
            // Если окна моют Ханна/Админ/Химчистка или окон < 2 -> стандартные 30
            hourlyRate = 30;
          }

          totalHours += hours;
          totalEarned += hours * hourlyRate;

          const nonSpecialistCount = Math.max(
            1,
            order.assignedCleaners.filter((ac: any) => {
              const clName = (ac.cleaner?.name || ac.name || '').toLowerCase();
              return !clName.includes('химчист') && !clName.includes('ханна') && !clName.includes('админ');
            }).length
          );

          const standardCleanRevenue = Math.max(0, orderPrice - specialistServicesSubtotal);
          generatedRevenue += Math.round(standardCleanRevenue / nonSpecialistCount);
        }
      });

      // Финансовые операции сотрудника (выплаты, сдача налички)
      const staffOperations = expenses.filter((e) => e.cleanerId === staff.id);

      const cashTakenFromOrders = completedOrders
        .filter((o: any) => o.cashCollectedById === staff.id)
        .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

      const cashReturnedToDesk = staffOperations
        .filter((e) => e.category === 'Сдача налички клинером' || e.type === 'INCOME')
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const directPayouts = staffOperations
        .filter((e) => e.type === 'EXPENSE' && ['Зарплата клинеру', 'Аванс клинеру'].includes(e.category))
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const currentCashOnHand = Math.max(0, cashTakenFromOrders - cashReturnedToDesk);
      const totalAccrued = Math.round(totalEarned);
      const balance = totalAccrued - directPayouts - currentCashOnHand;

      let roleTitle = 'Клинер (30-35 zł/ч)';
      let specialistRatePercent: number | null = null;

      if (isBoss) {
        roleTitle = 'Админ/Ханна (30% со всего чека)';
        specialistRatePercent = 30;
      } else if (isDryClean2) {
        roleTitle = 'Химчистка 2 (90% окна/химчистка)';
        specialistRatePercent = 90;
      } else if (isDryClean1) {
        roleTitle = 'Химчистка 1 (30% окна/химчистка)';
        specialistRatePercent = 30;
      }

      return {
        id: staff.id,
        name: staff.name,
        phone: staff.phone,
        isSpecialist,
        specialistRatePercent,
        roleTitle,
        completedCount: completedForStaff.length,
        totalHours: Math.round(totalHours * 10) / 10,
        generatedRevenue,
        totalAccrued,
        cashTakenFromOrders,
        cashReturnedToDesk,
        currentCashOnHand,
        directPayouts,
        balance,
      };
    });

    const cleanerStats = allStaffStats.filter((s) => !s.isSpecialist);
    const masterStats = allStaffStats.filter((s) => s.isSpecialist);

    const totalCleanersAccrued = allStaffStats.reduce((sum, c) => sum + c.totalAccrued, 0);

    const opexExpenses = expenses
      .filter(
        (e) =>
          e.type === 'EXPENSE' &&
          !['Зарплата клинеру', 'Аванс клинеру', 'Дивиденды владельцам', 'Резервный фонд', 'Сдача налички клинером'].includes(e.category)
      )
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const netProfit = completedRevenue - totalCleanersAccrued - opexExpenses;
    const marginPercent = completedRevenue > 0 ? Math.round((netProfit / completedRevenue) * 100) : 0;

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
        retainedEarnings: netProfit - dividendsPaid - reserveFundAdded,
        completedCount: completedOrders.length,
      },
      paymentBreakdown,
      cleanerStats: cleanerStats.filter((c) => c.completedCount > 0 || c.totalAccrued > 0 || c.cashTakenFromOrders > 0),
      masterStats: masterStats.filter((m) => m.completedCount > 0 || m.totalAccrued > 0 || m.cashTakenFromOrders > 0),
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
