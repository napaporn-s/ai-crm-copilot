import type { AiCopilotContext, AiCopilotEngine, AiCopilotEngineResult } from '@/core/integrations/ai/types';
import { AiProviderError } from '@/core/integrations/ai/types';

export interface LlmProviderConfig {
  mockMode: boolean;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs: number;
}

/**
 * Real LLM provider call. When `mockMode` is true (default in this
 * assignment — no live provider key required to demo), a deterministic
 * simulated response is generated instead of a network call, exercising the
 * same interface/response contract a real provider would. This keeps the
 * happy-path / missing-history / high-intent evaluation cases (SKILL.md §6,
 * cases 1-3) demoable and testable without a paid API key, while the
 * fallback path (case 4) and malformed-input path (case 5) work identically
 * either way.
 */
export class LlmProviderAdapter implements AiCopilotEngine {
  constructor(private readonly config: LlmProviderConfig) {}

  async analyze(context: AiCopilotContext, opts?: { forceFailure?: boolean }): Promise<AiCopilotEngineResult> {
    if (opts?.forceFailure) {
      throw new AiProviderError('Simulated AI provider failure (test hook)');
    }

    if (this.config.mockMode) {
      return this.simulateAnalyze(context);
    }

    return this.callRealProvider(context);
  }

  private async callRealProvider(context: AiCopilotContext): Promise<AiCopilotEngineResult> {
    if (!this.config.apiKey || !this.config.baseUrl) {
      throw new AiProviderError('AI provider not configured (missing API key/base URL)');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(buildProviderRequestBody(context)),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AiProviderError(`AI provider returned ${response.status}`);
      }

      const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = body.choices?.[0]?.message?.content;
      if (!raw) throw new AiProviderError('AI provider returned an empty response');

      return JSON.parse(raw) as AiCopilotEngineResult;
    } catch (err) {
      if (err instanceof AiProviderError) throw err;
      throw new AiProviderError('AI provider call failed', err);
    } finally {
      clearTimeout(timeout);
    }
  }

  private simulateAnalyze(context: AiCopilotContext): AiCopilotEngineResult {
    const hasHistory = context.messages.length > 0;
    const lastInbound = [...context.messages].reverse().find((m) => m.direction === 'INBOUND');
    const asksPricing = /price|quote|pricing|ราคา|เสนอราคา|quotation/i.test(lastInbound?.content ?? '');

    if (!hasHistory) {
      return {
        summary: [`New lead for ${context.contactName} at ${context.companyName}, no conversation yet.`],
        qualificationScore: 20,
        scoreReasoning: 'No conversation history or activity available — confidence is low until a qualification call happens.',
        nextBestAction: 'Schedule a qualification call to establish budget, timeline, and scope.',
        draftLineReply: 'สวัสดีครับ ขอบคุณที่สนใจครับ รบกวนสอบถามความต้องการเบื้องต้นเพิ่มเติมได้ไหมครับ',
      };
    }

    if (asksPricing) {
      return {
        summary: [
          `${context.contactName} (${context.companyName}) is actively asking about pricing.`,
          `Current stage: ${context.stage}.`,
        ],
        qualificationScore: 85,
        scoreReasoning: 'Contact explicitly requested pricing/quotation — strong buying-intent signal.',
        nextBestAction: 'Send a proposal draft with pricing tailored to the stated scope/budget.',
        draftLineReply: 'ขอบคุณที่สนใจครับ ทางเราจะจัดทำใบเสนอราคาและส่งให้ภายในวันนี้ครับ',
      };
    }

    return {
      summary: [
        `${context.contactName} at ${context.companyName} is in stage ${context.stage}.`,
        `${context.messages.length} message(s) and ${context.activities.length} activity record(s) on file.`,
      ],
      qualificationScore: 55,
      scoreReasoning: 'Active conversation exists but no explicit high-intent signal (e.g. pricing request) yet.',
      nextBestAction: 'Follow up to clarify timeline and decision-maker involvement.',
      draftLineReply: 'ขอบคุณสำหรับข้อมูลครับ ทางเราจะติดตามและอัปเดตความคืบหน้าให้ทราบนะครับ',
    };
  }
}

function buildProviderRequestBody(context: AiCopilotContext) {
  return {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a CRM sales copilot. Return strict JSON: {summary: string[3 max], qualificationScore: number 0-100, scoreReasoning: string, nextBestAction: string, draftLineReply: string <=200 chars}.',
      },
      { role: 'user', content: JSON.stringify(context) },
    ],
  };
}
