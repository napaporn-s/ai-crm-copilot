import { test, expect } from '@playwright/test';
import { login, createCompany, createContact, createLead } from './utils/api';

/**
 * E2E-02 — AI Copilot happy path, forced-fallback, and malformed-input
 * rejection (US-08, US-10, US-11; skills/crm-copilot/SKILL.md eval cases
 * 1, 4, 5). Uses the `x-simulate-ai-failure` test hook (ignored outside
 * dev/test) instead of depending on a real provider outage.
 */
test.describe('AI Copilot', () => {
  test('happy path returns a non-fallback draft with the full result shape', async ({ request }) => {
    await login(request, 'admin@jenosize.demo');
    const company = await createCompany(request, `AI Test Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'AI Test Contact');
    const lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    const res = await request.post(`/api/leads/${lead.id}/ai-copilot`, { data: {} });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.data.isFallback).toBe(false);
    expect(body.data.summary.length).toBeGreaterThan(0);
    expect(body.data.summary.length).toBeLessThanOrEqual(3);
    expect(body.data.qualificationScore).toBeGreaterThanOrEqual(0);
    expect(body.data.qualificationScore).toBeLessThanOrEqual(100);
    expect(body.data.draftLineReply.length).toBeLessThanOrEqual(200);
    expect(typeof body.data.nextBestAction).toBe('string');
  });

  test('forced provider failure falls back to the deterministic heuristic (SKILL.md §5)', async ({ request }) => {
    await login(request, 'admin@jenosize.demo');
    const company = await createCompany(request, `AI Fallback Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'AI Fallback Contact');
    const lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    const res = await request.post(`/api/leads/${lead.id}/ai-copilot`, {
      headers: { 'x-simulate-ai-failure': 'true' },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.data.isFallback).toBe(true);
    expect(body.data.qualificationScore).toBe(50);
    expect(body.data.nextBestAction).toBe('Manual review required due to AI service unavailability.');
    expect(body.data.draftLineReply).toContain('ขอบคุณที่ติดต่อสอบถามเข้ามาครับ');
  });

  test('malformed request body is rejected by Zod before reaching the AI provider', async ({ request }) => {
    await login(request, 'admin@jenosize.demo');
    const company = await createCompany(request, `AI Malformed Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'AI Malformed Contact');
    const lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    const res = await request.post(`/api/leads/${lead.id}/ai-copilot`, {
      headers: { 'Content-Type': 'application/json' },
      data: '{not-valid-json',
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  test('unauthenticated request is rejected', async ({ request }) => {
    const res = await request.post(`/api/leads/00000000-0000-0000-0000-000000000000/ai-copilot`, { data: {} });
    expect(res.status()).toBe(401);
  });
});
