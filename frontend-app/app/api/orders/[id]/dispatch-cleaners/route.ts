import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { sendOrderDispatchToCleaner } from '../../../../../lib/calendarSync';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    if (!order.assignedCleaners || order.assignedCleaners.length === 0) {
      return NextResponse.json({ error: 'На этот заказ не назначены клинеры' }, { status: 400 });
    }

    const results = [];

    for (const item of order.assignedCleaners) {
      const cleaner = item.cleaner;
      if (cleaner?.telegramChatId) {
        try {
          const res = await sendOrderDispatchToCleaner(order, cleaner);
          if (res.ok) {
            results.push({ cleaner: cleaner.name, status: 'SENT' });
          } else {
            results.push({ cleaner: cleaner.name, status: 'ERROR', error: res.reason || 'Failed to send' });
          }
        } catch (err: any) {
          results.push({ cleaner: cleaner.name, status: 'ERROR', error: err.message });
        }
      } else {
        results.push({ cleaner: cleaner?.name || 'Клинер', status: 'NO_TELEGRAM_LINKED' });
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Ошибка отправки наряда клинерам:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
