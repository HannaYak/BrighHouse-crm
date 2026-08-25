import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const cleaners = await prisma.cleaner.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(cleaners);
  } catch (error) {
    console.error('Ошибка загрузки клинеров:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, telegramHandle, district } = body;

    if (!name) {
      return NextResponse.json({ error: 'Имя обязательно' }, { status: 400 });
    }

    // Генерируем 6-значный случайный PIN-код для привязки к боту
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    const newCleaner = await prisma.cleaner.create({
      data: {
        name,
        phone: phone || '',
        telegramHandle: telegramHandle || '',
        district: district || '',
        authCode: pin,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(newCleaner, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания клинера:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    // Перегенерация PIN-кода
    if (action === 'generate_pin') {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const updated = await prisma.cleaner.update({
        where: { id: parseInt(id, 10) },
        data: { authCode: pin },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error) {
    console.error('Ошибка обновления клинера:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
