import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

function cleanPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('48') && digits.length >= 11) {
    return `+${digits}`;
  }
  if (digits.length === 9) {
    return `+48${digits}`;
  }
  if (!raw.startsWith('+') && digits.length > 9) {
    return `+${digits}`;
  }
  return raw.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clientsData = Array.isArray(body.clients) ? body.clients : [];

    if (clientsData.length === 0) {
      return NextResponse.json({ error: 'Список клиентов пуст' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let ordersCreatedCount = 0;

    for (const item of clientsData) {
      const rawName = String(item.name || item.clientName || 'Клиент').trim();
      const rawPhone = String(item.phone || item.clientPhone || '').trim();
      const phone = cleanPhone(rawPhone);

      if (!phone) continue;

      const address = String(item.address || item.addressLine1 || 'Варшава').trim();
      const notes = item.notes ? String(item.notes).trim() : null;
      const favoriteCleaner = item.favoriteCleaner || item.cleaner || null;
      const blacklistCleaner = item.blacklistCleaner || null;

      // 1. Создаем или обновляем запись клиента
      let client = await prisma.client.findUnique({
        where: { phone },
      });

      if (!client) {
        client = await prisma.client.create({
          data: {
            name: rawName,
            phone,
            address,
            notes,
            favoriteCleaner: favoriteCleaner ? String(favoriteCleaner) : null,
            blacklistCleaner: blacklistCleaner ? String(blacklistCleaner) : null,
          },
        });
        createdCount++;
      } else {
        client = await prisma.client.update({
          where: { id: client.id },
          data: {
            name: rawName || client.name,
            address: address !== 'Варшава' ? address : client.address,
            notes: notes ? (client.notes ? `${client.notes}\n${notes}` : notes) : client.notes,
            favoriteCleaner: favoriteCleaner ? String(favoriteCleaner) : client.favoriteCleaner,
          },
        });
        updatedCount++;
      }

      // 2. Создаем или связываем диалог в Чатах CRM
      const externalId = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
      await prisma.conversation.upsert({
        where: { externalId },
        update: {
          clientName: client.name,
          phone: client.phone,
        },
        create: {
          channel: 'WHATSAPP',
          externalId,
          senderName: client.name,
          clientName: client.name,
          phone: client.phone,
          lastMessage: notes || 'Импортирован из архивной базы клиентов',
          unreadCount: 0,
          status: 'NONE',
        },
      });

      // 3. Создание истории заказов
      // Вариант А: детальный массив заказов
      if (Array.isArray(item.pastOrders) && item.pastOrders.length > 0) {
        for (const [idx, past] of item.pastOrders.entries()) {
          const date = past.date ? new Date(past.date) : new Date(Date.now() - (idx + 1) * 14 * 86400000);
          const price = Number(past.price) || 200;
          const orderNum = past.orderNumber || `HIST-${client.id}-${Date.now().toString().slice(-4)}-${idx + 1}`;

          const existingOrder = await prisma.order.findUnique({ where: { orderNumber: orderNum } });
          if (!existingOrder) {
            await prisma.order.create({
              data: {
                orderNumber: orderNum,
                date,
                timeSlot: past.timeSlot || '10:00 — 13:30',
                serviceType: past.serviceType || 'STANDARD',
                areaM2: Number(past.areaM2) || 45,
                roomsCount: Number(past.roomsCount) || 2,
                bathroomsCount: Number(past.bathroomsCount) || 1,
                price,
                clientName: client.name,
                clientPhone: client.phone,
                addressLine1: past.address || client.address,
                status: 'COMPLETED',
                clientId: client.id,
                notes: past.notes || 'Архивный выполненный заказ',
              },
            });
            ordersCreatedCount++;
          }
        }
      } 
      // Вариант Б: обобщенная история (количество заказов и сумма LTV из таблицы)
      else if (Number(item.ordersCount || item.pastOrdersCount) > 0 || Number(item.totalSpent || item.spent) > 0) {
        const count = Math.max(1, Number(item.ordersCount || item.pastOrdersCount) || 1);
        const total = Number(item.totalSpent || item.spent) || count * 200;
        const pricePerOrder = Math.round(total / count);

        // Проверяем, есть ли уже заказы у этого клиента
        const existingCount = await prisma.order.count({ where: { clientId: client.id } });
        if (existingCount === 0) {
          for (let i = 0; i < count; i++) {
            const date = new Date(Date.now() - (i + 1) * 21 * 86400000);
            const orderNum = `HIST-${client.id}-${i + 1}`;
            await prisma.order.create({
              data: {
                orderNumber: orderNum,
                date,
                timeSlot: '10:00 — 13:30',
                serviceType: 'STANDARD',
                areaM2: 45,
                roomsCount: 2,
                bathroomsCount: 1,
                price: pricePerOrder,
                clientName: client.name,
                clientPhone: client.phone,
                addressLine1: client.address,
                status: 'COMPLETED',
                clientId: client.id,
                notes: `Архивный заказ №${i + 1} (LTV: ${total} zł)`,
              },
            });
            ordersCreatedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      ordersCreatedCount,
      totalProcessed: clientsData.length,
    });
  } catch (error: any) {
    console.error('Ошибка импорта клиентов:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера при импорте' }, { status: 500 });
  }
}
