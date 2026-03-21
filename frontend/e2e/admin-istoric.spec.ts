import { test, expect } from '@playwright/test';

async function apiLogin(page: any, username: string, password: string) {
  const resp = await page.context().request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(resp.status()).toBe(200);
}

test.describe('Admin Istoric', () => {
  test('istoric page loads with Curent and Istoric view toggles', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/istoric');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button', { hasText: 'Curent' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button', { hasText: 'Istoric' })).toBeVisible({ timeout: 5000 });
  });

  test('Incasari label is visible in current view', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/istoric');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Incasari').first()).toBeVisible({ timeout: 10000 });
  });

  test('switching to Istoric view shows annual chart with Anual label', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/istoric');
    await page.waitForLoadState('networkidle');

    // Click the "Istoric" tab to switch views
    await page.locator('button', { hasText: 'Istoric' }).click();
    await expect(page.locator('text=Anual')).toBeVisible({ timeout: 8000 });
  });

  test('CSV export downloads a file', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/istoric');
    await page.waitForLoadState('networkidle');

    // Switch to Istoric view first (CSV is in Istoric view)
    await page.locator('button', { hasText: 'Istoric' }).click();
    await expect(page.locator('text=Anual')).toBeVisible({ timeout: 8000 });

    // Listen for download event
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.locator('button', { hasText: 'CSV' }).click(),
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toContain('.csv');
  });
});
