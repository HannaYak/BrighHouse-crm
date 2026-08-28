import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
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
    const { name, category, quantity, minQuantity, unit, location, assignedTo, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Укажите название позиции' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name: name.trim(),
        category: category || 'CHEMISTRY',
        quantity: Number(quantity) || 0,
        minQuantity: Number(minQuantity) || 5,
        unit: unit || 'шт',
        location: location || 'Главный склад',
        assignedTo: assignedTo || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Ошибка добавления позиции:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, quantityChange, quantity, assignedTo, location, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID позиции обязателен' }, { status: 400 });
    }

    let updateData: any = {};

    if (quantityChange !== undefined) {
      updateData.quantity = { increment: Number(quantityChange) };
    } else if (quantity !== undefined) {
      updateData.quantity = Number(quantity);
    }

    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Ошибка обновления позиции:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });
    }

    await prisma.inventoryItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления позиции:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
