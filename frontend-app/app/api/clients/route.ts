import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        orders: {
          select: { price: true, status: true, date: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedClients = clients.map(client => {
      // Считаем только не отмененные заказы
      const validOrders = client.orders.filter(o => o.status !== 'CANCELLED');
      const ltv = validOrders.reduce((sum, o) => sum + (o.price || 0), 0);
      
      return {
        ...client,
        ordersCount: validOrders.length,
        ltv,
        lastOrderDate: validOrders.length > 0 
          ? validOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date 
          : null
      };
    });

    return NextResponse.json(enrichedClients);
  } catch (error) {
    console.error('Ошибка загрузки клиентов:', error);
    return NextResponse.json({ error: 'Ошибка загрузки клиентов' }, { status: 500 });
  }
}
