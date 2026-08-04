import { test, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET ?? 'dev-mock-channel-secret';

function sign(body: string): string {
  return createHmac('sha256', CHANNEL_SECRET).update(body).digest('base64');
}

function buildEvent(eventId: string, userId: string) {
  return JSON.stringify({
    destination: 'U_test_dest',
    events: [
      {
        type: 'message',
        webhookEventId: eventId,
        source: { userId, type: 'user' },
        message: { id: `msg-${eventId}`, type: 'text', text: 'ทดสอบข้อความ E2E' },
        replyToken: 'rtoken-e2e',
        timestamp: Date.now(),
      },
    ],
  });
}

/**
 * E2E-03 — LINE webhook signature verification and idempotent redelivery
 * (US-12, US-13; DP-03, DP-04). Signature MUST be checked against the raw
 * body before any JSON parsing (docs/02-ARCHITECTURE-SA.md §4.2).
 */
test.describe('LINE webhook security', () => {
  test('rejects a request with no signature header', async ({ request }) => {
    const body = buildEvent(`e2e-nosig-${Date.now()}`, 'Ue2enosig');
    const res = await request.post('/api/line/webhook', {
      headers: { 'Content-Type': 'application/json' },
      data: body,
    });
    expect(res.status()).toBe(401);
  });

  test('rejects a request with an invalid signature', async ({ request }) => {
    const body = buildEvent(`e2e-badsig-${Date.now()}`, 'Ue2ebadsig');
    const res = await request.post('/api/line/webhook', {
      headers: { 'Content-Type': 'application/json', 'x-line-signature': 'not-a-real-signature==' },
      data: body,
    });
    expect(res.status()).toBe(401);
  });

  test('accepts a validly signed event and deduplicates redelivery by event ID', async ({ request }) => {
    const eventId = `e2e-valid-${Date.now()}`;
    const body = buildEvent(eventId, `Ue2evalid${Date.now()}`);
    const signature = sign(body);

    const first = await request.post('/api/line/webhook', {
      headers: { 'Content-Type': 'application/json', 'x-line-signature': signature },
      data: body,
    });
    expect(first.ok()).toBeTruthy();
    const firstBody = await first.json();
    expect(firstBody.data.processed).toBe(1);
    expect(firstBody.data.skippedDuplicates).toBe(0);

    // Same webhookEventId redelivered (LINE retries on slow/failed ack).
    const second = await request.post('/api/line/webhook', {
      headers: { 'Content-Type': 'application/json', 'x-line-signature': signature },
      data: body,
    });
    expect(second.ok()).toBeTruthy();
    const secondBody = await second.json();
    expect(secondBody.data.processed).toBe(0);
    expect(secondBody.data.skippedDuplicates).toBe(1);
  });

  test('a validly signed but malformed JSON body is rejected as 400, not 500', async ({ request }) => {
    const malformed = '{not-json';
    const signature = sign(malformed);
    const res = await request.post('/api/line/webhook', {
      headers: { 'Content-Type': 'application/json', 'x-line-signature': signature },
      data: malformed,
    });
    expect(res.status()).toBe(400);
  });
});
