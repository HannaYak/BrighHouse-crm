import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { conversationId, status, phone, clientName } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Не указан conversationId' }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (clientName) updateData.clientName = clientName;
    if (phone) {
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      updateData.phone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
      
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (conv?.channel === 'WHATSAPP') {
        const rawDigits = cleanPhone.replace(/\D/g, '');
        if (rawDigits) {
          updateData.externalId = `${rawDigits}@s.whatsapp.net`;
        }
      }
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Ошибка обновления данных чата:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
