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
 * without depending on a live LLM provider outage. Ignored outside test/dev. */
function shouldForceFailure(request: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') return false;
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
