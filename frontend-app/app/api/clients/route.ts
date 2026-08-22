import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка получения клиентов' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newClient = await prisma.client.create({
      data: {
        name: body.name,
        phone: body.phone,
        address: body.address || '',
        favoriteCleaner: body.favoriteCleaner || null,
        blacklistCleaner: body.blacklistCleaner || null,
      },
    });
    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка создания клиента' }, { status: 500 });
  }
}
