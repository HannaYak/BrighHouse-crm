import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        orders: {
          orderBy: { date: 'desc' },
          include: {
            assignedCleaners: {
              include: { cleaner: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedClients = clients.map(client => {
      const totalSpent = client.orders
        .filter(o => o.status !== ('CANCELLED' as any))
        .reduce((sum, o) => sum + (o.price || 0), 0);

      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
        favoriteCleaner: client.favoriteCleaner,
        blacklistCleaner: client.blacklistCleaner,
        ordersCount: client.orders.length,
        totalSpent,
        orders: client.orders,
      };
    });

    return NextResponse.json(formattedClients);
  } catch (error) {
    console.error('Ошибка загрузки клиентов:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, notes, favoriteCleaner, blacklistCleaner } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID клиента обязателен' }, { status: 400 });
    }

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id, 10) },
      data: {
        notes,
        favoriteCleaner,
        blacklistCleaner,
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error('Ошибка обновления клиента:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
