// 패턴 §3.4 — test.use()로 파일 단위 옵션 오버라이드.
// 같은 오버라이드 문법이 playwright.config.ts의 프로젝트 레벨에서도 동작합니다.
import { test, expect } from './fixture.js';

test.use({ itemPrefix: 'custom' });

test('test.use가 이 파일 전체의 옵션을 오버라이드한다', async ({ itemPrefix }) => {
  expect(itemPrefix).toBe('custom');
});
