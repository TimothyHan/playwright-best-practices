// 패턴 §3.2 — disposal context 동작.
// 테스트가 아무것도 직접 삭제하지 않는 점에 주목: 정리는 createItem 안에서
// 큐잉되고, 테스트 종료 후 auto fixture가 LIFO로 — 실패 시에도 — 실행합니다.
import { test, expect } from './fixture.js';
import { createItem, listItems } from './items-client.js';

// 두 번째 테스트가 첫 번째 테스트의 사후 상태를 단언하므로 순서를 고정
test.describe.configure({ mode: 'serial' });

test('생성된 엔티티는 자동으로 정리된다', async ({ request, disposalContext }) => {
  const name = `disposal-demo-${Date.now()}`;

  const created = await createItem(request, name, disposalContext);
  const { id } = await created.json();

  // 병렬 안전 단언(§5.3): 전역 개수가 아니라 *우리* 엔티티를 찾음
  const list = await (await listItems(request)).json();
  expect(list.data).toContainEqual(expect.objectContaining({ id, name }));
  // 수동 정리 없음 — 이 라인 이후 fixture가 disposal 스택을 비움
});

test('정리 실행 확인: 이전 테스트의 데이터가 사라졌다', async ({ request }) => {
  const list = await (await listItems(request)).json();
  const leftovers = list.data.filter((item: { name: string }) => item.name.startsWith('disposal-demo-'));
  expect(leftovers).toEqual([]);
});
