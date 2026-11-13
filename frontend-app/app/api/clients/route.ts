import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

function parseClientMetadata(notes: string | null) {
  if (!notes) return { channel: 'Instagram', clientType: 'разовый', promoCode: null, cleanNotes: '' };

  const channelMatch = notes.match(/\[Канал:\s*([^\]]+)\]/i);
  const typeMatch = notes.match(/\[Тип:\s*([^\]]+)\]/i);
  const promoMatch = notes.match(/\[Промокод:\s*([^\]]+)\]/i);
  const notesMatch = notes.match(/\[Заметки:\s*([^\]]+)\]/i);

  const channel = channelMatch ? channelMatch[1].trim() : 'Instagram';
  const clientType = typeMatch ? typeMatch[1].trim() : 'разовый';
  const promoCode = promoMatch ? promoMatch[1].trim() : null;
  const cleanNotes = notesMatch
    ? notesMatch[1].trim()
    : notes.replace(/\[(Канал|Тип|Промокод|Заметки):[^\]]+\]/gi, '').trim();

  return { channel, clientType, promoCode, cleanNotes };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneQuery = searchParams.get('phone');
    const searchQuery = searchParams.get('q');

    const whereClause: any = {};
    if (phoneQuery) {
      const cleanDigits = phoneQuery.replace(/\D/g, '');
      whereClause.phone = { contains: cleanDigits || phoneQuery };
    } else if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { phone: { contains: searchQuery } },
        { address: { contains: searchQuery, mode: 'insensitive' } },
        { instagram: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
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

    const formattedClients = clients.map((client) => {
      const finalOrders = (client.orders || []).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const totalSpent = finalOrders
        .filter((o) => o.status !== ('CANCELLED' as any))
        .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

      const meta = parseClientMetadata(client.notes);

      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
        instagram: client.instagram || '',
        channel: meta.channel,
        clientType: meta.clientType,
        promoCode: meta.promoCode,
        cleanNotes: meta.cleanNotes,
        favoriteCleaner: client.favoriteCleaner,
        blacklistCleaner: client.blacklistCleaner,
        ordersCount: finalOrders.length,
        totalSpent,
        averageCheck: finalOrders.length > 0 ? Math.round(totalSpent / finalOrders.length) : 0,
        firstOrderDate: finalOrders.length > 0 ? finalOrders[finalOrders.length - 1].date : null,
        lastOrderDate: finalOrders.length > 0 ? finalOrders[0].date : null,
        orders: finalOrders,
      };
    });

    return NextResponse.json(formattedClients);
  } catch (error: any) {
    console.error('Ошибка загрузки клиентов:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, address, notes, instagram, channel, clientType } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Имя и телефон обязательны' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    let constructedNotes = notes || '';
    if (channel) constructedNotes = `[Канал: ${channel}] ${constructedNotes}`;
    if (clientType) constructedNotes = `[Тип: ${clientType}] ${constructedNotes}`;

    // Upsert клиента по номеру телефона
    const client = await prisma.client.upsert({
      where: { phone: cleanPhone },
      update: {
        name: name.trim(),
        address: address ? address.trim() : undefined,
        notes: constructedNotes.trim() ? constructedNotes.trim() : undefined,
        instagram: instagram !== undefined ? (instagram ? instagram.trim() : null) : undefined,
      },
      create: {
        name: name.trim(),
        phone: cleanPhone,
        address: address ? address.trim() : 'Варшава',
        notes: constructedNotes.trim() || null,
        instagram: instagram ? instagram.trim() : null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка создания клиента:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сохранения клиента' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, notes, favoriteCleaner, blacklistCleaner, instagram, name, phone, address } = body;

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
        ...(instagram !== undefined ? { instagram: instagram ? instagram.trim() : null } : {}),
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(address !== undefined ? { address: address.trim() } : {}),
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

    // Отвязываем заказы клиента, чтобы не было ошибки внешнего ключа (foreign key constraint)
    if (!isNaN(Number(id))) {
      await prisma.order.updateMany({
        where: { clientId: Number(id) },
        data: { clientId: null },
      });
    }

    await prisma.client.delete({
      where: clientWhere as any,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления клиента:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
