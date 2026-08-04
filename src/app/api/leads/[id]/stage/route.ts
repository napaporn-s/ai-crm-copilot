import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession, getClientIp } from '@/core/auth/require-session';
import { StageTransitionSchema } from '@/core/schemas/lead.schema';
import { leadService } from '@/core/services/lead.service';
import { parseJsonBody } from '@/core/http/parse-json-body';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    const body = StageTransitionSchema.parse(await parseJsonBody(request));
    const lead = await leadService.transitionStage(params.id, body, {
      actorId: session.sub,
      actorRole: session.role,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    });
    return ResponseFactory.success(lead, 'Stage updated');
  });
}
