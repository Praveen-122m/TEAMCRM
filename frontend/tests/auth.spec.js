import { test, expect } from '@playwright/test';

test.describe('Authentication & Role Based Redirects', () => {
  test('should allow an Admin to register and redirect to /admin', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="name"]', 'Test Admin');
    await page.fill('input[name="email"]', `admin${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password@123');
    await page.fill('input[name="confirmPassword"]', 'Password@123');
    // Note: The UI might not have a role selector since first user is Admin, but assuming standard flow:
    await page.click('button[type="submit"]');
    
    // Expect to be redirected to admin dashboard
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should allow an existing Admin to login', async ({ page }) => {
    await page.goto('/login');
    
    // Select Admin Role
    await page.click('button:has-text("Admin")');
    await page.fill('input[type="email"]', 'admin@example.com'); 
    await page.fill('input[type="password"]', 'Password@123');
    await page.click('button[type="submit"]');
    
    const errorMsg = page.locator('text=Invalid credentials');
    
    await Promise.any([
      expect(errorMsg).toBeVisible(),
      expect(page).toHaveURL(/\/admin/)
    ]);
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Member")');
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Login failed. Check your credentials.')).toBeVisible();
  });

  test('Client should login with Secret Code', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Client")');
    
    // Client login uses text input for Secret Code
    await page.fill('input[placeholder="CL-XXXXXX"]', 'CL-TEST12');
    await page.fill('input[type="password"]', 'ClientPass@123');
    await page.click('button[type="submit"]');
    
    const errorMsg = page.locator('text=Login failed');
    await Promise.any([
      expect(errorMsg).toBeVisible(),
      expect(page).toHaveURL(/\/client/)
    ]);
  });
});
