import type { NextRequest } from 'next/server';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession, getClientIp } from '@/core/auth/require-session';
import { CreateCompanySchema, ListCompaniesQuerySchema } from '@/core/schemas/company.schema';
import { companyService } from '@/core/services/company.service';
import { parseJsonBody } from '@/core/http/parse-json-body';

export async function GET(request: NextRequest) {
  return withRouteErrors(async () => {
    await requireSession(request);
    const query = ListCompaniesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const [items, total] = await companyService.list(query);
    return ResponseFactory.success({ items, total, page: query.page, pageSize: query.pageSize });
  });
}

export async function POST(request: NextRequest) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    const body = CreateCompanySchema.parse(await parseJsonBody(request));
    const company = await companyService.create(body, {
      actorId: session.sub,
      actorRole: session.role,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    });
    return ResponseFactory.success(company, 'Company created', 201);
  });
}
