import { test, expect } from '@playwright/test';

async function apiLogin(page: any, username: string, password: string) {
  const resp = await page.context().request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(resp.status()).toBe(200);
}

test.describe('Manager Echipa', () => {
  test('echipa page shows Echipa mea heading and spalator input', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');
    await page.goto('/manager/echipa');
    await expect(page.locator('h2', { hasText: 'Echipa mea' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Nume spalator"]')).toBeVisible({ timeout: 5000 });
  });

  test('Ion spalator appears in the echipa list', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');
    await page.goto('/manager/echipa');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Ion')).toBeVisible({ timeout: 8000 });
  });

  test('adding a new spalator shows them in the list', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');
    await page.goto('/manager/echipa');
    await page.waitForSelector('input[placeholder="Nume spalator"]', { timeout: 10000 });

    const name = 'TestSp' + Date.now().toString().slice(-5);
    await page.locator('input[placeholder="Nume spalator"]').fill(name);
    // The add button is "+ Adauga", not a submit button
    await page.locator('button', { hasText: '+ Adauga' }).click();

    await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 8000 });
  });
});
