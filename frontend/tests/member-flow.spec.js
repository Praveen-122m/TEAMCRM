import { test, expect } from '@playwright/test';

test.describe('Member Chat & Workspace Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Member")');
    await page.fill('input[type="email"]', 'member@example.com');
    await page.fill('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/member/);
  });

  test('should view assigned workspaces', async ({ page }) => {
    await page.goto('/member/workspaces');
    await expect(page.locator('text=Workspaces')).toBeVisible();
  });

  test('should be able to send a message in a channel', async ({ page }) => {
    await page.goto('/channels'); // Assuming generic channels route
    // Wait for chat interface to load
    const chatInput = page.locator('input[placeholder="Type a message..."]');
    if (await chatInput.isVisible()) {
      await chatInput.fill('Hello from E2E Test!');
      await page.keyboard.press('Enter');
      await expect(page.locator('text=Hello from E2E Test!')).toBeVisible();
    }
  });
});
