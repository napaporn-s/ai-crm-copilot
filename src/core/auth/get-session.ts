import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionClaims } from '@/core/auth/session';

/** Server Component / Server Action helper — same verification as the API
 * middleware, used by pages that read data directly through the Service
 * layer instead of round-tripping through their own HTTP API. */
export async function getSession(): Promise<SessionClaims | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
