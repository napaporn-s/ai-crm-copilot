import { contactRepository } from '@/core/repositories/contact.repository';
import { AuditLogger } from '@/core/audit/audit-logger';
import type { CreateContactInput } from '@/core/schemas/contact.schema';

interface ActorContext {
  actorId: string;
  actorRole: string;
  ip: string;
  userAgent: string;
}

export const contactService = {
  /** Duplicate phone/lineUserId is a warning, not a hard block (BA §3.2) —
   * caller decides whether to surface `duplicateOf` to the user. */
  async create(input: CreateContactInput, actor: ActorContext) {
    const duplicate = await contactRepository.findDuplicate({ phone: input.phone, lineUserId: input.lineUserId });

    const contact = await contactRepository.create(input);

    await AuditLogger.log({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: 'CREATE',
      resource: 'Contact',
      resourceId: contact.id,
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
      status: 'SUCCESS',
      changes: { after: input },
    });

    return { contact, duplicateOf: duplicate?.id ?? null };
  },

  list(params: { companyId?: string; q?: string; page: number; pageSize: number }) {
    return contactRepository.list(params);
  },
};
