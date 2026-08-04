import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { LoginSchema } from '@/core/schemas/auth.schema';
import { authService } from '@/core/services/auth.service';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/core/auth/session';
import { getClientIp } from '@/core/auth/require-session';
import { parseJsonBody } from '@/core/http/parse-json-body';

export async function POST(request: NextRequest) {
  return withRouteErrors(async () => {
    const body = LoginSchema.parse(await parseJsonBody(request));

    const { token, user } = await authService.login(body, {
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    });

    const response = ResponseFactory.success(user, 'Logged in');
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });
    return response;
  });
}
