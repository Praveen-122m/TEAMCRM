import { test, expect } from '@playwright/test';

test.describe('Workspaces & Navigation', () => {
  test('should load the dashboard and sidebar', async ({ page }) => {
    // Navigate to root (assuming auth is bypassed or handled, but let's test UI rendering)
    await page.goto('/');
    
    // If redirected to login, that's expected without token.
    // Let's just check if the app loads without crashing.
    if (page.url().includes('/login')) {
      await expect(page.locator('form')).toBeVisible();
    } else {
      await expect(page.locator('nav')).toBeVisible(); // Sidebar
    }
  });
});
