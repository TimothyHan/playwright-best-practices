// 패턴 §7 — 테스트 계정 하나로 역할별 UI 테스트.
// 이 데모 사용자에 대해 백엔드는 항상 admin으로 응답합니다. 역할마다
// 계정을 프로비저닝하는 대신, 각 테스트가 프로필 응답(/api/me)을 목킹해
// 필요한 역할로 UI를 렌더링합니다. 나머지 백엔드는 실제 그대로 —
// 역할만 강제됩니다.
import { test, expect } from '@playwright/test';

test('admin은 행 액션을 본다 (실제 프로필, 목킹 없음)', async ({ page, request }) => {
  const name = `role-admin-${Date.now()}`;
  const created = await request.post('/api/items', { data: { name } });
  const { id } = await created.json();

  await page.goto('/');

  await expect(page.getByTestId('user-role')).toHaveText('demo-user (admin)');
  await expect(
    page.getByTestId('item-row').filter({ hasText: name }).getByTestId('delete-button'),
  ).toBeVisible();

  await request.delete(`/api/items/${id}`);
});

test('viewer는 같은 데이터를 액션 없이 본다 (프로필 목킹)', async ({ page, request }) => {
  const name = `role-viewer-${Date.now()}`;
  const created = await request.post('/api/items', { data: { name } });
  const { id } = await created.json();

  // viewer 역할 강제 — goto 이전에 등록 (§7.1 구현 규칙)
  await page.route('**/api/me', (route) =>
    route.fulfill({ json: { user: 'view-only', role: 'viewer' } }),
  );

  await page.goto('/');

  await expect(page.getByTestId('user-role')).toHaveText('view-only (viewer)');
  // 행은 렌더링되지만 admin 전용 액션은 렌더링되지 않음
  const row = page.getByTestId('item-row').filter({ hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('delete-button')).toHaveCount(0);

  await request.delete(`/api/items/${id}`);
});
