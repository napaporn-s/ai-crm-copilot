import type { LineAdapter, LinePushResult } from '@/core/integrations/line/types';

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export class RealLineAdapter implements LineAdapter {
  constructor(private readonly channelAccessToken: string, private readonly timeoutMs = 8000) {}

  async push(to: string, text: string): Promise<LinePushResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(LINE_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return { ok: false, errorMessage: `LINE API returned ${response.status}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, errorMessage: err instanceof Error ? err.message : 'Unknown LINE send error' };
    } finally {
      clearTimeout(timeout);
    }
  }
}
