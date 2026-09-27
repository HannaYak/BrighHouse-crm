import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Открытые публичные маршруты, доступные без авторизации
  if (
  pathname.startsWith('/api/webhook') || // <-- без буквы "s" на конце
  pathname.startsWith('/book') ||
  pathname.startsWith('/login') ||
  pathname.startsWith('/api/book') ||
  pathname.startsWith('/api/health') ||
  pathname.startsWith('/api/auth/login') ||
  pathname.startsWith('/_next') ||
  (pathname.includes('/api/orders/') && pathname.endsWith('/invoice'))
) {
  return NextResponse.next();
}

  const authToken = request.cookies.get('bh_auth_token')?.value;

  // Если сессии нет — редирект на экран логина
  if (!authToken || authToken !== 'authenticated_admin') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/webhooks|_next/static|_next/image|favicon.ico|login).*)'],
};
