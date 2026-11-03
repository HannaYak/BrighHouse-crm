import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { sendOrderDispatchToCleaner } from '../../../../../lib/calendarSync';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        assignedCleaners: {
          include: { cleaner: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    let sent = 0;

    for (const assignment of order.assignedCleaners) {
      const cleaner = assignment.cleaner;
      if (cleaner?.telegramChatId) {
        const res = await sendOrderDispatchToCleaner(order, cleaner);
        if (res.ok) sent++;
      }
    }

    return NextResponse.json({ success: true, sentTo: sent });
  } catch (error) {
    console.error('Ошибка отправки наряда клинеру:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
