import { test, expect, type APIRequestContext } from '@playwright/test';

async function apiLogin(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(response.status()).toBe(200);
}

test.describe('Admin Overview', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'admin', 'adminpass');
  });

  test('overview page shows Raport Zilnic heading and table headers', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/overview');
    await expect(page.locator('text=Raport Zilnic')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('th', { hasText: 'Locatie' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Masini' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Incasari' })).toBeVisible({ timeout: 5000 });
  });

  test('overview page shows Straulesti location in table', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/overview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=STRAULESTI')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Clienti', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'admin', 'adminpass');
  });

  test('clienti page loads with search input and table headers', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/clienti');
    await expect(page.locator('h2', { hasText: 'Clienti' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Numar..."]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Masina' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Vizite' })).toBeVisible({ timeout: 5000 });
  });

  test('searching for unknown plate shows no results message', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/clienti');
    await page.locator('input[placeholder="Numar..."]').fill('XYZNOTEXIST99');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Niciun client gasit')).toBeVisible({ timeout: 8000 });
  });

  test('searching for known plate returns a result', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');

    // Create a service via API to ensure at least one client exists
    await apiLogin(request, 'manager', 'mgrpass');
    const plate = 'E2ECLT' + Date.now().toString().slice(-4);
    await request.post('/api/manager/servicii', {
      data: {
        date: new Date().toISOString(),
        numarAutoturism: plate,
        tipAutoturism: 'AUTOTURISM',
        marcaAutoturism: 'BMW',
        serviciiPrestate: ['Spalare Simpla'],
        spalator: 'Ion',
        tipPlata: 'CASH',
      },
    });

    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/clienti');
    await page.locator('input[placeholder="Numar..."]').fill(plate);
    await page.locator('button[type="submit"]').click();
    await expect(page.locator(`text=${plate}`)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Admin Spalatori', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'admin', 'adminpass');
  });

  test('spalatori page shows heading and Performanta echipei', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/spalatori');
    await expect(page.locator('h2', { hasText: 'Spalatori' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Performanta echipei')).toBeVisible({ timeout: 5000 });
  });

  test('spalatori table has Spalator, Spalari, Comision columns', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/spalatori');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('th', { hasText: 'Spalator' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Spalari' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Comision' })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Rapoarte', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'admin', 'adminpass');
  });

  test('rapoarte page loads with spalatori table', async ({ page, request }) => {
    await apiLogin(request, 'admin', 'adminpass');
    await page.goto('/admin/rapoarte');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('th', { hasText: 'Spalator' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('th', { hasText: 'Spalari' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Comision' })).toBeVisible({ timeout: 5000 });
  });
});
