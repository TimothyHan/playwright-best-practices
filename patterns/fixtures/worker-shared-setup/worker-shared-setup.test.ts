// 패턴 §3.3.1 — 시드 아이템은 테스트당이 아니라 worker당 한 번 생성됩니다:
// 아래 두 테스트는 정확히 같은 인스턴스를 받습니다.
import { test, expect } from './fixture.js';

// serial로 두 테스트를 한 worker에 묶어 같은-인스턴스 단언이 성립하게 함
test.describe.configure({ mode: 'serial' });

let firstSeenId: string | undefined;

test('worker가 시드한 아이템이 존재하고 사용 가능하다', async ({ seededItem, request }) => {
  const list = await (await request.get('/api/items')).json();
  expect(list.data).toContainEqual(expect.objectContaining({ id: seededItem.id }));
  firstSeenId = seededItem.id;
});

test('두 번째 테스트도 같은 인스턴스를 받는다 — 셋업은 두 번이 아니라 한 번 실행', async ({ seededItem }) => {
  expect(seededItem.id).toBe(firstSeenId);
});
