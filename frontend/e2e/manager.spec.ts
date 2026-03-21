import { test, expect } from '@playwright/test';

async function apiLogin(page: any, username: string, password: string) {
  const resp = await page.context().request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(resp.status()).toBe(200);
}

test.describe('Manager flow', () => {
  test('submit service form succeeds and shows success message', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');
    await page.goto('/manager/form');
    await page.waitForSelector('text=Spalare Simpla', { timeout: 10000 });

    const plate = 'E2E' + Date.now().toString().slice(-6);
    await page.locator('input[placeholder*="B123ABC"]').fill(plate);

    // Select brand via BrandPicker
    await page.locator('button', { hasText: 'Marca' }).or(page.locator('button .lucide-plus').first().locator('..')).click();
    // Wait for BrandPicker modal, search for BMW
    const brandSearch = page.locator('input[placeholder="Cauta marca..."]');
    await expect(brandSearch).toBeVisible({ timeout: 5000 });
    await brandSearch.fill('BMW');
    // Click the BMW brand logo image
    await page.locator('img[alt="BMW"]').first().click();
    // Confirm selection
    await page.locator('button', { hasText: 'Aplica' }).click();

    await page.locator('label', { hasText: 'Spalare Simpla' }).click();
    await page.locator('button', { hasText: 'Ion' }).click();

    // Accept required checkboxes (Termeni + GDPR for new clients)
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Serviciu inregistrat cu succes')).toBeVisible({ timeout: 8000 });
  });

  test('dashboard shows services or empty state', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');
    const plate = 'E2EDSH' + Date.now().toString().slice(-4);
    await page.context().request.post('/api/manager/servicii', {
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

    await page.goto('/manager/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2', { hasText: 'Spalari Azi' })).toBeVisible({ timeout: 8000 });
    await expect(page.locator(`text=${plate}`)).toBeVisible({ timeout: 5000 });
  });

  test('analytics page loads with payment breakdown', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');
    await page.context().request.post('/api/manager/servicii', {
      data: {
        date: new Date().toISOString(),
        numarAutoturism: 'E2EANL' + Date.now().toString().slice(-4),
        tipAutoturism: 'AUTOTURISM',
        marcaAutoturism: 'BMW',
        serviciiPrestate: ['Spalare Simpla'],
        spalator: 'Ion',
        tipPlata: 'CASH',
      },
    });

    await page.goto('/manager/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Total Incasat')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=CASH').first()).toBeVisible({ timeout: 5000 });
  });

  test('form autofills when entering an existing plate', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');

    const plate = 'E2EFIL' + Date.now().toString().slice(-4);
    await page.context().request.post('/api/manager/servicii', {
      data: {
        date: new Date().toISOString(),
        numarAutoturism: plate,
        tipAutoturism: 'SUV',
        marcaAutoturism: 'Audi',
        serviciiPrestate: ['Spalare Simpla'],
        spalator: 'Ion',
        tipPlata: 'CARD',
      },
    });

    await page.goto('/manager/form');
    await page.waitForSelector('text=Spalare Simpla', { timeout: 10000 });
    await page.locator('input[placeholder*="B123ABC"]').fill(plate);
    await expect(page.locator('text=1 vizit')).toBeVisible({ timeout: 8000 });
  });

  test('CURS payment converts to CASH from dashboard', async ({ page }) => {
    await apiLogin(page, 'manager', 'mgrpass');

    const plate = 'E2ECRS' + Date.now().toString().slice(-4);
    await page.context().request.post('/api/manager/servicii', {
      data: {
        date: new Date().toISOString(),
        numarAutoturism: plate,
        tipAutoturism: 'AUTOTURISM',
        marcaAutoturism: 'BMW',
        serviciiPrestate: ['Spalare Simpla'],
        spalator: 'Ion',
        tipPlata: 'CURS',
      },
    });

    await page.goto('/manager/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${plate}`)).toBeVisible({ timeout: 8000 });

    // CURS card shows inline payment buttons — click CASH to convert
    const cursCard = page.locator('.card', { hasText: plate });
    // Wait for API response after clicking CASH
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/manager/update-payment/') && resp.status() === 200),
      cursCard.locator('button', { hasText: /^CASH$/ }).click(),
    ]);

    // After refetch, card should show green CASH badge instead of yellow CURS
    await expect(cursCard.locator('.bg-green-100')).toBeVisible({ timeout: 8000 });
  });
});
