import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD || 'brighthouse2026';

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Неверный пароль администратора' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    // Устанавливаем защищенную сессионную cookie на 30 дней
    response.cookies.set({
      name: 'bh_auth_token',
      value: 'authenticated_admin',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 дней
    });

    return response;
  } catch (error) {
    console.error('Ошибка входа:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
