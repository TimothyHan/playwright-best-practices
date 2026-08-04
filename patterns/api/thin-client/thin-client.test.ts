// 패턴 §5.1 — 스펙에서의 얇은 클라이언트: 해피 패스와 네거티브 테스트.
import { test, expect } from '@playwright/test';
import { listItems, createItem, deleteItem, type Item } from './items-client.js';

test('해피 패스: 생성, 확인, 삭제', async ({ request }) => {
  const name = `thin-client-${Date.now()}`;

  const created: Item = await (await createItem(request, name)).json();
  expect(created).toMatchObject({ name });

  // §5.3 병렬 안전: 전역 개수가 아니라 *우리* 엔티티가 나타나는지 단언
  const list = await (await listItems(request)).json();
  expect(list.data).toContainEqual(expect.objectContaining({ id: created.id }));

  await deleteItem(request, created.id);
  const after = await (await listItems(request)).json();
  expect(after.data).not.toContainEqual(expect.objectContaining({ id: created.id }));
});

test('네거티브 패스: 기대 상태 코드가 호출 지점에 명시된다', async ({ request }) => {
  // 빈 이름 → 400; 클라이언트가 대신 단언
  await createItem(request, '', 400);
  // 없는 id → 404
  await deleteItem(request, 'no-such-id', 404);
});
