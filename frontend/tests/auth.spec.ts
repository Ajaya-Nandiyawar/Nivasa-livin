import { test, expect } from '@playwright/test';

test.describe('Authentication and Dashboard E2E', () => {
  test('should log in successfully and redirect to dashboard with KPI cards', async ({ page }) => {
    // Intercept backend login API request
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'fake-access-token-123456',
          user: {
            id: 'fake-user-id',
            email: 'admin@nivasalivin.com',
            fullName: 'Admin User',
            role: 'ADMIN',
          },
        }),
      });
    });

    // Intercept dashboard reports API requests
    await page.route('**/api/v1/reports/occupancy', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_beds: 100,
          occupied_beds: 85,
          occupancy_rate: 85.0,
        }),
      });
    });

    await page.route('**/api/v1/reports/outstanding', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          '0-7 days': 5000,
          '8-30 days': 12000,
          '31-60 days': 3000,
          '60+ days': 0,
        }),
      });
    });

    await page.route('**/api/v1/reports/revenue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { month: '2026-05', total_revenue: 150000 },
          { month: '2026-06', total_revenue: 165000 },
        ]),
      });
    });

    // Mock quick ledger/recent payments and maintenance tickets to avoid rendering empty component errors
    await page.route('**/api/v1/maintenance*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          page: 1,
          limit: 5,
        }),
      });
    });

    await page.route('**/api/v1/rent/due', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/rent*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to login page
    await page.goto('/login');

    // Fill credentials
    await page.fill('input[placeholder="admin@nivasalivin.com"]', 'admin@nivasalivin.com');
    await page.fill('input[type="password"]', 'password123');

    // Click sign in button
    await page.click('button[type="submit"]');

    // Wait for the URL to redirect to /dashboard
    await page.waitForURL('**/dashboard');

    // Assert that the KPI cards become visible
    await expect(page.locator('text="Total Active Tenants"').first()).toBeVisible();
    await expect(page.locator('text="Occupancy Rate"').first()).toBeVisible();
    await expect(page.locator('text="Rent Collected (MTD)"').first()).toBeVisible();
    await expect(page.locator('text="Outstanding Dues"').first()).toBeVisible();
  });
});
