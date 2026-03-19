import { test, expect, type APIRequestContext } from '@playwright/test';

async function apiLogin(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(response.status()).toBe(200);
}

test.describe('Admin Client Detail', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'admin', 'adminpass');
  });

  test('client detail page shows plate number and service history', async ({ page, request }) => {
    // Create a client with a known plate via API
    await apiLogin(request, 'manager', 'mgrpass');
    const plate = 'E2EHST' + Date.now().toString().slice(-4);
    const svcResp = await request.post('/api/manager/servicii', {
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
    expect(svcResp.status()).toBe(200);

    await apiLogin(request, 'admin', 'adminpass');
    await page.goto(`/admin/clienti/${plate}`);
    await page.waitForLoadState('networkidle');

    // The plate number should appear prominently
    await expect(page.locator(`text=${plate}`)).toBeVisible({ timeout: 10000 });
    // "Istoric servicii" section heading
    await expect(page.locator('text=Istoric servicii')).toBeVisible({ timeout: 8000 });
  });

  test('Inapoi button navigates back to clienti list', async ({ page, request }) => {
    await apiLogin(request, 'manager', 'mgrpass');
    const plate = 'E2EBK' + Date.now().toString().slice(-4);
    await request.post('/api/manager/servicii', {
      data: {
        date: new Date().toISOString(),
        numarAutoturism: plate,
        tipAutoturism: 'AUTOTURISM',
        marcaAutoturism: 'AUDI',
        serviciiPrestate: ['Spalare Simpla'],
        spalator: 'Ion',
        tipPlata: 'CASH',
      },
    });

    await apiLogin(request, 'admin', 'adminpass');
    await page.goto(`/admin/clienti/${plate}`);
    await page.waitForSelector('text=Inapoi', { timeout: 10000 });
    await page.locator('text=Inapoi').click();
    await expect(page).toHaveURL(/\/admin\/clienti/, { timeout: 5000 });
  });
});
