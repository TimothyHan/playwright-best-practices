// 패턴 §6.1 — 네트워크 인지 동기화.
// 비동기 fetch를 유발하는 액션: response를 기다린 뒤, 렌더된 요소를
// 기다립니다. response만으로는 렌더가 보장되지 않습니다.
// 순서가 중요: waitForResponse 프로미스를 클릭 **이전에** 생성할 것.
import { test, expect } from '@playwright/test';

test('변경 액션 후 response 대기 + 렌더 대기', async ({ page }) => {
  const name = `sync-demo-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`;
  await page.goto('/');

  // 1. 액션을 유발하기 전에 response 리스너를 먼저 장전
  const listRefetch = page.waitForResponse(
    (response) => response.url().includes('/api/items') && response.request().method() === 'GET',
  );

  // 2. 유발: POST 후 앱이 목록을 다시 fetch
  await page.getByTestId('name-input').fill(name);
  await page.getByTestId('add-button').click();

  // 3. response 수신 완료…
  await listRefetch;

  // 4. …하지만 response ≠ render: DOM에 실제로 표시될 때까지 대기
  await expect(page.getByTestId('item-row').filter({ has: page.getByText(name, { exact: true }) })).toBeVisible();

  // 공유 앱을 깨끗하게 유지하기 위해 UI로 정리
  await page
    .getByTestId('item-row')
    .filter({ has: page.getByText(name, { exact: true }) })
    .getByTestId('delete-button')
    .click();
  await expect(page.getByTestId('item-row').filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(0);
});
