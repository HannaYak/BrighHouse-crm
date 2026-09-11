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

    const allOrders = await prisma.order.findMany({
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    const formattedClients = clients.map((client) => {
      const cleanClientPhone = (client.phone || '').replace(/\D/g, '');

      // Собираем заказы: сначала прямые по связи, плюс по совпадению телефона
      const matchedOrders = allOrders.filter((o) => {
        if (o.clientId && String(o.clientId) === String(client.id)) return true;
        const cleanOrderPhone = (o.clientPhone || '').replace(/\D/g, '');
        return (
          cleanClientPhone.length >= 6 &&
          cleanOrderPhone.length >= 6 &&
          (cleanClientPhone.includes(cleanOrderPhone) || cleanOrderPhone.includes(cleanClientPhone))
        );
      });

      // Исключаем дубликаты по id заказа
      const uniqueOrdersMap = new Map();
      [...(client.orders || []), ...matchedOrders].forEach((ord) => {
        uniqueOrdersMap.set(ord.id, ord);
      });
      const finalOrders = Array.from(uniqueOrdersMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const totalSpent = finalOrders
        .filter((o) => o.status !== ('CANCELLED' as any))
        .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
        favoriteCleaner: client.favoriteCleaner,
        blacklistCleaner: client.blacklistCleaner,
        ordersCount: finalOrders.length,
        totalSpent,
        orders: finalOrders,
      };
    });

    return NextResponse.json(formattedClients);
  } catch (error: any) {
    console.error('Ошибка загрузки клиентов:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, notes, favoriteCleaner, blacklistCleaner } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID клиента обязателен' }, { status: 400 });
    }

    const clientWhere = isNaN(Number(id)) ? { id: String(id) } : { id: Number(id) };

    const updatedClient = await prisma.client.update({
      where: clientWhere as any,
      data: {
        ...(notes !== undefined ? { notes } : {}),
        ...(favoriteCleaner !== undefined ? { favoriteCleaner } : {}),
        ...(blacklistCleaner !== undefined ? { blacklistCleaner } : {}),
      },
    });

    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error('Ошибка обновления клиента:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'ID клиента обязателен' }, { status: 400 });
    }

    const clientWhere = isNaN(Number(id)) ? { id: String(id) } : { id: Number(id) };

    await prisma.client.delete({
      where: clientWhere as any,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления клиента:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
