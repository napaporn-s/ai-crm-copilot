import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession, getClientIp } from '@/core/auth/require-session';
import { aiCopilotService } from '@/core/services/ai-copilot.service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; activityId: string } }
) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    await aiCopilotService.discardSuggestion({
      leadId: params.id,
      activityId: params.activityId,
      actorId: session.sub,
      actorRole: session.role,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    });
    return ResponseFactory.success(null, 'Suggestion discarded');
  });
}
