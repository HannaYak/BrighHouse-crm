import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { conversationId, status, phone, clientName } = await request.json();

    if (!conversationId) {
      return NextResponse.json({ error: 'Не указан conversationId' }, { status: 400 });
    }

    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) {
      return NextResponse.json({ error: 'Диалог не найден' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (clientName) updateData.clientName = clientName;

    if (phone) {
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
      updateData.phone = formattedPhone;

      if (conv.channel === 'WHATSAPP') {
        const rawDigits = cleanPhone.replace(/\D/g, '');
        if (rawDigits) {
          const targetExternalId = `${rawDigits}@s.whatsapp.net`;
          if (conv.externalId !== targetExternalId) {
            const existingDuplicate = await prisma.conversation.findUnique({
              where: { externalId: targetExternalId },
            });

            if (existingDuplicate && existingDuplicate.id !== conversationId) {
              // Переносим все сообщения из текущего диалога в уже существующий
              await prisma.message.updateMany({
                where: { conversationId: conversationId },
                data: { conversationId: existingDuplicate.id },
              });
              // Удаляем пустой дубликат
              await prisma.conversation.delete({ where: { id: conversationId } });
              // Обновляем целевой диалог
              const updatedExisting = await prisma.conversation.update({
                where: { id: existingDuplicate.id },
                data: {
                  phone: formattedPhone,
                  ...(status ? { status } : {}),
                  ...(clientName ? { clientName } : {}),
                },
              });
              return NextResponse.json(updatedExisting);
            } else {
              updateData.externalId = targetExternalId;
            }
          }
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
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
