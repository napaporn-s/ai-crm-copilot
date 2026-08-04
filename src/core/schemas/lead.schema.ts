import { z } from 'zod';

export const LeadStageEnum = z.enum(['NEW', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST']);
export const LeadSourceEnum = z.enum(['WEBSITE', 'MANUAL', 'LINE']);

export const CreateLeadSchema = z.object({
  contactId: z.string().uuid(),
  companyId: z.string().uuid(),
  source: LeadSourceEnum,
  budget: z.number().int().min(0).optional(),
  scopeNotes: z.string().max(2000).optional(),
});
export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

export const ListLeadsQuerySchema = z.object({
  stage: LeadStageEnum.optional(),
  ownerId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const StageTransitionSchema = z.object({
  toStage: LeadStageEnum,
});
export type StageTransitionInput = z.infer<typeof StageTransitionSchema>;

export const ReassignOwnerSchema = z.object({
  ownerId: z.string().uuid(),
});
export type ReassignOwnerInput = z.infer<typeof ReassignOwnerSchema>;
