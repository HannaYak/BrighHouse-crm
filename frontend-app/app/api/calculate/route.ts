import { NextResponse } from 'next/server';
import { calculateBrightHouseOrder } from '../../../lib/calculator';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = calculateBrightHouseOrder(body);

    // Подгружаем клинеров из базы для умного фильтра
    const allCleaners = await prisma.cleaner.findMany({
      where: { status: 'active' },
    });

    // Фильтрация клинеров по правилам ТЗ
    const recommendedCleaners = allCleaners.filter((c) => {
      // 1. Фильтр животных
      if (body.hasPets && c.tags.includes('аллергия_на_животных')) return false;
      // 2. Фильтр сложности (генералка)
      if (
        (body.serviceType === 'GENERAL' || body.serviceType === 'AFTER_REPAIR') &&
        c.tags.includes('только_поддерживающая')
      ) {
        return false;
      }
      // 3. Фильтр химчистки
      const hasDryClean = (body.drySofa2 || 0) + (body.drySofa3 || 0) + (body.drySofaCorner4 || 0) > 0;
      if (hasDryClean && !c.tags.includes('химчистка')) return false;

      return true;
    });

    return NextResponse.json({
      ...result,
      recommendedCleaners,
    });
  } catch (error) {
    console.error('Ошибка в калькуляторе:', error);
    return NextResponse.json({ error: 'Ошибка расчёта' }, { status: 500 });
  }
}
