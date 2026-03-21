import { test, expect } from '@playwright/test';

async function fillLogin(page: any, username: string, password: string) {
  await page.locator('input[type="text"]').fill(username);
  await page.locator('input[type="password"]').fill(password);
  await page.click('button[type="submit"]');
}

test.describe('Authentication', () => {
  test('admin login redirects to /admin/overview', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'admin', 'adminpass');
    await expect(page).toHaveURL(/\/admin\/overview/, { timeout: 10000 });
  });

  test('manager login redirects to /manager/dashboard', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'manager', 'mgrpass');
    await expect(page).toHaveURL(/\/manager\/dashboard/, { timeout: 10000 });
  });

  test('dev login redirects to /dev/overview', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'dev', 'devpass');
    await expect(page).toHaveURL(/\/dev\/overview/, { timeout: 10000 });
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'admin', 'wrongpassword');
    const errorDiv = page.locator('.text-red-700, .text-red-300');
    await expect(errorDiv).toBeVisible({ timeout: 5000 });
    await expect(errorDiv).toContainText('incorecte');
  });

  test('logout redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'admin', 'adminpass');
    await expect(page).toHaveURL(/\/admin\/overview/, { timeout: 10000 });

    // On desktop, sidebar is always visible — click the logout button directly
    await page.locator('button[title="Logout"]').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
