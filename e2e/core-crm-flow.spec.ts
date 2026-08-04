import { test, expect } from '@playwright/test';
import { DEMO_PASSWORD } from './utils/api';

/**
 * E2E-01 (docs/03-PROJECT-PLAN-PM.md §2.1) — Core CRM flow: login, create a
 * lead through the real UI (contact search + create), move it through the
 * pipeline, confirm the change survives a reload (US-07), and confirm an
 * AuditLog row was written for the stage change (DP-01/DP-02, US-16).
 */
test('login, create lead, transition stage, survives reload, and is audit-logged', async ({ page }) => {
  await page.goto('/login');
  // Wait past initial hydration before interacting — a click that lands
  // before the client component attaches its handler would fall through
  // to a native (unhandled) form submit instead of the fetch-based login.
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill('admin@jenosize.demo');
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  const [loginResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/auth/login') && res.request().method() === 'POST'),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
  expect(loginResponse.ok()).toBeTruthy();
  // Generous timeouts on post-submit navigations: against a deployed target
  // (cold Vercel function + cold Neon connection) a round trip can run well
  // past Playwright's 5s default, even though the flow itself is correct.
  await expect(page).toHaveURL(/\/leads$/, { timeout: 15_000 });

  await page.getByRole('link', { name: '+ New Lead' }).click();
  await expect(page).toHaveURL(/\/leads\/new$/, { timeout: 15_000 });

  await page.getByPlaceholder('Search contact by name…').fill('a');
  const firstResult = page.locator('ul button').first();
  await expect(firstResult).toBeVisible({ timeout: 10_000 });
  await firstResult.click();

  await page.getByRole('button', { name: 'Create Lead' }).click();
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}$/, { timeout: 15_000 });

  const leadId = page.url().split('/leads/')[1];

  // US-04: move NEW -> QUALIFIED
  await page.getByRole('button', { name: 'QUALIFIED', exact: true }).click();
  await expect(page.getByRole('button', { name: 'QUALIFIED', exact: true })).toBeDisabled({ timeout: 15_000 });

  // US-07: durability across reload
  await page.reload();
  await expect(page.getByRole('button', { name: 'QUALIFIED', exact: true })).toBeDisabled({ timeout: 15_000 });

  // US-16 / DP-01 / DP-02: the stage change produced an audit row
  const auditRes = await page.request.get(`/api/audit-logs?resource=Lead&pageSize=10`);
  expect(auditRes.ok()).toBeTruthy();
  const auditBody = await auditRes.json();
  const stageChangeEntry = auditBody.data.items.find(
    (entry: { resourceId: string; action: string }) => entry.resourceId === leadId && entry.action === 'UPDATE'
  );
  expect(stageChangeEntry).toBeTruthy();
  expect(stageChangeEntry.status).toBe('SUCCESS');
});
