import { test, expect } from "@playwright/test";

test.describe("Sima Arôme SCM Smoke Test", () => {
  test("should load the login page with redirect", async ({ page }) => {
    // Visit the home page (which redirects to /login)
    await page.goto("/");

    // Verify the Sima Arôme Logo image is visible
    const logo = page.locator("img[alt='Sima Arôme Logo']");
    await expect(logo).toBeVisible();

    // Verify sub-heading text is visible
    const systemSubheader = page.locator("text=Sign in to access your dashboard");
    await expect(systemSubheader).toBeVisible();

    // Verify the email field of the login form is present
    const emailInput = page.getByRole("textbox", { name: "Email" });
    await expect(emailInput).toBeVisible();
  });
});
