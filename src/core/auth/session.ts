import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'jenosize_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h — demo auth, not a long-lived remember-me token

export interface SessionClaims {
  sub: string; // userId
  role: UserRole;
  name: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('SESSION_SECRET is not configured — refusing to sign/verify sessions');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') return null;
    return {
      sub: payload.sub,
      role: payload.role as UserRole,
      name: typeof payload.name === 'string' ? payload.name : '',
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_SECONDS;
