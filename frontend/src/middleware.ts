import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === '/login' || pathname.startsWith('/reset-password') || pathname.startsWith('/forgot-password');

  // 1. Guarding protected routes: Redirect to login if no token
  if (!token && !isAuthPage && pathname !== '/') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirecting authenticated users to dashboard from auth pages or root
  if (token && (isAuthPage || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Default root landing page redirect to login
  if (!token && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - static resources (_next/static, _next/image)
     * - favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
