import { test, expect } from '@playwright/test';

async function apiLogin(page: any, username: string, password: string) {
  const resp = await page.context().request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(resp.status()).toBe(200);
}

test.describe('Dev Overview', () => {
  test('overview page shows System Overview heading and Conturi Sistem', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/overview');
    await expect(page.locator('h2', { hasText: 'System Overview' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Conturi Sistem')).toBeVisible({ timeout: 5000 });
  });

  test('overview page shows all-time stats cards', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/overview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Total Spalari')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Total Incasari')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Clienti')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dev Accounts', () => {
  test('accounts page shows Conturi heading and user list', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/accounts');
    await expect(page.locator('h2', { hasText: 'Conturi' })).toBeVisible({ timeout: 10000 });
    // "Cont nou" button is visible
    await expect(page.locator('button', { hasText: 'Cont nou' })).toBeVisible({ timeout: 5000 });
  });

  test('accounts page lists existing users', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/accounts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=admin').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=manager').first()).toBeVisible({ timeout: 5000 });
  });

  test('creating a new account adds it to the list', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/accounts');
    await page.waitForLoadState('networkidle');

    // Click "Cont nou" to open the add form
    await page.locator('button', { hasText: 'Cont nou' }).click();

    const username = 'e2edev' + Date.now().toString().slice(-5);
    await page.locator('input[placeholder="username"]').fill(username);
    await page.locator('input[placeholder="••••••••"]').fill('testpass123');

    // Save button
    await page.locator('button', { hasText: 'Salveaza' }).click();

    await expect(page.locator(`text=${username}`)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Dev Clients', () => {
  test('clients page shows Clienti heading and search input', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/clients');
    await expect(page.locator('h2', { hasText: 'Clienti' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Cauta dupa numar auto..."]')).toBeVisible({ timeout: 5000 });
  });

  test('searching for unknown plate shows empty state', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/clients');
    await page.locator('input[placeholder="Cauta dupa numar auto..."]').fill('XYZNOTEXIST99');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Niciun client gasit')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Dev System', () => {
  test('system page shows System heading and Baza de Date section', async ({ page }) => {
    await apiLogin(page, 'dev', 'devpass');
    await page.goto('/dev/system');
    await expect(page.locator('h2', { hasText: 'System' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h3', { hasText: 'Baza de Date' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3', { hasText: 'Backup-uri' })).toBeVisible({ timeout: 5000 });
  });
});
