import { leadRepository } from '@/core/repositories/lead.repository';
import { activityRepository } from '@/core/repositories/activity.repository';
import { messageRepository } from '@/core/repositories/message.repository';
import { NotFoundError, ConflictError } from '@/core/errors/app-errors';
import { LlmProviderAdapter } from '@/core/integrations/ai/llm-provider-adapter';
import { HeuristicFallbackEngine } from '@/core/integrations/ai/heuristic-engine';
import { redactContextForAi } from '@/core/integrations/ai/redact';
import type { AiCopilotContext } from '@/core/integrations/ai/types';
import { AiCopilotResultSchema, type AiCopilotResult } from '@/core/schemas/ai-copilot.schema';
import { AuditLogger } from '@/core/audit/audit-logger';
import { getLineAdapter } from '@/core/integrations/line/get-adapter';
import type { Prisma } from '@prisma/client';

const heuristicEngine = new HeuristicFallbackEngine();

function getLlmAdapter(): LlmProviderAdapter {
  return new LlmProviderAdapter({
    mockMode: process.env.AI_MOCK_MODE !== 'false',
    apiKey: process.env.AI_PROVIDER_API_KEY,
    baseUrl: process.env.AI_PROVIDER_BASE_URL,
    timeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 8000),
  });
}

interface ActorContext {
  actorId: string;
  actorRole: string;
  ip: string;
  userAgent: string;
}

interface AiSuggestionPayload extends AiCopilotResult {
  status: 'DRAFT' | 'APPROVED' | 'DISCARDED';
}

async function buildContext(leadId: string): Promise<{ context: AiCopilotContext; contactId: string }> {
  const lead = await leadRepository.findDetailWithTimeline(leadId);
  if (!lead) throw new NotFoundError('Lead not found');

  return {
    contactId: lead.contactId,
    context: {
      leadId: lead.id,
      contactName: lead.contact.name,
      companyName: lead.company.name,
      stage: lead.stage,
      budget: lead.budget,
      scopeNotes: lead.scopeNotes,
      messages: lead.messages.map((m) => ({
        direction: m.direction,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      activities: lead.activities.map((a) => ({ type: a.type, createdAt: a.createdAt.toISOString() })),
    },
  };
}

export const aiCopilotService = {
  /** US-08, US-10, US-11 — always returns a DRAFT, never writes to Lead/Message directly. */
  async requestAnalysis(
    params: ActorContext & { leadId: string; forceFailure?: boolean }
  ): Promise<{ activityId: string } & AiCopilotResult> {
    const { context } = await buildContext(params.leadId);
    const redacted = redactContextForAi(context);

    let isFallback = false;
    let engineResult;
    try {
      engineResult = await getLlmAdapter().analyze(redacted, { forceFailure: params.forceFailure });
    } catch {
      isFallback = true;
      engineResult = await heuristicEngine.analyze(redacted);
    }

    let result = AiCopilotResultSchema.safeParse({ ...engineResult, isFallback });
    if (!result.success) {
      // Malformed/unparseable engine output degrades to the fallback too (SA §7).
      const fallback = await heuristicEngine.analyze(redacted);
      result = AiCopilotResultSchema.safeParse({ ...fallback, isFallback: true });
    }
    if (!result.success) throw result.error; // heuristic output itself must always be schema-valid

    const payload: AiSuggestionPayload = { ...result.data, status: 'DRAFT' };
    const activity = await activityRepository.create({
      leadId: params.leadId,
      actorId: params.actorId,
      type: 'AI_SUGGESTION',
      viaAI: true,
      payload: payload as unknown as Prisma.InputJsonValue,
    });

    await leadRepository.updateAiScore(params.leadId, result.data.qualificationScore);

    await AuditLogger.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'EXECUTE',
      resource: 'AiCopilot',
      resourceId: params.leadId,
      ipAddress: params.ip,
      userAgent: params.userAgent,
      status: 'SUCCESS',
      changes: { after: { activityId: activity.id, isFallback: result.data.isFallback } },
    });

    return { activityId: activity.id, ...result.data };
  },

  /** US-09, US-14 — human approval is the audited actor of record, not the AI (BA §3.3). */
  async approveSuggestion(params: ActorContext & { leadId: string; activityId: string }) {
    const activity = await activityRepository.findById(params.activityId);
    if (!activity || activity.leadId !== params.leadId || activity.type !== 'AI_SUGGESTION') {
      throw new NotFoundError('AI suggestion not found');
    }
    const payload = activity.payload as unknown as AiSuggestionPayload;
    if (payload.status !== 'DRAFT') {
      throw new ConflictError(`Suggestion already ${payload.status.toLowerCase()}`);
    }

    const { contactId } = await buildContext(params.leadId);
    const adapter = getLineAdapter();
    const pushResult = await adapter.push(contactId, payload.draftLineReply);

    const message = await messageRepository.create({
      leadId: params.leadId,
      contactId,
      direction: 'OUTBOUND',
      content: payload.draftLineReply,
      status: pushResult.ok ? 'SENT' : 'FAILED',
      viaAI: true,
      approvedById: params.actorId,
    });

    await activityRepository.updatePayload(params.activityId, {
      ...payload,
      status: 'APPROVED',
    });

    await AuditLogger.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'CREATE',
      resource: 'Message',
      resourceId: message.id,
      ipAddress: params.ip,
      userAgent: params.userAgent,
      status: pushResult.ok ? 'SUCCESS' : 'FAILED',
      errorMessage: pushResult.errorMessage,
      changes: { after: { messageId: message.id, status: message.status } },
    });

    return { messageId: message.id, status: message.status, lineError: pushResult.errorMessage };
  },

  /** US-09 — discard writes only an audit trail, never a send. */
  async discardSuggestion(params: ActorContext & { leadId: string; activityId: string }) {
    const activity = await activityRepository.findById(params.activityId);
    if (!activity || activity.leadId !== params.leadId || activity.type !== 'AI_SUGGESTION') {
      throw new NotFoundError('AI suggestion not found');
    }
    const payload = activity.payload as unknown as AiSuggestionPayload;
    if (payload.status !== 'DRAFT') {
      throw new ConflictError(`Suggestion already ${payload.status.toLowerCase()}`);
    }

    await activityRepository.updatePayload(params.activityId, { ...payload, status: 'DISCARDED' });

    await AuditLogger.log({
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'UPDATE',
      resource: 'AiSuggestion',
      resourceId: params.activityId,
      ipAddress: params.ip,
      userAgent: params.userAgent,
      status: 'SUCCESS',
      changes: { after: { status: 'DISCARDED' } },
    });
  },
};
