import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    let settings = await prisma.companySettings.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: { id: 1 },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Ошибка загрузки настроек:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const updated = await prisma.companySettings.upsert({
      where: { id: 1 },
      update: {
        companyName: body.companyName,
        nip: body.nip,
        phone: body.phone,
        email: body.email,
        city: body.city,
        address: body.address,
        instagram: body.instagram,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        blikPhone: body.blikPhone,
        recipientName: body.recipientName,
        cleanerRatePercent: parseFloat(body.cleanerRatePercent) || 40.0,
      },
      create: {
        id: 1,
        companyName: body.companyName || 'BrightHouse Cleaning',
        nip: body.nip || '',
        phone: body.phone || '',
        email: body.email || '',
        city: body.city || 'Warszawa',
        address: body.address || '',
        instagram: body.instagram || '',
        bankName: body.bankName || '',
        accountNumber: body.accountNumber || '',
        blikPhone: body.blikPhone || '',
        recipientName: body.recipientName || '',
        cleanerRatePercent: parseFloat(body.cleanerRatePercent) || 40.0,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
