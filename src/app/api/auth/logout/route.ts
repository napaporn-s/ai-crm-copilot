import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { SESSION_COOKIE_NAME } from '@/core/auth/session';

export async function POST() {
  return withRouteErrors(async () => {
    const response = ResponseFactory.success(null, 'Logged out');
    response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return response;
  });
}
