import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const cleaners = await prisma.cleaner.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(cleaners);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка загрузки клинеров' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, authCode, status } = body;

    const updated = await prisma.cleaner.update({
      where: { id: Number(id) },
      data: {
        ...(authCode !== undefined ? { authCode } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка обновления клинера' }, { status: 500 });
  }
}
