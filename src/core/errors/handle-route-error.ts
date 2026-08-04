import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ResponseFactory } from '@/core/errors/api-response';
import { UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, BadRequestError } from '@/core/errors/app-errors';

/**
 * Single place that turns a thrown error into the standard ApiResponse
 * envelope. Route handlers wrap their body in `withRouteErrors(async () => ...)`
 * instead of hand-rolling try/catch per route (US-11, DP-06 traceability:
 * malformed input never reaches downstream services/providers).
 */
export async function withRouteErrors(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export function mapErrorToResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_root';
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return ResponseFactory.error('Validation failed', 'VALIDATION_ERROR', 400, fieldErrors);
  }
  if (err instanceof UnauthorizedError) {
    return ResponseFactory.error(err.message, 'UNAUTHORIZED', 401);
  }
  if (err instanceof ForbiddenError) {
    return ResponseFactory.error(err.message, 'FORBIDDEN', 403);
  }
  if (err instanceof NotFoundError) {
    return ResponseFactory.error(err.message, 'NOT_FOUND', 404);
  }
  if (err instanceof ConflictError) {
    return ResponseFactory.error(err.message, 'CONFLICT', 409);
  }
  if (err instanceof BadRequestError) {
    return ResponseFactory.error(err.message, 'VALIDATION_ERROR', 400);
  }

  console.error('[UNHANDLED_ROUTE_ERROR]', err);
  return ResponseFactory.error('Internal server error', 'INTERNAL_ERROR', 500);
}
