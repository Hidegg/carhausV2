import { test, expect, type APIRequestContext } from '@playwright/test';

async function apiLogin(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/auth/login', {
    data: { username, password },
  });
  expect(response.status()).toBe(200);
}

test.describe('Dev Overview', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'dev', 'devpass');
  });

  test('overview page shows System Overview heading and Conturi Sistem', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/overview');
    await expect(page.locator('h2', { hasText: 'System Overview' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Conturi Sistem')).toBeVisible({ timeout: 5000 });
  });

  test('overview page shows all-time stats cards', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/overview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Total Spalari')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Total Incasari')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Clienti')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Dev Accounts', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'dev', 'devpass');
  });

  test('accounts page shows Conturi heading and username input', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/accounts');
    await expect(page.locator('h2', { hasText: 'Conturi' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="username"]')).toBeVisible({ timeout: 5000 });
  });

  test('accounts page lists existing users', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/accounts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=admin')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=manager')).toBeVisible({ timeout: 5000 });
  });

  test('creating a new account adds it to the list', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/accounts');
    await page.waitForSelector('input[placeholder="username"]', { timeout: 10000 });

    const username = 'e2edev' + Date.now().toString().slice(-5);
    await page.locator('input[placeholder="username"]').fill(username);
    await page.locator('input[placeholder="••••••••"]').fill('testpass123');
    // Role defaults to manager; click the add button
    await page.locator('button', { hasText: /^\+$/ }).click();

    await expect(page.locator(`text=${username}`)).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Dev Clients', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'dev', 'devpass');
  });

  test('clients page shows Clienti heading and search input', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/clients');
    await expect(page.locator('h2', { hasText: 'Clienti' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[placeholder="Cauta dupa numar auto..."]')).toBeVisible({ timeout: 5000 });
  });

  test('searching for unknown plate shows empty state', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/clients');
    await page.locator('input[placeholder="Cauta dupa numar auto..."]').fill('XYZNOTEXIST99');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Niciun client gasit')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Dev System', () => {
  test.beforeEach(async ({ request }) => {
    await apiLogin(request, 'dev', 'devpass');
  });

  test('system page shows System heading, Baza de Date, and Mediu sections', async ({ page, request }) => {
    await apiLogin(request, 'dev', 'devpass');
    await page.goto('/dev/system');
    await expect(page.locator('h2', { hasText: 'System' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Baza de Date')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mediu')).toBeVisible({ timeout: 5000 });
  });
});
