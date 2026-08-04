// 패턴 §3.3.1 — worker 스코프 공유 셋업.
// 비싼 상태(시드된 엔티티, DB 커넥션, 시드된 org)를 worker당 한 번만
// 만들고, 그 worker가 실행하는 모든 테스트가 읽기 전용으로 공유합니다.
// 주의: worker 스코프 fixture는 `request` 같은 테스트 스코프 fixture에
// 의존할 수 없음 — 자체 APIRequestContext를 만들어야 합니다.
import { test as base, request as apiRequest } from '@playwright/test';

export interface SeededItem {
  id: string;
  name: string;
}

export const test = base.extend<{}, { seededItem: SeededItem }>({
  seededItem: [
    async ({}, use, workerInfo) => {
      // 이 worker가 첫 테스트를 실행할 때 한 번 생성
      const api = await apiRequest.newContext({ baseURL: 'http://localhost:4173' });
      const response = await api.post('/api/items', {
        data: { name: `seed-w${workerInfo.workerIndex}-${Date.now()}` },
      });
      const item = await response.json();

      // 이 worker의 모든 테스트가 이 인스턴스를 공유 — 읽기 전용으로 다룰 것
      await use({ id: item.id, name: item.name });

      // worker 종료 시 한 번 정리
      await api.delete(`/api/items/${item.id}`);
      await api.dispose();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
