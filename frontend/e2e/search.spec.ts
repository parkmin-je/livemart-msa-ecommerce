import { test, expect } from '@playwright/test';

test.describe('검색 기능', () => {
  test('검색 결과 페이지 접속', async ({ page }) => {
    await page.goto('/search?q=갤럭시');
    await expect(page.locator('main')).toBeVisible();
  });

  test('빈 검색어 처리', async ({ page }) => {
    await page.goto('/search?q=');
    await expect(page.locator('main')).toBeVisible();
  });
});
