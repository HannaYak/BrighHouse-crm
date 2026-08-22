import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const cleaners = await prisma.cleaner.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(cleaners);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка получения клинеров' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Если запрос на генерацию PIN-кода для клинера
    if (body.action === 'generate_pin') {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const updated = await prisma.cleaner.update({
        where: { id: Number(body.cleanerId) },
        data: { authCode: pin },
      });
      return NextResponse.json({ authCode: updated.authCode });
    }

    // Создание нового клинера
    const newCleaner = await prisma.cleaner.create({
      data: {
        name: body.name,
        phone: body.phone,
        district: body.district || 'Центр',
        tags: body.tags || [],
        authCode: Math.floor(100000 + Math.random() * 900000).toString(),
      },
    });
    return NextResponse.json(newCleaner, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сохранения клинера' }, { status: 500 });
  }
}
