import { prisma } from '@/core/db/prisma';
import { contactRepository } from '@/core/repositories/contact.repository';
import { leadRepository } from '@/core/repositories/lead.repository';
import { activityRepository } from '@/core/repositories/activity.repository';
import { messageRepository } from '@/core/repositories/message.repository';
import { AuditLogger } from '@/core/audit/audit-logger';
import type { LineWebhookEvent } from '@/core/schemas/line-webhook.schema';

const UNASSIGNED_COMPANY_NAME = 'LINE Inbound (Unassigned)';

/** MVP simplification: inbound LINE leads with no known company/owner are
 * parked under a placeholder Company and assigned to the first ADMIN user
 * as a triage owner, then reassigned by a Sales Manager (BA §3.1, US-12).
 * Documented limitation — see docs/03-PROJECT-PLAN-PM.md risk register. */
async function getOrCreateUnassignedCompany() {
  const existing = await prisma.company.findFirst({ where: { name: UNASSIGNED_COMPANY_NAME } });
  if (existing) return existing;
  return prisma.company.create({ data: { name: UNASSIGNED_COMPANY_NAME } });
}

async function getDefaultTriageOwnerId(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) return admin.id;

  const anyUser = await prisma.user.findFirst();
  if (anyUser) return anyUser.id;

  throw new Error('No user exists in system to own auto-created LINE leads — seed data is missing');
}

interface ProcessResult {
  processed: number;
  skippedDuplicates: number;
}

export const lineWebhookService = {
  /** US-12, US-13 — idempotent by lineEventId (DB-unique constraint is the
   * real guarantee; the pre-check here just avoids an unnecessary write). */
  async processEvents(payload: LineWebhookEvent, meta: { ip: string; userAgent: string }): Promise<ProcessResult> {
    let processed = 0;
    let skippedDuplicates = 0;

    for (const event of payload.events) {
      if (event.type !== 'message' || !event.message) continue;

      const existing = await messageRepository.findByLineEventId(event.webhookEventId);
      if (existing) {
        skippedDuplicates += 1;
        continue;
      }

      let contact = await contactRepository.findByLineUserId(event.source.userId);
      let lead;

      if (!contact) {
        const company = await getOrCreateUnassignedCompany();
        contact = await contactRepository.create({
          companyId: company.id,
          name: `LINE User ${event.source.userId.slice(0, 8)}`,
          lineUserId: event.source.userId,
        });
        const ownerId = await getDefaultTriageOwnerId();
        lead = await leadRepository.create({
          contactId: contact.id,
          companyId: company.id,
          ownerId,
          source: 'LINE',
        });
      } else {
        const existingLead = await prisma.lead.findFirst({
          where: { contactId: contact.id, deletedAt: null },
          orderBy: { createdAt: 'desc' },
        });
        lead = existingLead ?? undefined;
        if (!lead) {
          const ownerId = await getDefaultTriageOwnerId();
          lead = await leadRepository.create({
            contactId: contact.id,
            companyId: contact.companyId,
            ownerId,
            source: 'LINE',
          });
        }
      }

      try {
        const message = await messageRepository.create({
          leadId: lead.id,
          contactId: contact.id,
          direction: 'INBOUND',
          content: event.message.text,
          status: 'SENT',
          lineEventId: event.webhookEventId,
        });

        await activityRepository.create({
          leadId: lead.id,
          actorId: lead.ownerId,
          type: 'NOTE',
          payload: { note: 'Inbound LINE message received', messageId: message.id },
        });

        await AuditLogger.log({
          actorId: 'system:line-webhook',
          actorRole: 'SYSTEM',
          action: 'CREATE',
          resource: 'Message',
          resourceId: message.id,
          ipAddress: meta.ip,
          userAgent: meta.userAgent,
          status: 'SUCCESS',
          changes: { after: { direction: 'INBOUND', leadId: lead.id } },
        });

        processed += 1;
      } catch (err) {
        // Unique constraint race on lineEventId (concurrent redelivery) —
        // treat as an idempotent duplicate rather than a hard failure.
        if (isUniqueConstraintError(err)) {
          skippedDuplicates += 1;
          continue;
        }
        throw err;
      }
    }

    return { processed, skippedDuplicates };
  },
};

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002';
}
