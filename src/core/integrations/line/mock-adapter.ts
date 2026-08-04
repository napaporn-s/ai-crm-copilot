import type { LineAdapter, LinePushResult } from '@/core/integrations/line/types';

/**
 * In-memory adapter used when LINE_MOCK_MODE=true (default for local dev
 * and tests, per JD Part 2 "mock adapter for local tests"). No network
 * calls; logs would-be sends so behavior is inspectable in tests/console.
 */
export class MockLineAdapter implements LineAdapter {
  public readonly sent: Array<{ to: string; text: string }> = [];

  async push(to: string, text: string): Promise<LinePushResult> {
    if (text.includes('__FORCE_LINE_FAILURE__')) {
      return { ok: false, errorMessage: 'Simulated LINE send failure (test hook)' };
    }
    this.sent.push({ to, text });
    console.log(`[MOCK_LINE_PUSH] to=${to} text=${text}`);
    return { ok: true };
  }
}
