// 패턴 §2.2 — 클래스 기반 POM 스펙. 생성 절차에 주목:
// 모든 테스트가 직접 페이지 객체를 생성합니다 (`new ItemsPage(page)`).
// 이 테스트당 `new`가 바로 §2.3(Fixture 주입 POM)이 제거하는 부분입니다.
import { test, expect } from '@playwright/test';
import { ItemsPage } from './items-page.js';

test('클래스 기반 POM으로 아이템을 추가하고 삭제한다', async ({ page }) => {
  const itemsPage = new ItemsPage(page); // 테스트마다 생성
  const name = `class-pom-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`;

  await itemsPage.goto();
  await expect(itemsPage.heading()).toHaveText('Item Catalog'); // BasePage에서 상속

  await itemsPage.addItem(name);
  await expect(itemsPage.itemRows().filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(1);

  await itemsPage.deleteItemByName(name);
  await expect(itemsPage.itemRows().filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(0);
});

test('없는 아이템 삭제는 크게 실패한다', async ({ page }) => {
  const itemsPage = new ItemsPage(page);
  await itemsPage.goto();

  await expect(itemsPage.deleteItemByName('does-not-exist')).rejects.toThrow(/아이템 행이 없습니다/);
});
