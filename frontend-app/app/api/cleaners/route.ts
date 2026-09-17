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
    const { 
      id, 
      action, 
      name, 
      phone, 
      telegramHandle, 
      district, 
      defaultStartTime, 
      defaultEndTime, 
      startTime, 
      endTime, 
      workDays, 
      status, 
      tags, 
      incompatibleWith 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    const cleanerId = parseInt(String(id), 10);

    // 1. Перегенерация PIN-кода
    if (action === 'generate_pin') {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const updated = await prisma.cleaner.update({
        where: { id: cleanerId },
        data: { authCode: pin },
      });
      return NextResponse.json(updated);
    }

    // 2. Обновление графика и профиля клинера
    const updated = await prisma.cleaner.update({
      where: { id: cleanerId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(telegramHandle !== undefined && { telegramHandle }),
        ...(district !== undefined && { district }),
        ...(status !== undefined && { status }),
        ...(tags !== undefined && { tags }),
        ...(incompatibleWith !== undefined && { incompatibleWith }),
        ...(workDays !== undefined && { workDays }),
        // Синхронизируем график работы клинера
        defaultStartTime: defaultStartTime || startTime || undefined,
        defaultEndTime: defaultEndTime || endTime || undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Ошибка обновления клинера:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
