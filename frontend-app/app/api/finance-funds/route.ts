import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const transactions = await prisma.financeTransaction.findMany({
      orderBy: { date: 'desc' },
    });
    
    const completedOrders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      select: { price: true, paymentMethod: true },
    });

    return NextResponse.json({ transactions, completedOrders });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка загрузки фондов' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transaction = await prisma.financeTransaction.create({
      data: {
        type: body.type,
        amount: Number(body.amount),
        category: body.category || 'Прочее',
        description: body.description || '',
        sourceFund: body.sourceFund || null,
        targetFund: body.targetFund || null,
        date: body.date ? new Date(body.date) : new Date(),
      },
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка сохранения транзакции фондов' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
      await prisma.financeTransaction.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}
