import { prisma } from '@/core/db/prisma';
import type { LeadStage } from '@prisma/client';
import type { CreateLeadInput } from '@/core/schemas/lead.schema';

// Never select passwordHash into API-facing responses (US-17 / OWASP A02).
const SAFE_USER_SELECT = { id: true, name: true, email: true, role: true } as const;

export const leadRepository = {
  create(input: CreateLeadInput & { ownerId: string }) {
    return prisma.lead.create({ data: input });
  },
  findById(id: string) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: { contact: true, company: true, owner: { select: SAFE_USER_SELECT } },
    });
  },
  findDetailWithTimeline(id: string) {
    return prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        contact: true,
        company: true,
        owner: { select: SAFE_USER_SELECT },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: SAFE_USER_SELECT } },
        },
        messages: { orderBy: { createdAt: 'desc' } },
      },
    });
  },
  updateStage(id: string, stage: LeadStage) {
    return prisma.lead.update({ where: { id }, data: { stage } });
  },
  updateOwner(id: string, ownerId: string) {
    return prisma.lead.update({ where: { id }, data: { ownerId } });
  },
  updateAiScore(id: string, aiScore: number) {
    return prisma.lead.update({ where: { id }, data: { aiScore } });
  },
  list(params: { stage?: LeadStage; ownerId?: string; q?: string; page: number; pageSize: number }) {
    const where = {
      deletedAt: null,
      ...(params.stage ? { stage: params.stage } : {}),
      ...(params.ownerId ? { ownerId: params.ownerId } : {}),
      ...(params.q
        ? {
            OR: [
              { contact: { name: { contains: params.q, mode: 'insensitive' as const } } },
              { company: { name: { contains: params.q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    return Promise.all([
      prisma.lead.findMany({
        where,
        include: { contact: true, company: true, owner: { select: SAFE_USER_SELECT } },
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.lead.count({ where }),
    ]);
  },
};
