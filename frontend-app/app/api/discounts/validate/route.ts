import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, orderSum } = body;

    if (!code) {
      return NextResponse.json({ error: 'Введите промокод' }, { status: 400 });
    }

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!promo || !promo.isActive) {
      return NextResponse.json({ error: 'Промокод не найден или неактивен' }, { status: 404 });
    }

    if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
      return NextResponse.json({ error: 'Срок действия промокода истек' }, { status: 400 });
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ error: 'Лимит использований промокода исчерпан' }, { status: 400 });
    }

    const sum = parseFloat(orderSum) || 0;
    if (promo.minOrderSum && sum < promo.minOrderSum) {
      return NextResponse.json({
        error: `Минимальная сумма заказа для промокода — ${promo.minOrderSum} zł`,
      }, { status: 400 });
    }

    let discountAmount = 0;
    if (promo.discountType === 'PERCENT') {
      discountAmount = Math.round((sum * promo.value) / 100);
    } else {
      discountAmount = Math.min(sum, promo.value);
    }

    return NextResponse.json({
      code: promo.code,
      discountType: promo.discountType,
      value: promo.value,
      discountAmount,
    });
  } catch (error) {
    console.error('Ошибка проверки промокода:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
