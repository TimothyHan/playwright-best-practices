// 패턴 §2.4 — 컴포넌트 객체 동작: 스펙은 페이지 객체에게 말하고,
// 페이지 객체는 테이블 메커니즘을 dataTable 컴포넌트에 위임하며,
// 행은 셀 인덱스가 아니라 컬럼 헤더("Name", "Created")를 키로 돌아옵니다.
import { test, expect } from '@playwright/test';
import { itemsPage } from './items-page.js';
import { dataTable } from './data-table.js';

test('컴포넌트를 통해 테이블을 파싱하고 인터랙션한다', async ({ page }) => {
  const name = `component-demo-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`;
  await page.goto('/');

  await itemsPage.addItem(page, name);

  // 헤더 키 행: 인덱스 기반 파싱과 달리 컬럼 순서가 바뀌어도 생존
  const table = await itemsPage.parseTable(page);
  expect(table).toContainEqual(expect.objectContaining({ Name: name }));

  await itemsPage.deleteItemByName(page, name);
  await expect(
    itemsPage.locators.table(page).getByRole('row').filter({ has: page.getByText(name, { exact: true }) }),
  ).toHaveCount(0);
});

test('일치하는 행이 없으면 행 탐색은 크게 실패한다', async ({ page }) => {
  const name = `component-guard-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`;
  await page.goto('/');
  await itemsPage.addItem(page, name);

  await expect(
    dataTable.rowByValue(itemsPage.locators.table(page), 'Name', 'does-not-exist'),
  ).rejects.toThrow(/행이 없습니다/);

  // 정리
  await itemsPage.deleteItemByName(page, name);
});
