export interface AiCopilotContext {
  leadId: string;
  contactName: string;
  companyName: string;
  stage: string;
  budget: number | null;
  scopeNotes: string | null;
  messages: Array<{ direction: 'INBOUND' | 'OUTBOUND'; content: string; createdAt: string }>;
  activities: Array<{ type: string; createdAt: string }>;
}

export interface AiCopilotEngineResult {
  summary: string[];
  qualificationScore: number;
  scoreReasoning: string;
  nextBestAction: string;
  draftLineReply: string;
}

/** Both the real LLM adapter and the heuristic fallback implement this — the
 * Service layer and API contract never branch on which one answered
 * (docs/02-ARCHITECTURE-SA.md §7). */
export interface AiCopilotEngine {
  analyze(context: AiCopilotContext): Promise<AiCopilotEngineResult>;
}

export class AiProviderError extends Error {
  constructor(message: string, public readonly providerCause?: unknown) {
    super(message);
    this.name = 'AiProviderError';
  }
}
