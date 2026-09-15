import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const phone = searchParams.get('phone');

    if (!clientId && !phone) {
      return NextResponse.json({ error: 'Не указан clientId или phone' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          clientId ? { clientId: Number(clientId) } : {},
          phone ? { clientPhone: phone } : {},
        ],
        status: { not: 'CANCELLED' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Предыдущих заказов не найдено' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Ошибка поиска последнего заказа:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
