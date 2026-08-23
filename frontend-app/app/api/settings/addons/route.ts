import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET() {
  try {
    const addons = await prisma.addOnService.findMany({
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(addons);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка загрузки доп. услуг' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, title, price, durationMins, unit } = body;

    const addon = await prisma.addOnService.upsert({
      where: { code },
      update: { title, price: Number(price), durationMins: Number(durationMins), unit },
      create: { code, title, price: Number(price), durationMins: Number(durationMins), unit },
    });

    return NextResponse.json(addon);
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сохранения доп. услуги' }, { status: 500 });
  }
}
