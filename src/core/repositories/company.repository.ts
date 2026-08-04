import { prisma } from '@/core/db/prisma';
import type { CreateCompanyInput } from '@/core/schemas/company.schema';

export const companyRepository = {
  create(input: CreateCompanyInput) {
    return prisma.company.create({ data: input });
  },
  findById(id: string) {
    return prisma.company.findFirst({ where: { id, deletedAt: null } });
  },
  list(params: { q?: string; page: number; pageSize: number }) {
    const where = {
      deletedAt: null,
      ...(params.q ? { name: { contains: params.q, mode: 'insensitive' as const } } : {}),
    };
    return Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.company.count({ where }),
    ]);
  },
};
