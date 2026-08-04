// 패턴 §3.1 — 호출 지점에서 오버라이드는 보이지 않습니다:
// 스펙은 문서 그대로 `request`를 쓰지만, 실제로는 API base URL을 향합니다.
import { test, expect } from './fixture.js';

test('request fixture가 API 호스트를 투명하게 향한다', async ({ request }) => {
  // 주의: '/api/items'가 아니라 상대 경로 'items' — 오버라이드가 API 접두사를
  // 제공하며, 반드시 상대 경로여야 함: '/items'는 base의 /api 경로를 떨어뜨림
  const response = await request.get('items');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body.data)).toBe(true);
});
