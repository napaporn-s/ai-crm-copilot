import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { verifyLineSignature } from '@/core/integrations/line/signature';
import { LineWebhookEventSchema } from '@/core/schemas/line-webhook.schema';
import { lineWebhookService } from '@/core/services/line-webhook.service';
import { UnauthorizedError, BadRequestError } from '@/core/errors/app-errors';
import { getClientIp } from '@/core/auth/require-session';

/**
 * DP-03: signature must be verified against the RAW body — read as text
 * first, verify, and only then JSON.parse + Zod-validate. Never call
 * request.json() before the signature check.
 */
export async function POST(request: NextRequest) {
  return withRouteErrors(async () => {
    const rawBody = await request.text();
    const signature = request.headers.get('x-line-signature');
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) throw new Error('LINE_CHANNEL_SECRET is not configured');
    if (!verifyLineSignature(rawBody, signature, channelSecret)) {
      throw new UnauthorizedError('Invalid LINE webhook signature');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      throw new BadRequestError('Webhook body is not valid JSON');
    }

    const payload = LineWebhookEventSchema.parse(parsedJson);
    const result = await lineWebhookService.processEvents(payload, {
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    });

    return ResponseFactory.success(result, 'Webhook processed');
  });
}
