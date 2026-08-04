import { prisma } from '@/core/db/prisma';
import type { ActivityType, Prisma } from '@prisma/client';

export const activityRepository = {
  create(input: {
    leadId: string;
    actorId: string;
    type: ActivityType;
    payload: Prisma.InputJsonValue;
    viaAI?: boolean;
  }) {
    return prisma.activity.create({ data: input });
  },
  findById(id: string) {
    return prisma.activity.findUnique({ where: { id } });
  },
  updatePayload(id: string, payload: Prisma.InputJsonValue) {
    return prisma.activity.update({ where: { id }, data: { payload } });
  },
};
