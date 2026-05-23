import { test, expect } from '@playwright/test';

test.describe('Admin Workspace Management Flow', () => {
  // Assume we have a helper to login as Admin
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Admin")');
    await page.fill('input[type="email"]', 'admin@example.com'); // Use a known seeded admin
    await page.fill('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should create a new office workspace', async ({ page }) => {
    await page.goto('/admin/office-workspaces');
    await page.click('button:has-text("Create Workspace")'); // Assuming a create button exists
    
    // Fill workspace modal
    await page.fill('input[name="name"]', 'New E2E Office');
    await page.fill('textarea[name="description"]', 'E2E Testing Workspace');
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=New E2E Office')).toBeVisible();
  });

  test('should navigate to client workspaces and view details', async ({ page }) => {
    await page.goto('/admin/client-workspaces');
    // Click on the first workspace card
    const firstWorkspace = page.locator('.glass-panel').first();
    if (await firstWorkspace.isVisible()) {
      await firstWorkspace.click();
      await expect(page).toHaveURL(/\/admin\/client-workspaces\/.+/);
      await expect(page.locator('text=Team Chat')).toBeVisible();
    }
  });
});
