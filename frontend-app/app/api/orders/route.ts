import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { sendPersonalOrderNotification } from '../../../lib/telegram';
import { createGoogleCalendarEvent } from '../../../lib/googleCalendar';

// Безопасный парсер типа уборки под схему Prisma
function parseServiceType(type?: string): 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR' {
  if (!type) return 'STANDARD';
  const t = type.toUpperCase();
  if (t.includes('PLUS') || t.includes('СТАНДАРТ+')) return 'STANDARD_PLUS';
  if (t.includes('GENERAL') || t.includes('ГЕНЕРАЛЬН')) return 'GENERAL';
  if (t.includes('REPAIR') || t.includes('РЕМОНТ') || t.includes('POST_CONSTRUCTION') || t.includes('AFTER_REPAIR')) return 'AFTER_REPAIR';
  return 'STANDARD';
}

// 1. Получение всех заказов
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        assignedCleaners: {
          include: { cleaner: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 });
  }
}

// 2. Создание или обновление заказа
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = body.orderNumber || `ORD-${Math.floor(100 + Math.random() * 900)}`;

    // === БЛОК 1: АВТО-СОЗДАНИЕ КЛИЕНТА ===
    let clientId = null;
    if (body.clientPhone) {
      const client = await prisma.client.upsert({
        where: { phone: body.clientPhone.trim() },
        update: { 
          name: body.clientName || 'Клиент',
          address: body.addressLine1 || '' 
        },
        create: { 
          name: body.clientName || 'Новый Клиент', 
          phone: body.clientPhone.trim(), 
          address: body.addressLine1 || '' 
        }
      });
      clientId = client.id;
    }

    // === БЛОК 2: ГЕОКОДИРОВАНИЕ ===
    let lat = body.latitude || null;
    let lng = body.longitude || null;
    if (!lat && body.addressLine1) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(body.addressLine1)}&limit=1`, {
          headers: { 'User-Agent': 'BrightHouse-CRM/1.0' }
        });
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch (e) {
        console.warn('Geocoding failed:', e);
      }
    }

    // Нормализация даты заказа
    const parsedDate = body.date ? new Date(body.date) : new Date();

    // Общие данные заказа
    const orderData = {
      date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      timeSlot: body.timeSlot || body.startTime || '10:00 — 14:00',
      serviceType: parseServiceType(body.serviceType),
      areaM2: Number(body.areaM2) || 45,
      roomsCount: Number(body.roomsCount) || 1,
      bathroomsCount: Number(body.bathroomsCount) || 1,
      windowsCount: Number(body.windowsCount) || 0,
      hasOven: Boolean(body.hasOven),
      hasFridge: Boolean(body.hasFridge),
      hasFridgeFreeze: Boolean(body.hasFridgeFreeze),
      hasMicrowave: Boolean(body.hasMicrowave),
      hasBalcony: Boolean(body.hasBalcony),
      hasKitchenClosets: Boolean(body.hasKitchenClosets),
      hasStairs: Boolean(body.hasStairs),
      hasSteamer: Boolean(body.hasSteamer),
      hasDishes: Boolean(body.hasDishes || body.hasDishesHours),
      hasIroning: Boolean(body.hasIroning || body.hasIroningHours),
      hasVacuum: Boolean(body.hasVacuum),
      hasPets: Boolean(body.hasPets),
      hasKeys: Boolean(body.hasKeys),
      clientName: (body.clientName || 'Клиент').trim(),
      clientPhone: (body.clientPhone || '').trim(),
      addressLine1: (body.addressLine1 || '').trim(),
      addressLine2: body.addressLine2 || '',
      latitude: lat,
      longitude: lng,
      price: Number(body.price) || 0,
      cleanersCount: (body.assignedCleaners || []).length || 1,
      notes: body.notes || '',
      status: body.status || 'NEW',
      clientId: clientId,
    };

    // Подготовка списка клинеров для связи OrderCleaner
    const cleanerAssignments = (body.assignedCleaners || [])
      .map((c: any) => {
        const id = typeof c === 'object' ? c?.id : c;
        return id ? { cleanerId: Number(id) } : null;
      })
      .filter(Boolean);

    let order;

    if (body.id) {
      // Обновление существующего заказа
      await prisma.orderCleaner.deleteMany({
        where: { orderId: body.id },
      });

      order = await prisma.order.update({
        where: { id: body.id },
        data: {
          ...orderData,
          assignedCleaners: {
            create: cleanerAssignments as any,
          },
        },
        include: {
          assignedCleaners: {
            include: { cleaner: true },
          },
        },
      });
    } else {
      // Создание нового заказа
      order = await prisma.order.create({
        data: {
          orderNumber,
          ...orderData,
          assignedCleaners: {
            create: cleanerAssignments as any,
          },
        },
        include: {
          assignedCleaners: {
            include: { cleaner: true },
          },
        },
      });
    }

    // Персональная отправка клинерам в Telegram
    try {
      await sendPersonalOrderNotification({
        orderId: order.id,
        orderNumber: order.orderNumber,
        date: order.date.toLocaleDateString('ru-RU'),
        timeSlot: order.timeSlot,
        serviceType: body.serviceType || 'Стандартная',
        areaM2: Number(body.areaM2) || 45,
        roomsCount: Number(body.roomsCount) || 1,
        bathroomsCount: Number(body.bathroomsCount) || 1,
        windowsCount: Number(body.windowsCount) || 0,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        price: Number(body.price) || 0,
        assignedCleaners: body.assignedCleaners || [],
        tags: {
          oven: body.hasOven,
          fridge: body.hasFridge,
          microwave: body.hasMicrowave,
          balcony: body.hasBalcony,
          vacuum: body.hasVacuum,
          pets: body.hasPets,
          keys: body.hasKeys,
        },
        notes: body.notes,
      });
    } catch (telegramError) {
      console.warn('Ошибка отправки персонального уведомления клинерам:', telegramError);
    }

    // Синхронизация с Google Calendar
    try {
      const assignedIds = (body.assignedCleaners || [])
        .map((c: any) => (typeof c === 'object' ? c?.id : c))
        .filter(Boolean);

      if (assignedIds.length > 0) {
        const selectedCleaners = await prisma.cleaner.findMany({
          where: { id: { in: assignedIds.map(Number) } },
        });

        const [startH, startM] = (body.startTime || '10:00').split(':').map(Number);
        const [endH, endM] = (body.endTime || '14:00').split(':').map(Number);

        const startIso = new Date(order.date);
        startIso.setHours(startH || 10, startM || 0, 0, 0);

        const endIso = new Date(order.date);
        endIso.setHours(endH || 14, endM || 0, 0, 0);

        const fullAddress = `${body.addressLine1}${body.addressLine2 ? ', ' + body.addressLine2 : ''}`;
        const teammatesList = selectedCleaners.map((c) => c.name).join(' + ');

        for (const cleaner of selectedCleaners) {
          if (cleaner.calendarEmail) {
            await createGoogleCalendarEvent({
              calendarId: cleaner.calendarEmail,
              summary: `🧹 ${body.serviceType || 'Уборка'} — ${body.clientName}`,
              location: fullAddress,
              description: `Заказ: ${order.orderNumber}\nСумма: ${body.price} zł\nБригада: ${teammatesList}\nТЗ: ${body.notes || 'Стандартная уборка'}`,
              startDateTime: startIso.toISOString(),
              endDateTime: endIso.toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('Google Calendar sync skipped or failed:', e);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Ошибка сохранения заказа:', error);
    return NextResponse.json({ error: 'Ошибка сохранения заказа' }, { status: 500 });
  }
}

// 3. Обновление статуса (Drag-and-Drop / Отмена)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, cancelReason } = body;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(cancelReason ? { cancelReason } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Ошибка обновления статуса заказа:', error);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}
