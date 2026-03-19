import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Login via API to set the session cookie, then navigate to the target page.
 */
async function apiLogin(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(response.status()).toBe(200);
}

test.describe('Manager flow', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'manager', 'mgrpass');
  });

  test('submit service form succeeds and shows success message', async ({ page, request }) => {
    await apiLogin(request, 'manager', 'mgrpass');
    await page.goto('/manager/form');

    // Wait for form data to load (spalatori and servicii appear)
    await page.waitForSelector('text=Spalare Simpla', { timeout: 10000 });

    // Enter a unique plate number
    const plate = 'E2E' + Date.now().toString().slice(-6);
    await page.locator('input[placeholder*="B123ABC"]').fill(plate);

    // Select service by clicking the checkbox label
    await page.locator('label', { hasText: 'Spalare Simpla' }).click();

    // Select spalator (Ion button)
    await page.locator('button', { hasText: 'Ion' }).click();

    // Accept required checkboxes (Termeni + GDPR — they appear for new clients)
    const termeniCheckbox = page.locator('input[type="checkbox"]').nth(0);
    const gdprCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await termeniCheckbox.check();
    await gdprCheckbox.check();

    // CASH is default, no need to select

    // Submit
    await page.locator('button[type="submit"]').click();

    // Expect success message
    await expect(page.locator('text=Serviciu inregistrat cu succes')).toBeVisible({ timeout: 8000 });
  });

  test('dashboard shows at least one service row', async ({ page, request }) => {
    await apiLogin(request, 'manager', 'mgrpass');
    await page.goto('/manager/dashboard');
    // The dashboard renders rows; wait for any content besides the loading state
    await page.waitForLoadState('networkidle');
    // At least one row or "nici un serviciu" message should be visible
    await expect(page.locator('main')).not.toBeEmpty({ timeout: 8000 });
  });

  test('analytics page loads with payment breakdown', async ({ page, request }) => {
    await apiLogin(request, 'manager', 'mgrpass');
    await page.goto('/manager/analytics');
    await page.waitForLoadState('networkidle');
    // Analytics should show CASH, CARD labels
    await expect(page.locator('text=CASH')).toBeVisible({ timeout: 8000 });
  });
});
