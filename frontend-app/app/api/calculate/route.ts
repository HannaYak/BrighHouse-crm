import { NextResponse } from 'next/server';
import { calculateOrderDuration } from '../../../lib/calculator';
import { filterAvailableCleaners } from '../../../lib/smartFilter';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { totalHours, durationPerCleaner } = calculateOrderDuration(body.cleaningParams, body.cleanersCount || 1);

    // Подгружаем активных клинеров из базы
    const cleaners = await prisma.cleaner.findMany({
      where: { status: 'active' },
    });

    const filterResult = filterAvailableCleaners(cleaners, {
      hasPets: body.cleaningParams?.hasPets,
      isGeneral: body.cleaningParams?.isGeneral,
      blacklistedCleanerName: body.blacklistedCleanerName,
    });

    return NextResponse.json({
      totalHours,
      durationPerCleaner,
      recommendedCleaners: filterResult.eligible,
      ineligibleCleaners: filterResult.rejected,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка расчета параметров уборки' }, { status: 500 });
  }
}
