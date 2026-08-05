import { ForbiddenError } from '@/core/errors/app-errors';

/** RBAC §4: a Sales Rep may only act on Leads they own; Sales Manager/Admin
 * may act on any Lead. Shared by every service that reads/mutates a Lead
 * (lead.service.ts, ai-copilot.service.ts) so the check can't silently go
 * missing from a new consumer the way it once did (see AI-SHARED-CORE.md
 * §A11 — access-control seam). */
export function assertOwnsLead(
  ownerId: string,
  actor: { actorId: string; actorRole: string },
  message = 'You can only perform this action on leads you own'
): void {
  if (actor.actorRole === 'SALES_REP' && ownerId !== actor.actorId) {
    throw new ForbiddenError(message);
  }
}
