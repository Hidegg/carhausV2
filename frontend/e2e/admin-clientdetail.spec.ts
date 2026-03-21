import { test, expect } from '@playwright/test';

async function apiLogin(page: any, username: string, password: string) {
  const resp = await page.context().request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(resp.status()).toBe(200);
}

test.describe('Admin Client Detail', () => {
  test('client detail page shows plate number and service history', async ({ page }) => {
    const api = page.context().request;

    // Create a client with a known plate via API
    await apiLogin(page, 'manager', 'mgrpass');
    const plate = 'E2EHST' + Date.now().toString().slice(-4);
    const svcResp = await api.post('/api/manager/servicii', {
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

    await apiLogin(page, 'admin', 'adminpass');
    await page.goto(`/admin/clienti/${plate}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator(`text=${plate}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Istoric servicii')).toBeVisible({ timeout: 8000 });
  });

  test('Inapoi button navigates back to clienti list', async ({ page }) => {
    const api = page.context().request;

    await apiLogin(page, 'manager', 'mgrpass');
    const plate = 'E2EBK' + Date.now().toString().slice(-4);
    await api.post('/api/manager/servicii', {
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

    await apiLogin(page, 'admin', 'adminpass');
    // Visit clienti page first so navigate(-1) has somewhere to go back to
    await page.goto('/admin/clienti');
    await page.waitForLoadState('networkidle');
    await page.goto(`/admin/clienti/${plate}`);
    await page.waitForSelector('text=Inapoi', { timeout: 10000 });
    await page.locator('text=Inapoi').click();
    // Should navigate back to the clienti list (not the detail page)
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(new RegExp(plate), { timeout: 5000 });
  });
});
