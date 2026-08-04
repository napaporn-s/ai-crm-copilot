export const dynamic = 'force-dynamic';

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ResponseFactory } from '@/core/errors/api-response';
import { withRouteErrors } from '@/core/errors/handle-route-error';
import { requireSession, requireRole } from '@/core/auth/require-session';
import { prisma } from '@/core/db/prisma';

const QuerySchema = z.object({
  resource: z.string().optional(),
  actorId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  return withRouteErrors(async () => {
    const session = await requireSession(request);
    requireRole(session, ['SALES_MANAGER', 'ADMIN']);

    const query = QuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const where = {
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestampUtc: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return ResponseFactory.success({ items, total, page: query.page, pageSize: query.pageSize });
  });
}
