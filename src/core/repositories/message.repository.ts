import { prisma } from '@/core/db/prisma';
import type { MessageDirection, MessageStatus } from '@prisma/client';

export const messageRepository = {
  findByLineEventId(lineEventId: string) {
    return prisma.message.findUnique({ where: { lineEventId } });
  },
  create(input: {
    leadId: string;
    contactId: string;
    direction: MessageDirection;
    content: string;
    status?: MessageStatus;
    lineEventId?: string;
    viaAI?: boolean;
    approvedById?: string;
  }) {
    return prisma.message.create({ data: input });
  },
};
