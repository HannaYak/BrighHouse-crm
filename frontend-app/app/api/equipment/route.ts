import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const items = await prisma.equipment.findMany({
      include: { holder: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, status, holderId, notes } = body;

    const item = await prisma.equipment.create({
      data: {
        name,
        category: category || 'EQUIPMENT',
        status: status || 'IN_STOCK',
        holderId: holderId ? Number(holderId) : null,
        notes: notes || '',
      },
      include: { holder: true },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, holderId, notes } = body;

    if (!id) return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });

    const updated = await prisma.equipment.update({
      where: { id: Number(id) },
      data: {
        ...(status ? { status } : {}),
        ...(holderId !== undefined ? { holderId: holderId ? Number(holderId) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      include: { holder: true },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID обязателен' }, { status: 400 });

    await prisma.equipment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
