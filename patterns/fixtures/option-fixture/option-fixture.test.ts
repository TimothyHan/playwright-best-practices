// 패턴 §3.4 — 옵션의 기본값 사용.
// test.use()로 오버라이드하는 option-override.test.ts와 비교해 보세요.
import { test, expect } from './fixture.js';

test('아무것도 오버라이드하지 않으면 옵션은 기본값을 제공한다', async ({ itemPrefix, request }) => {
  expect(itemPrefix).toBe('demo');

  // 옵션이 실제 동작을 파라미터화 — 여기서는 테스트 데이터 네이밍
  const name = `${itemPrefix}-option-${Date.now()}`;
  const created = await request.post('/api/items', { data: { name } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  await request.delete(`/api/items/${id}`);
});
