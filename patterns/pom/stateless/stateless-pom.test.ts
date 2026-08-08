// 패턴 §2.1/§2.5 — 무상태 POM으로 작성한 스펙:
// 의도만 담고, 셀렉터나 메커니즘은 담지 않음 (§1 기본원칙).
import { test, expect } from '@playwright/test';
import { itemsPage } from './items-page.js';

test('UI로 아이템을 추가하고 삭제한다', async ({ page }) => {
  const name = `pom-demo-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`;
  await page.goto('/');

  await itemsPage.addItem(page, name);

  // 로케이터가 export되어 있어 스펙에서 auto-retry 단언을 직접 조합
  await expect(itemsPage.locators.itemRows(page).filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(1);

  // 행/열 텍스트 탐색이 아니라 파싱된 데이터에 대해 단언.
  // expect.poll: 파싱은 일회성 스냅샷이라 auto-retry가 없다 — 공유 테이블이
  // 동시 실행으로 출렁일 때(다른 워커의 행이 렌더 중일 때) 재시도가 필요.
  await expect
    .poll(async () => itemsPage.parseTable(page))
    .toContainEqual(expect.objectContaining({ name }));

  await itemsPage.deleteItemByName(page, name);
  await expect(itemsPage.locators.itemRows(page).filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(0);
});

test('없는 아이템 삭제는 조용히 넘어가지 않고 크게 실패한다', async ({ page }) => {
  await page.goto('/');
  await itemsPage.addItem(page, `pom-guard-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`);

  // §6.4 — nth(-1)이 엉뚱한 행을 클릭하는 대신 가드가 throw
  await expect(itemsPage.deleteItemByName(page, 'does-not-exist')).rejects.toThrow(/아이템 행이 없습니다/);
});
