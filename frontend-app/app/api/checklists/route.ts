import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          assignedCleaners: {
            include: { cleaner: true }
          }
        }
      });
      return NextResponse.json(order);
    }

    // Загружаем активные заказы для проверки
    const activeOrders = await prisma.order.findMany({
      where: {
        status: { in: ['NEW' as any, 'PROCESSING' as any, 'IN_PROGRESS' as any, 'COMPLETED' as any] }
      },
      orderBy: { date: 'desc' },
      take: 20
    });

    return NextResponse.json(activeOrders);
  } catch (error) {
    console.error('Ошибка чек-листов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
