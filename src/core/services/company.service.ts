import { companyRepository } from '@/core/repositories/company.repository';
import { AuditLogger } from '@/core/audit/audit-logger';
import type { CreateCompanyInput } from '@/core/schemas/company.schema';

interface ActorContext {
  actorId: string;
  actorRole: string;
  ip: string;
  userAgent: string;
}

export const companyService = {
  async create(input: CreateCompanyInput, actor: ActorContext) {
    const company = await companyRepository.create(input);
    await AuditLogger.log({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: 'CREATE',
      resource: 'Company',
      resourceId: company.id,
      ipAddress: actor.ip,
      userAgent: actor.userAgent,
      status: 'SUCCESS',
      changes: { after: input },
    });
    return company;
  },

  list(params: { q?: string; page: number; pageSize: number }) {
    return companyRepository.list(params);
  },
};
