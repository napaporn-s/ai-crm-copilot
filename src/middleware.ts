import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/core/auth/session';

const PUBLIC_API_PATHS = ['/api/auth/login', '/api/line/webhook', '/api/health'];

/**
 * Coarse-grained session gate (SA §4.3). Fine-grained RBAC (ownership,
 * role-specific actions) is enforced in the Service layer, which has the
 * resource context this middleware does not.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
      const response = NextResponse.next();
      response.headers.set('x-client-ip', ip);
      return response;
    }

    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const claims = token ? await verifySessionToken(token) : null;
    if (!claims) {
      return NextResponse.json(
        { success: false, code: 'UNAUTHORIZED', message: 'Authentication required', timestampUtc: new Date().toISOString() },
        { status: 401 }
      );
    }

    const response = NextResponse.next();
    response.headers.set('x-client-ip', ip);
    return response;
  }

  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const claims = token ? await verifySessionToken(token) : null;
  if (!claims) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/leads/:path*', '/companies/:path*', '/contacts/:path*', '/'],
};
