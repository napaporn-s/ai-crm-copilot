import type { AiCopilotContext, AiCopilotEngine, AiCopilotEngineResult } from '@/core/integrations/ai/types';

/**
 * Deterministic fallback per skills/crm-copilot/SKILL.md §5. Used whenever
 * the LLM provider path fails (timeout/5xx/429) — see AiCopilotService.
 */
export class HeuristicFallbackEngine implements AiCopilotEngine {
  async analyze(_context: AiCopilotContext): Promise<AiCopilotEngineResult> {
    return {
      summary: ['AI service unavailable — showing default heuristic result.'],
      qualificationScore: 50,
      scoreReasoning: 'Default score applied because the AI provider could not be reached in time.',
      nextBestAction: 'Manual review required due to AI service unavailability.',
      draftLineReply:
        'ขอบคุณที่ติดต่อสอบถามเข้ามาครับ ทางเจ้าหน้าที่จะรีบตรวจสอบและติดต่อกลับโดยเร็วที่สุดครับ',
    };
  }
}
