import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Формат YYYY-MM (например, 2026-08)

    const orders = await prisma.order.findMany({
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    const filteredOrders = month
      ? orders.filter(o => o.date.toISOString().startsWith(month))
      : orders;

    // Формируем CSV с BOM для корректного открытия в Excel с кириллицей и спецсимволами
    const headers = [
      'Номер заказа',
      'Дата',
      'Клиент',
      'Телефон',
      'Адрес',
      'Услуга',
      'Статус',
      'Сумма (zł)',
      'Клинеры',
      'Выплата клинерам (zł)',
      'Маржа компании (zł)',
      'Примечания',
    ];

    const rows = filteredOrders.map(o => {
      const dateStr = new Date(o.date).toLocaleDateString('ru-RU');
      const cleanersList = o.assignedCleaners.map(ac => ac.cleaner?.name).filter(Boolean).join(' + ') || 'Не назначены';
      const orderPrice = o.price || 0;
      
      // Расчет доли клинеров (40% по умолчанию) и чистой прибыли
      const cleanerPayout = Math.round(orderPrice * 0.4);
      const companyProfit = orderPrice - cleanerPayout;

      return [
        `"${o.orderNumber || ''}"`,
        `"${dateStr}"`,
        `"${(o.clientName || '').replace(/"/g, '""')}"`,
        `"${o.clientPhone || ''}"`,
        `"${(o.addressLine1 || '').replace(/"/g, '""')}"`,
        `"${(o.serviceType || '').replace(/"/g, '""')}"`,
        `"${o.status || ''}"`,
        orderPrice,
        `"${cleanersList}"`,
        cleanerPayout,
        companyProfit,
        `"${(o.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="brighthouse-report-${month || 'all'}.csv"`,
      },
    });
  } catch (error) {
    console.error('Ошибка экспорта CSV:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
