import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession } from '@/core/auth/require-session';
import { leadService } from '@/core/services/lead.service';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    const lead = await leadService.getDetail(params.id, {
      actorId: session.sub,
      actorRole: session.role,
    });
    return ResponseFactory.success(lead);
  });
}
