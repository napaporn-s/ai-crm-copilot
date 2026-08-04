import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionClaims } from '@/core/auth/session';
import { UnauthorizedError, ForbiddenError } from '@/core/errors/app-errors';

export { UnauthorizedError, ForbiddenError };

/**
 * Every non-public API route handler MUST call this first. Session is
 * derived from a signed cookie only — the client can never assert its own
 * role or userId (RBAC §4 in docs/01-REQUIREMENTS-BA.md).
 */
export async function requireSession(request: NextRequest): Promise<SessionClaims> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw new UnauthorizedError();

  const claims = await verifySessionToken(token);
  if (!claims) throw new UnauthorizedError('Invalid or expired session');

  return claims;
}

export function requireRole(claims: SessionClaims, allowed: SessionClaims['role'][]): void {
  if (!allowed.includes(claims.role)) {
    throw new ForbiddenError(`Role ${claims.role} is not permitted to perform this action`);
  }
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-client-ip') ||
    request.headers.get('x-forwarded-for') ||
    '127.0.0.1'
  );
}
