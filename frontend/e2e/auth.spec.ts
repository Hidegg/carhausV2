import { test, expect } from '@playwright/test';

/**
 * Helper: fill the login form and submit.
 * The Login page has `type="text"` for username and `type="password"` for password,
 * with no name attributes — we select by input type order.
 */
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

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'admin', 'wrongpassword');
    // Error div appears below the button when login fails
    const errorDiv = page.locator('.text-red-700, .text-red-300');
    await expect(errorDiv).toBeVisible({ timeout: 5000 });
    await expect(errorDiv).toContainText('incorecte');
  });

  test('logout redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await fillLogin(page, 'admin', 'adminpass');
    await expect(page).toHaveURL(/\/admin\/overview/, { timeout: 10000 });

    // Open sidebar via hamburger menu button
    await page.locator('nav button').first().click();
    // Click the logout button (has title="Logout")
    await page.locator('button[title="Logout"]').click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
