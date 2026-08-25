import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma'; // 4 уровня вверх

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Ошибка загрузки чатов:', error);
    return NextResponse.json({ error: 'Ошибка загрузки чатов' }, { status: 500 });
  }
}
