import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession, getClientIp } from '@/core/auth/require-session';
import { aiCopilotService } from '@/core/services/ai-copilot.service';
import { parseJsonBody } from '@/core/http/parse-json-body';
import { z } from 'zod';

// Body is optional and empty in normal use; validated with .strict() so a
// genuinely malformed payload (US-11 / SKILL.md eval case 5) is rejected
// before ever reaching the AI provider.
const RequestBodySchema = z.object({}).strict();

/** Test-only hook so E2E-02 (AI fallback) can be exercised over real HTTP
 * without depending on a live LLM provider outage. Gated on an explicit
 * flag rather than `NODE_ENV !== 'production'` — E2E runs against a
 * production build (NODE_ENV=production) for server stability, so the gate
 * can't piggyback on build mode. `ALLOW_TEST_HOOKS` must never be set to
 * "true" in a real deployment (see .env.example). */
function shouldForceFailure(request: NextRequest): boolean {
  if (process.env.ALLOW_TEST_HOOKS !== 'true') return false;
  return request.headers.get('x-simulate-ai-failure') === 'true';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    RequestBodySchema.parse(await parseJsonBody(request));

    const result = await aiCopilotService.requestAnalysis({
      leadId: params.id,
      actorId: session.sub,
      actorRole: session.role,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      forceFailure: shouldForceFailure(request),
    });

    return ResponseFactory.success(result, 'AI analysis complete');
  });
}
