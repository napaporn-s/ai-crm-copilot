import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * LINE webhook signature verification (DP-03). MUST run against the raw
 * request body — Next.js Route Handlers must call `request.text()` before
 * any JSON parsing, otherwise this check can be silently bypassed.
 */
export function verifyLineSignature(rawBody: string, signatureHeader: string | null, channelSecret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}
