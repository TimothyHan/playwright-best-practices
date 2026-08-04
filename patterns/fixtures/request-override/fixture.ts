// 패턴 §3.1 — 내장 `request` fixture 오버라이드.
// 문제: API 호스트/경로가 애플리케이션 baseURL과 다름. 스펙에서는 API가
// 어디에 있는지 신경 쓰지 않고 `request.get('items')`로 쓰고 싶음.
// 함정 1: 최상위 `request.newContext()`로 만든 컨텍스트는 config의
// `use.baseURL`을 상속하지 않음 — 여기서 명시적으로 지정해야 함.
// 함정 2: base URL이 경로(/api)를 포함하면 **트레일링 슬래시**가 필요하고,
// 호출자는 **상대** 경로('items')를 써야 함. 절대 경로('/items')는 URL 결합
// 규칙에 따라 base의 경로를 대체해 /api를 조용히 떨어뜨림.
import { test as base, request } from '@playwright/test';

const API_BASE_URL = 'http://localhost:4173/api/';

export const test = base.extend({
  request: async ({}, use) => {
    const context = await request.newContext({
      baseURL: API_BASE_URL,
      // 실제 프로젝트에서는 여기에 인증을 추가:
      // extraHTTPHeaders { Authorization: `Bearer ${token}` }
      // 또는 global setup이 저장한 storageState (§4)
    });
    await use(context);
    await context.dispose();
  },
});

export { expect } from '@playwright/test';
