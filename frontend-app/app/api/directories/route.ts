import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Получаем список районов из базы клинеров и заказов
    const [cleaners, orders] = await Promise.all([
      prisma.cleaner.findMany({ select: { district: true } }),
      prisma.order.findMany({ select: { serviceType: true, price: true } }),
    ]);

    const districts = Array.from(
      new Set(
        [
          'Śródmieście',
          'Mokotów',
          'Wola',
          'Praga-Południe',
          'Praga-Północ',
          'Ursynów',
          'Bielany',
          'Białołęka',
          'Targówek',
          'Bemowo',
          'Ochota',
          'Wilanów',
          ...cleaners.map(c => c.district).filter(Boolean),
        ]
      )
    );

    const services = [
      { id: 'standard', name: 'Стандартная уборка', basePrice: 160, perRoom: 35, perBath: 45 },
      { id: 'standard_plus', name: 'Стандарт+', basePrice: 210, perRoom: 45, perBath: 55 },
      { id: 'general', name: 'Генеральная уборка', basePrice: 280, perRoom: 65, perBath: 75 },
      { id: 'repair', name: 'После ремонта', basePrice: 380, perM2: 8 },
    ];

    const extras = [
      { id: 'oven', name: 'Духовой шкаф', price: 50, unit: 'шт' },
      { id: 'fridge', name: 'Холодильник внутри', price: 50, unit: 'шт' },
      { id: 'microwave', name: 'Микроволновка', price: 25, unit: 'шт' },
      { id: 'hood', name: 'Кухонная вытяжка', price: 40, unit: 'шт' },
      { id: 'window_std', name: 'Окно стандартное (с 2 сторон)', price: 35, unit: 'створка' },
      { id: 'window_balcony', name: 'Окно балконное', price: 45, unit: 'створка' },
      { id: 'balcony_floor', name: 'Балкон (пол и перила)', price: 60, unit: 'шт' },
      { id: 'dishes', name: 'Мытье посуды', price: 40, unit: 'час' },
      { id: 'ironing', name: 'Глажка белья', price: 50, unit: 'час' },
      { id: 'pets', name: 'Уборка шерсти питомцев', price: 30, unit: 'заказ' },
      { id: 'dry_sofa_2', name: 'Химчистка дивана 2-местного', price: 150, unit: 'шт' },
      { id: 'dry_sofa_3', name: 'Химчистка дивана 3-местного', price: 200, unit: 'шт' },
      { id: 'dry_mattress', name: 'Химчистка матраса', price: 120, unit: 'сторона' },
    ];

    return NextResponse.json({
      districts,
      services,
      extras,
      ordersTotal: orders.length,
    });
  } catch (error) {
    console.error('Ошибка загрузки справочников:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
