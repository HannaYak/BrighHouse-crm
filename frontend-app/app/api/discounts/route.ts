import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

// Получение всех промокодов
export async function GET() {
  try {
    const promoCodes = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(promoCodes);
  } catch (error) {
    console.error('Ошибка загрузки промокодов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// Создание нового промокода
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, description, discountType, value, minOrderSum, maxUses, expiresAt } = body;

    if (!code || !value) {
      return NextResponse.json({ error: 'Код и размер скидки обязательны' }, { status: 400 });
    }

    const newPromo = await prisma.promoCode.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description || '',
        discountType: discountType || 'PERCENT',
        value: parseFloat(value),
        minOrderSum: minOrderSum ? parseFloat(minOrderSum) : 0,
        maxUses: maxUses ? parseInt(maxUses, 10) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    return NextResponse.json(newPromo, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания промокода:', error);
    return NextResponse.json({ error: 'Промокод с таким именем уже существует или ошибка сервера' }, { status: 500 });
  }
}

// Переключение активности / удаление
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    const updated = await prisma.promoCode.update({
      where: { id: parseInt(id, 10) },
      data: { isActive },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Ошибка обновления промокода:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
