import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession, getClientIp } from '@/core/auth/require-session';
import { CreateLeadSchema, ListLeadsQuerySchema } from '@/core/schemas/lead.schema';
import { leadService } from '@/core/services/lead.service';
import { parseJsonBody } from '@/core/http/parse-json-body';

export async function GET(request: NextRequest) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    const query = ListLeadsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const [items, total] = await leadService.list(query, { actorId: session.sub, actorRole: session.role });
    return ResponseFactory.success({ items, total, page: query.page, pageSize: query.pageSize });
  });
}

export async function POST(request: NextRequest) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    const body = CreateLeadSchema.parse(await parseJsonBody(request));
    const lead = await leadService.create(body, {
      actorId: session.sub,
      actorRole: session.role,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    });
    return ResponseFactory.success(lead, 'Lead created', 201);
  });
}
