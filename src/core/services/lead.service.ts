import { leadRepository } from '@/core/repositories/lead.repository';
import { activityRepository } from '@/core/repositories/activity.repository';
import { AuditLogger } from '@/core/audit/audit-logger';
import { NotFoundError, ConflictError, ForbiddenError } from '@/core/errors/app-errors';
import type { CreateLeadInput, StageTransitionInput } from '@/core/schemas/lead.schema';
import type { LeadStage, UserRole } from '@prisma/client';

interface ActorContext {
  actorId: string;
  actorRole: UserRole;
  ip: string;
  userAgent: string;
}

const TERMINAL_STAGES: LeadStage[] = ['WON', 'LOST'];

export const leadService = {
  async create(input: CreateLeadInput, actor: ActorContext) {
    const lead = await leadRepository.create({ ...input, ownerId: actor.actorId });

    await activityRepository.create({
      leadId: lead.id,
      actorId: actor.actorId,
      type: 'NOTE',
      payload: { note: `Lead created from source=${input.source}` },
    });

    await AuditLogger.log({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: 'CREATE',
      resource: 'Lead',
      resourceId: lead.id,
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
      status: 'SUCCESS',
      changes: { after: input },
    });

    return lead;
  },

  /** RBAC §4: Sales Rep is always scoped to their own leads, regardless of
   * a caller-supplied ownerId — only Manager/Admin can list team-wide. */
  list(
    params: { stage?: LeadStage; ownerId?: string; q?: string; page: number; pageSize: number },
    actor: Pick<ActorContext, 'actorId' | 'actorRole'>
  ) {
    const ownerId = actor.actorRole === 'SALES_REP' ? actor.actorId : params.ownerId;
    return leadRepository.list({ ...params, ownerId });
  },

  /** RBAC §4: Sales Rep may only view their own leads; Manager/Admin see all. */
  async getDetail(leadId: string, actor: Pick<ActorContext, 'actorId' | 'actorRole'>) {
    const lead = await leadRepository.findDetailWithTimeline(leadId);
    if (!lead) throw new NotFoundError('Lead not found');
    if (actor.actorRole === 'SALES_REP' && lead.ownerId !== actor.actorId) {
      throw new ForbiddenError('You can only view leads you own');
    }
    return lead;
  },

  /** BA §3.1: WON/LOST are terminal; only ADMIN may move a lead out of a
   * terminal stage. Everything else is a free transition in this MVP. */
  async transitionStage(leadId: string, input: StageTransitionInput, actor: ActorContext) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    if (actor.actorRole === 'SALES_REP' && lead.ownerId !== actor.actorId) {
      throw new ForbiddenError('You can only update leads you own');
    }

    const isReopeningTerminal = TERMINAL_STAGES.includes(lead.stage) && lead.stage !== input.toStage;
    if (isReopeningTerminal && actor.actorRole !== 'ADMIN') {
      throw new ConflictError(`Lead is in terminal stage ${lead.stage} and cannot be moved without Admin approval`);
    }

    const fromStage = lead.stage;
    const updated = await leadRepository.updateStage(leadId, input.toStage);

    await activityRepository.create({
      leadId,
      actorId: actor.actorId,
      type: 'STAGE_CHANGE',
      payload: { fromStage, toStage: input.toStage },
    });

    await AuditLogger.log({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: 'UPDATE',
      resource: 'Lead',
      resourceId: leadId,
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
      status: 'SUCCESS',
      changes: { before: { stage: fromStage }, after: { stage: input.toStage } },
    });

    return updated;
  },

  async reassignOwner(leadId: string, ownerId: string, actor: ActorContext) {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError('Lead not found');

    const updated = await leadRepository.updateOwner(leadId, ownerId);

    await activityRepository.create({
      leadId,
      actorId: actor.actorId,
      type: 'NOTE',
      payload: { note: `Owner reassigned from ${lead.ownerId} to ${ownerId}` },
    });

    await AuditLogger.log({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: 'UPDATE',
      resource: 'Lead',
      resourceId: leadId,
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
      status: 'SUCCESS',
      changes: { before: { ownerId: lead.ownerId }, after: { ownerId } },
    });

    return updated;
  },
};
