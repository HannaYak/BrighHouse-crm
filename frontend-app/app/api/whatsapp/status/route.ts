import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:3001/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) {
      return NextResponse.json({ status: 'offline', error: 'Шлюз недоступен' }, { status: 503 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ status: 'offline', error: e.message }, { status: 503 });
  }
}

export async function POST() {
  try {
    const res = await fetch('http://127.0.0.1:3001/reconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({ status: 'reconnecting' }));
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
