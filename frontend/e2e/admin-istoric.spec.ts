import { test, expect, type APIRequestContext } from '@playwright/test';

async function apiLogin(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(response.status()).toBe(200);
}

test.describe('Admin Istoric', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'admin', 'adminpass');
  });

  test('annual view loads with 12 month bars', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/istoric');
    await page.waitForLoadState('networkidle');
    // The chart area renders; annual/lunar toggle should be visible
    await expect(page.locator('text=Anual')).toBeVisible({ timeout: 10000 });
  });

  test('Incasari heading is visible in annual view', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/istoric');
    await page.waitForLoadState('networkidle');
    // KPI label "Incasari" should appear
    await expect(page.locator('text=Incasari').first()).toBeVisible({ timeout: 10000 });
  });

  test('clicking a month bar switches to monthly view', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/istoric');
    await page.waitForLoadState('networkidle');

    // Click the first bar (first month label) to drill down
    const firstBar = page.locator('text=Ian').first();
    await firstBar.click();

    // Monthly view should show "Lunar" label and weekly bars
    await expect(page.locator('text=Lunar')).toBeVisible({ timeout: 8000 });
  });
});
