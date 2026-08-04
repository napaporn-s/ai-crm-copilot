import type { NextRequest } from 'next/server';
import { BadRequestError } from '@/core/errors/app-errors';

/** Safe JSON body parse — an unparseable body (US-11 "malformed input") maps
 * to 400 VALIDATION_ERROR instead of an unhandled 500. */
export async function parseJsonBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestError('Request body is not valid JSON');
  }
}
