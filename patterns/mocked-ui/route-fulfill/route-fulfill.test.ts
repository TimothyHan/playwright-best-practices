// 패턴 §7.1 — 라우트 인터셉션을 통한 백엔드 목킹 UI 테스트.
// 실제 백엔드가 원하는 시점에 만들어주지 않는 상태를 강제: 빈 목록, 에러.
// 로드 시 발생하는 요청은 page.goto 이전에 라우트를 등록할 것.
import { test, expect } from '@playwright/test';

test('빈 상태 — 빈 목록 목킹', async ({ page }) => {
  await page.route('**/api/items', (route) => route.fulfill({ json: { data: [] } }));

  await page.goto('/');

  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('items-table')).toBeHidden();
});

test('에러 상태 — 500 목킹', async ({ page }) => {
  await page.route('**/api/items', (route) =>
    route.fulfill({ status: 500, json: { message: 'boom' } }),
  );

  await page.goto('/');

  await expect(page.getByTestId('error-state')).toBeVisible();
  await expect(page.getByTestId('items-table')).toBeHidden();
});

test('결정적 데이터 — 픽스처 페이로드 목킹', async ({ page }) => {
  // 실제 프로젝트에서는 이 페이로드를 인라인 블롭이 아니라 이름 있는 픽스처 파일로 유지
  const fixture = {
    data: [
      { id: '1', name: 'Alpha', created_at: '2026-01-01T00:00:00Z' },
      { id: '2', name: 'Beta', created_at: '2026-01-02T00:00:00Z' },
    ],
  };
  await page.route('**/api/items', (route) => route.fulfill({ json: fixture }));

  await page.goto('/');

  await expect(page.getByTestId('item-row')).toHaveCount(2);
  await expect(page.getByTestId('item-row').first()).toContainText('Alpha');
});
