// 패턴 §2.3 — Fixture 주입 POM 스펙: 세 가지 POM 스타일 중 가장 깔끔한
// 시그니처. pom/class-based/class-pom.test.ts와 비교해 보세요 —
// 여기엔 `new ItemsPage(page)`가 없습니다. fixture가 대신 해줬습니다.
// 비용: 이 스펙의 import가 어떤 페이지 객체를 쓰는지 더 이상 보여주지 않음.
import { test, expect } from './fixture.js';

test('주입된 페이지 객체로 아이템을 추가하고 삭제한다', async ({ itemsPage, page }) => {
  const name = `fixture-pom-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`;

  await itemsPage.goto();
  await itemsPage.addItem(name);
  await expect(itemsPage.itemRows().filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(1);

  await itemsPage.deleteItemByName(name);
  await expect(itemsPage.itemRows().filter({ has: page.getByText(name, { exact: true }) })).toHaveCount(0);
});
