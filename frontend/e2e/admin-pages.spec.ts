import { test, expect } from '@playwright/test';

async function apiLogin(page: any, username: string, password: string) {
  const resp = await page.context().request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(resp.status()).toBe(200);
}

test.describe('Admin Overview', () => {
  test('overview page shows Raport Zilnic heading and KPI cards', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/overview');
    await expect(page.locator('h2', { hasText: 'Raport Zilnic' })).toBeVisible({ timeout: 10000 });
    // KPI cards use paragraph text
    await expect(page.locator('text=Incasari Azi')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Masini')).toBeVisible({ timeout: 5000 });
  });

  test('overview page shows Straulesti location in table', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/overview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=STRAULESTI')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin Clienti', () => {
  test('clienti page loads with search input and sort buttons', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/clienti');
    await page.waitForLoadState('networkidle');
    // Tab buttons and search input
    await expect(page.locator('button', { hasText: 'Clienti' }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Numar..."]')).toBeVisible({ timeout: 5000 });
    // Sort buttons
    await expect(page.locator('button', { hasText: 'Frecventa' })).toBeVisible({ timeout: 5000 });
  });

  test('searching for unknown plate shows no results message', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/clienti');
    await page.waitForLoadState('networkidle');
    await page.locator('input[placeholder="Numar..."]').fill('XYZNOTEXIST99');
    // Search triggers on input change (debounced) — wait for results
    await expect(page.locator('text=Niciun client gasit')).toBeVisible({ timeout: 8000 });
  });

  test('searching for known plate returns a result', async ({ page }) => {
    const api = page.context().request;

    await apiLogin(page, 'manager', 'mgrpass');
    const plate = 'E2ECLT' + Date.now().toString().slice(-4);
    await api.post('/api/manager/servicii', {
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

    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/clienti');
    await page.waitForLoadState('networkidle');
    await page.locator('input[placeholder="Numar..."]').fill(plate);
    await expect(page.locator(`text=${plate}`)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Admin Spalatori', () => {
  test('spalatori page shows heading and Performanta echipei', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/spalatori');
    await expect(page.locator('h2', { hasText: 'Spalatori' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Performanta echipei')).toBeVisible({ timeout: 5000 });
  });

  test('spalatori table has Spalator, Spalari, Comision columns', async ({ page }) => {
    await apiLogin(page, 'admin', 'adminpass');
    await page.goto('/admin/spalatori');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('th', { hasText: 'Spalator' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Spalari' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('th', { hasText: 'Comision' })).toBeVisible({ timeout: 5000 });
  });
});
