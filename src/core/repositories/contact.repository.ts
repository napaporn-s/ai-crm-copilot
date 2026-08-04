import { prisma } from '@/core/db/prisma';
import type { CreateContactInput } from '@/core/schemas/contact.schema';

export const contactRepository = {
  create(input: CreateContactInput) {
    return prisma.contact.create({ data: input });
  },
  findById(id: string) {
    return prisma.contact.findFirst({ where: { id, deletedAt: null } });
  },
  findByLineUserId(lineUserId: string) {
    return prisma.contact.findFirst({ where: { lineUserId, deletedAt: null } });
  },
  findDuplicate(params: { phone?: string; lineUserId?: string }) {
    if (!params.phone && !params.lineUserId) return Promise.resolve(null);
    return prisma.contact.findFirst({
      where: {
        deletedAt: null,
        OR: [
          params.phone ? { phone: params.phone } : undefined,
          params.lineUserId ? { lineUserId: params.lineUserId } : undefined,
        ].filter(Boolean) as object[],
      },
    });
  },
  list(params: { companyId?: string; q?: string; page: number; pageSize: number }) {
    const where = {
      deletedAt: null,
      ...(params.companyId ? { companyId: params.companyId } : {}),
      ...(params.q ? { name: { contains: params.q, mode: 'insensitive' as const } } : {}),
    };
    return Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.contact.count({ where }),
    ]);
  },
};
