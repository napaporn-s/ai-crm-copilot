import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession, requireRole, getClientIp } from '@/core/auth/require-session';
import { ReassignOwnerSchema } from '@/core/schemas/lead.schema';
import { leadService } from '@/core/services/lead.service';
import { parseJsonBody } from '@/core/http/parse-json-body';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    requireRole(session, ['SALES_MANAGER', 'ADMIN']);
    const body = ReassignOwnerSchema.parse(await parseJsonBody(request));
    const lead = await leadService.reassignOwner(params.id, body.ownerId, {
      actorId: session.sub,
      actorRole: session.role,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    });
    return ResponseFactory.success(lead, 'Owner reassigned');
  });
}
