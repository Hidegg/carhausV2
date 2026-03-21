import { test, expect } from '@playwright/test';

async function apiLogin(page: any, username: string, password: string) {
  const resp = await page.context().request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(resp.status()).toBe(200);
}

test.describe('Admin Settings', () => {
  test('create new location and verify it appears in the list', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/settings');
    await page.waitForSelector('text=Locatii', { timeout: 10000 });

    const locName = 'TestLoc' + Date.now().toString().slice(-5);
    await page.locator('input[placeholder="Nume locatie noua"]').fill(locName);
    await page.locator('button', { hasText: '+ Adauga' }).click();

    await expect(page.locator(`text=${locName.toUpperCase()}`)).toBeVisible({ timeout: 5000 });
  });

  test('create new manager account and verify it appears in manager list', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/settings');
    await page.waitForSelector('text=Manageri', { timeout: 10000 });

    await page.locator('button', { hasText: 'Manageri' }).click();
    await page.waitForLoadState('networkidle');

    const mgrUsername = 'e2emgr' + Date.now().toString().slice(-5);
    await page.locator('input[placeholder="Username"]').fill(mgrUsername);
    await page.locator('input[placeholder="Parola"]').fill('testpass123');

    await page.locator('button', { hasText: '+ Adauga' }).last().click();
    await expect(page.locator(`text=${mgrUsername}`)).toBeVisible({ timeout: 5000 });
  });

  test('edit a service price and verify save works', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    // Switch to Servicii & Preturi tab
    await page.locator('button', { hasText: 'Servicii & Preturi' }).click();

    // Wait for price table to render (has spinbutton inputs)
    const priceInput = page.locator('table input[type="number"]').first();
    await expect(priceInput).toBeVisible({ timeout: 10000 });

    // Change the price value
    await priceInput.click();
    await priceInput.fill('');
    await priceInput.type('99');

    // Salveaza Preturi button should appear
    await expect(page.locator('button', { hasText: 'Salveaza Preturi' })).toBeVisible({ timeout: 5000 });
    await page.locator('button', { hasText: 'Salveaza Preturi' }).click();

    // After save the button disappears
    await expect(page.locator('button', { hasText: 'Salveaza Preturi' })).not.toBeVisible({ timeout: 5000 });
  });

  test('add a new service type and verify it appears in the list', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    await page.locator('button', { hasText: 'Servicii & Preturi' }).click();
    await page.waitForLoadState('networkidle');

    const svcName = 'TestSvc' + Date.now().toString().slice(-5);
    await page.locator('input[placeholder="Nume serviciu nou"]').fill(svcName);
    await page.locator('button', { hasText: '+ Adauga' }).click();

    await expect(page.locator(`text=${svcName}`)).toBeVisible({ timeout: 5000 });
  });

  test('delete created location removes it from list', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    const api = page.context().request;

    const locName = 'DelLoc' + Date.now().toString().slice(-5);
    const createResp = await api.post('/api/admin/settings/locatie', {
      data: { numeLocatie: locName },
    });
    expect(createResp.status()).toBe(201);

    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    const upperName = locName.toUpperCase();
    await expect(page.locator(`text=${upperName}`)).toBeVisible({ timeout: 5000 });

    page.once('dialog', dialog => dialog.accept());

    const locRow = page.locator('.card', { hasText: upperName });
    await locRow.locator('button').click();

    await expect(page.locator(`text=${upperName}`)).not.toBeVisible({ timeout: 5000 });
  });
});
