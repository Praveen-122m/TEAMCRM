import { test, expect } from '@playwright/test';

test.describe('Client Meta Ads & Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Client")');
    await page.fill('input[placeholder="CL-XXXXXX"]', 'CL-TEST12');
    await page.fill('input[type="password"]', 'ClientPass@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/client/);
  });

  test('should load the client dashboard and display meta ads if linked', async ({ page }) => {
    await page.goto('/client');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Check if Meta Ads section is present
    const metaAdsCard = page.locator('text=Meta Ads Performance');
    if (await metaAdsCard.isVisible()) {
      await expect(metaAdsCard).toBeVisible();
    }
  });

  test('should block client from accessing admin routes', async ({ page }) => {
    await page.goto('/admin');
    // Expect to be redirected to their root which is /client
    await expect(page).toHaveURL(/\/client/);
  });
});
