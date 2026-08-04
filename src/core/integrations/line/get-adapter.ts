import type { LineAdapter } from '@/core/integrations/line/types';
import { MockLineAdapter } from '@/core/integrations/line/mock-adapter';
import { RealLineAdapter } from '@/core/integrations/line/real-adapter';

let mockSingleton: MockLineAdapter | undefined;

export function getLineAdapter(): LineAdapter {
  const mockMode = process.env.LINE_MOCK_MODE !== 'false';
  if (mockMode) {
    mockSingleton ??= new MockLineAdapter();
    return mockSingleton;
  }
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
  return new RealLineAdapter(token);
}
