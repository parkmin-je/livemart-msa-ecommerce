import { test, expect } from '@playwright/test';

test.describe('관리자 페이지', () => {
  test('관리자 로그인 페이지 접속', async ({ page }) => {
    await page.goto('/admin');
    // 비로그인이면 리다이렉트, 로그인 페이지이면 form 노출
    const url = page.url();
    expect(url).toMatch(/admin|auth|login/);
  });
});
