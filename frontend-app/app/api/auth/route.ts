import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.CRM_PASSWORD || 'brighthouse2026'; // Дефолтный пароль на случай если не задан

    if (password === adminPassword) {
      const response = NextResponse.json({ success: true });
      
      // Устанавливаем защищенную куку на 30 дней
      response.cookies.set('crm_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 дней
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Неверный пароль' }, { status: 401 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
