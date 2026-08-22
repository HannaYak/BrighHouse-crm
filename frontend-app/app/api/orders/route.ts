import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date(body.date),
        timeSlot: body.time,
        clientName: body.clientName,
        clientPhone: body.clientPhone,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2 || '',
        price: Number(body.price),
        cleanersCount: Number(body.cleanersCount) || 1,
        hasVacuum: Boolean(body.tags?.vacuum),
        hasPets: Boolean(body.tags?.pets),
        hasKeys: Boolean(body.tags?.keys),
        notes: body.clientNotes || '',
        status: body.status || 'NEW',
        urgency: body.urgency || 'NORMAL',
      },
    });
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 });
  }
}
