// 패턴 §3.4 — 옵션 fixture: 타입이 있고 오버라이드 가능한 스위트 파라미터.
// `{ option: true }`가 fixture를 기본값이 있는 옵션으로 만들며, 모든 레벨에서
// 오버라이드할 수 있습니다: config `use`, 프로젝트 단위, 파일 단위 test.use().
import { test as base } from '@playwright/test';

export const test = base.extend<{ itemPrefix: string }>({
  itemPrefix: ['demo', { option: true }],
});

export { expect } from '@playwright/test';
