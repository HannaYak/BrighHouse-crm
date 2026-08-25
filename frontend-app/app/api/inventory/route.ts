import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('Ошибка загрузки склада:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, quantity, unit, minQuantity, costPrice } = body;

    if (!name) {
      return NextResponse.json({ error: 'Название обязательно' }, { status: 400 });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        name,
        category: category || 'CONSUMABLE',
        quantity: parseFloat(quantity) || 0,
        unit: unit || 'шт',
        minQuantity: parseFloat(minQuantity) || 2,
        costPrice: parseFloat(costPrice) || 0,
      },
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Ошибка добавления позиции на склад:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, quantity } = body;

    if (!id || quantity === undefined) {
      return NextResponse.json({ error: 'ID и количество обязательны' }, { status: 400 });
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: parseFloat(quantity) },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Ошибка обновления остатка:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
