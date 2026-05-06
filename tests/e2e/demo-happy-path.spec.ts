import { expect, test } from '@playwright/test';

test('fixture-mode demo happy path', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Server Test Console' })).toBeVisible();
  await page.getByRole('button', { name: /Connect \/ Save/i }).click();
  await page.getByRole('button', { name: /Check Again/i }).click();
  await expect(page.locator('.toast')).toContainText(/CapabilityStatement loaded/i);
  await page.getByRole('button', { name: /^Search$/i }).click();
  await expect(page.getByText('John Doe')).toBeVisible();
  await page.getByLabel('Main').getByRole('button', { name: 'Implementation Guides' }).click();
  await page.getByRole('button', { name: /Refresh Status/i }).click();
  await expect(page.getByText(/Installed|Available to Install/).first()).toBeVisible();
  await page.getByRole('button', { name: /View Details/i }).first().click();
  await expect(page.getByText(/Browser-only behavior/i)).toBeVisible();
});
