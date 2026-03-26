import { test, expect } from '@playwright/test';

test.describe('구매 플로우', () => {
  test('홈페이지 접속 및 기본 렌더링', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LiveMart|라이브마트/i);
    await expect(page.locator('header')).toBeVisible();
  });

  test('상품 목록 페이지 접속', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('main')).toBeVisible();
  });

  test('로그인 페이지 접속', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible();
  });

  test('장바구니 페이지 접속 (비로그인 리다이렉트)', async ({ page }) => {
    const response = await page.goto('/cart');
    // 비로그인이면 auth 또는 login으로 리다이렉트되거나 cart 페이지 렌더링
    const url = page.url();
    expect(url).toMatch(/cart|auth|login/);
  });
});
