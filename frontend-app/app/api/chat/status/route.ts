import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const { conversationId, status } = await request.json();

    if (!conversationId || !status) {
      return NextResponse.json({ error: 'Не указаны conversationId или status' }, { status: 400 });
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Ошибка смены статуса чата:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
