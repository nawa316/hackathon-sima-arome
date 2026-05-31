import { test, expect } from '@playwright/test';

test.describe('Raw Material Intake Module Gating E2E Tests', () => {

  test('should redirect unauthenticated traffic from raw-materials to login page', async ({ page }) => {
    // Attempt to access the raw-materials dashboard page directly
    await page.goto('/dashboard/raw-materials-module');

    // Should redirect to /login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');

    // Verify login heading is visible
    const systemSubheader = page.locator('text=Sign in to access your dashboard');
    await expect(systemSubheader).toBeVisible();
  });

  test('should redirect unauthenticated traffic from supplier management to login page', async ({ page }) => {
    await page.goto('/dashboard/raw-materials-module/supplier');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('should redirect unauthenticated traffic from AHP evaluation to login page', async ({ page }) => {
    await page.goto('/dashboard/raw-materials-module/evaluation');
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

});
