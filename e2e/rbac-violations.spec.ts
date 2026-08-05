import { test, expect } from '@playwright/test';
import { login, createCompany, createContact, createLead } from './utils/api';

/**
 * E2E-04 — RBAC matrix enforcement (docs/01-REQUIREMENTS-BA.md §4). Goes
 * beyond the JD's minimum three flows per the QA directive in
 * AGENT-ROLES.md ("Unauthorized Access Attempt Assertions").
 */
test.describe('RBAC violations', () => {
  test('Sales Rep cannot reassign a lead owner (Manager/Admin only)', async ({ request }) => {
    await login(request, 'rep1@jenosize.demo');
    const company = await createCompany(request, `RBAC Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'RBAC Contact A');
    const lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    const res = await request.patch(`/api/leads/${lead.id}/owner`, { data: { ownerId: lead.ownerId } });
    expect(res.status()).toBe(403);
  });

  test('Sales Rep cannot read the audit log (Manager/Admin only)', async ({ request }) => {
    await login(request, 'rep1@jenosize.demo');
    const res = await request.get('/api/audit-logs');
    expect(res.status()).toBe(403);
  });

  test('Sales Rep cannot view or update a lead owned by another Sales Rep', async ({ request, browser }) => {
    // rep1 creates a lead
    await login(request, 'rep1@jenosize.demo');
    const company = await createCompany(request, `RBAC Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'RBAC Contact B');
    const lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    // rep2, in an isolated cookie context, tries to access rep1's lead
    const rep2Context = await browser.newContext();
    const rep2Api = rep2Context.request;
    await login(rep2Api, 'rep2@jenosize.demo');

    const getRes = await rep2Api.get(`/api/leads/${lead.id}`);
    expect(getRes.status()).toBe(403);

    const stageRes = await rep2Api.patch(`/api/leads/${lead.id}/stage`, { data: { toStage: 'QUALIFIED' } });
    expect(stageRes.status()).toBe(403);

    await rep2Context.close();
  });

  test('Sales Rep lead list is always scoped to their own leads, even if another ownerId is requested', async ({
    request,
    browser,
  }) => {
    await login(request, 'rep1@jenosize.demo');
    const company = await createCompany(request, `RBAC Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'RBAC Contact C');
    const rep1Lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    const rep2Context = await browser.newContext();
    const rep2Api = rep2Context.request;
    await login(rep2Api, 'rep2@jenosize.demo');

    // rep2 explicitly asks for rep1's ownerId — service must ignore it and
    // scope to rep2's own id regardless (docs/02 lead.service.ts list()).
    const res = await rep2Api.get(`/api/leads?ownerId=${rep1Lead.ownerId}&pageSize=100`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const leakedLead = body.data.items.find((l: { id: string }) => l.id === rep1Lead.id);
    expect(leakedLead).toBeUndefined();

    await rep2Context.close();
  });

  test('Sales Rep cannot run, approve, or discard AI Copilot suggestions on a lead owned by another Sales Rep', async ({
    request,
    browser,
  }) => {
    await login(request, 'rep1@jenosize.demo');
    const company = await createCompany(request, `RBAC Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'RBAC Contact E');
    const lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    const rep2Context = await browser.newContext();
    const rep2Api = rep2Context.request;
    await login(rep2Api, 'rep2@jenosize.demo');

    const analysisRes = await rep2Api.post(`/api/leads/${lead.id}/ai-copilot`, { data: {} });
    expect(analysisRes.status()).toBe(403);

    // Owner (rep1) legitimately requests analysis, producing a real DRAFT suggestion...
    const ownerAnalysis = await request.post(`/api/leads/${lead.id}/ai-copilot`, { data: {} });
    expect(ownerAnalysis.ok()).toBeTruthy();
    const activityId = (await ownerAnalysis.json()).data.activityId as string;

    // ...which rep2 must not be able to approve (would send a real LINE message) or discard.
    const approveRes = await rep2Api.post(`/api/leads/${lead.id}/ai-copilot/${activityId}/approve`, { data: {} });
    expect(approveRes.status()).toBe(403);

    const discardRes = await rep2Api.post(`/api/leads/${lead.id}/ai-copilot/${activityId}/discard`, { data: {} });
    expect(discardRes.status()).toBe(403);

    await rep2Context.close();
  });

  test('WON is terminal: Sales Rep cannot reopen it, Admin can (BA §3.1)', async ({ request, browser }) => {
    await login(request, 'rep1@jenosize.demo');
    const company = await createCompany(request, `RBAC Co ${Date.now()}`);
    const contact = await createContact(request, company.id, 'RBAC Contact D');
    const lead = await createLead(request, { contactId: contact.id, companyId: company.id });

    const wonRes = await request.patch(`/api/leads/${lead.id}/stage`, { data: { toStage: 'WON' } });
    expect(wonRes.ok()).toBeTruthy();

    // Same Sales Rep (owner) cannot reopen their own WON lead.
    const reopenAttempt = await request.patch(`/api/leads/${lead.id}/stage`, { data: { toStage: 'QUALIFIED' } });
    expect(reopenAttempt.status()).toBe(409);

    // Admin can.
    const adminContext = await browser.newContext();
    const adminApi = adminContext.request;
    await login(adminApi, 'admin@jenosize.demo');
    const adminReopen = await adminApi.patch(`/api/leads/${lead.id}/stage`, { data: { toStage: 'QUALIFIED' } });
    expect(adminReopen.ok()).toBeTruthy();
    const body = await adminReopen.json();
    expect(body.data.stage).toBe('QUALIFIED');

    await adminContext.close();
  });
});
