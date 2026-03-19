import { test, expect, type APIRequestContext } from '@playwright/test';

async function apiLogin(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(response.status()).toBe(200);
}

test.describe('Admin Settings', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'admin', 'adminpass');
  });

  test('create new location and verify it appears in the list', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/settings');

    // Wait for the Locatii tab content to load
    await page.waitForSelector('text=Locatii', { timeout: 10000 });

    // Generate a unique location name
    const locName = 'TestLoc' + Date.now().toString().slice(-5);

    // Fill the "Nume locatie noua" input and click + Adauga
    await page.locator('input[placeholder="Nume locatie noua"]').fill(locName);
    await page.locator('button', { hasText: '+ Adauga' }).click();

    // The name is stored uppercased
    await expect(page.locator(`text=${locName.toUpperCase()}`)).toBeVisible({ timeout: 5000 });
  });

  test('create new manager account and verify it appears in manager list', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/settings');
    await page.waitForSelector('text=Manageri', { timeout: 10000 });

    // Switch to Manageri tab
    await page.locator('button', { hasText: 'Manageri' }).click();
    await page.waitForLoadState('networkidle');

    const mgrUsername = 'e2emgr' + Date.now().toString().slice(-5);

    // Fill the "Manager nou" form
    await page.locator('input[placeholder="Username"]').fill(mgrUsername);
    await page.locator('input[placeholder="Parola"]').fill('testpass123');

    // Click + Adauga for manager
    await page.locator('button', { hasText: '+ Adauga' }).last().click();

    // The new manager should appear in the list
    await expect(page.locator(`text=${mgrUsername}`)).toBeVisible({ timeout: 5000 });
  });

  test('edit a service price and verify new value is shown', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/settings');
    await page.waitForSelector('text=Servicii & Preturi', { timeout: 10000 });

    // Switch to Servicii & Preturi tab
    await page.locator('button', { hasText: 'Servicii & Preturi' }).click();
    await page.waitForLoadState('networkidle');

    // Find the first pretAutoturism input in the table and change its value
    const priceInput = page.locator('table input[type="number"]').first();
    await priceInput.tripleClick();
    await priceInput.fill('99');

    // A "Salveaza Preturi" button should appear
    await expect(page.locator('button', { hasText: 'Salveaza Preturi' })).toBeVisible({ timeout: 3000 });
    await page.locator('button', { hasText: 'Salveaza Preturi' }).click();

    // After save the button disappears (preturiDirty = false)
    await expect(page.locator('button', { hasText: 'Salveaza Preturi' })).not.toBeVisible({ timeout: 5000 });
  });

  test('add a new service type and verify it appears in the list', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/settings');
    await page.waitForSelector('text=Servicii & Preturi', { timeout: 10000 });

    // Switch to Servicii & Preturi tab
    await page.locator('button', { hasText: 'Servicii & Preturi' }).click();
    await page.waitForLoadState('networkidle');

    const svcName = 'TestSvc' + Date.now().toString().slice(-5);
    await page.locator('input[placeholder="Nume serviciu nou"]').fill(svcName);
    await page.locator('button', { hasText: '+ Adauga' }).click();

    // New service should appear in the table
    await expect(page.locator(`text=${svcName}`)).toBeVisible({ timeout: 5000 });
  });

  test('delete created location removes it from list', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');

    // First create via API to get a clean target
    const locName = 'DelLoc' + Date.now().toString().slice(-5);
    const createResp = await request.post('/api/admin/settings/locatie', {
      data: { numeLocatie: locName },
    });
    expect(createResp.status()).toBe(201);

    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    // The location name is stored uppercase
    const upperName = locName.toUpperCase();
    await expect(page.locator(`text=${upperName}`)).toBeVisible({ timeout: 5000 });

    // Set up dialog handler to confirm the deletion
    page.once('dialog', dialog => dialog.accept());

    // Click the trash icon next to our location
    const locRow = page.locator('.card', { hasText: upperName });
    await locRow.locator('button').click();

    // Location should disappear
    await expect(page.locator(`text=${upperName}`)).not.toBeVisible({ timeout: 5000 });
  });
});
