import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { sendPersonalOrderNotification } from '../../../lib/telegram';
import { createGoogleCalendarEvent } from '../../../lib/googleCalendar';

function parseServiceType(type?: string): 'STANDARD' | 'STANDARD_PLUS' | 'GENERAL' | 'AFTER_REPAIR' {
  if (!type) return 'STANDARD';
  const t = type.toUpperCase();
  if (t.includes('PLUS') || t.includes('СТАНДАРТ+')) return 'STANDARD_PLUS';
  if (t.includes('GENERAL') || t.includes('ГЕНЕРАЛЬН')) return 'GENERAL';
  if (t.includes('REPAIR') || t.includes('РЕМОНТ') || t.includes('POST_CONSTRUCTION') || t.includes('AFTER_REPAIR')) return 'AFTER_REPAIR';
  return 'STANDARD';
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = body.orderNumber || `ORD-${Math.floor(100 + Math.random() * 900)}`;

    let clientId = null;
    if (body.clientPhone) {
      try {
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
      } catch (clientErr) {
        console.warn('Client upsert warning:', clientErr);
      }
    }

    // Безопасный геокодинг с защитой от HTML-ответов
    let lat = body.latitude || null;
    let lng = body.longitude || null;
    if (!lat && body.addressLine1) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(body.addressLine1)}&limit=1`, {
          headers: { 'User-Agent': 'BrightHouse-CRM/1.0' }
        });
        const textData = await geoRes.text();
        if (textData.trim().startsWith('[')) {
          const geoData = JSON.parse(textData);
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
          }
        }
      } catch (e) {
        console.warn('Geocoding skipped due to invalid response');
      }
    }

    const parsedDate = body.date ? new Date(body.date) : new Date();

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

    // Уникальные ID клинеров без дублей для исключения P2002 ошибки
    const rawCleaners = (body.assignedCleaners || [])
      .map((c: any) => (typeof c === 'object' ? c?.id : c))
      .filter(Boolean);
    const uniqueCleanerIds = Array.from(new Set(rawCleaners.map(Number)));

    let order;

    if (body.id) {
      // Обновление: сначала гарантированно чистим старые связи, затем обновляем
      await prisma.orderCleaner.deleteMany({
        where: { orderId: body.id },
      });

      order = await prisma.order.update({
        where: { id: body.id },
        data: {
          ...orderData,
          assignedCleaners: {
            create: uniqueCleanerIds.map((cleanerId) => ({ cleanerId })),
          },
        },
        include: {
          assignedCleaners: {
            include: { cleaner: true },
          },
        },
      });
    } else {
      order = await prisma.order.create({
        data: {
          orderNumber,
          ...orderData,
          assignedCleaners: {
            create: uniqueCleanerIds.map((cleanerId) => ({ cleanerId })),
          },
        },
        include: {
          assignedCleaners: {
            include: { cleaner: true },
          },
        },
      });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error('Ошибка сохранения заказа:', error);
    return NextResponse.json({ error: 'Ошибка сохранения заказа в базе' }, { status: 500 });
  }
}

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
    console.error('Ошибка обновления статуса:', error);
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}
