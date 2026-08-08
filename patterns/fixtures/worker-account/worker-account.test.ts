// 패턴 §3.3.2 — worker별 계정 동작: 이 worker의 모든 테스트는 같은 계정
// (같은 storageState 파일)을 받고, 다른 worker의 테스트는 다른 계정을
// 받습니다 — 병렬 실행에서 세션 공유나 계정 단위 데이터 충돌이 없습니다.
import fs from 'node:fs';
import { test, expect } from './fixture.js';

test('테스트 데이터가 이 worker의 계정 범위로 격리된다', async ({ workerAuth, request }, testInfo) => {
  // 목록 순서 할당: worker N이 N번째 상태 파일을 가짐
  expect(workerAuth.username).toBe(`test-user-${testInfo.parallelIndex % 4}`);
  expect(fs.existsSync(workerAuth.statePath)).toBe(true);

  // 계정 접두사 네이밍: 다른 worker가 같은 테스트를 동시에 실행해도
  // 그 데이터는 다른 계정 접두사를 가짐
  const name = `${workerAuth.username}-item-${Date.now()}-w${test.info().workerIndex}r${test.info().repeatEachIndex}`;
  const created = await request.post('/api/items', { data: { name } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();

  const list = await (await request.get('/api/items')).json();
  expect(list.data).toContainEqual(expect.objectContaining({ id, name }));

  await request.delete(`/api/items/${id}`);
});

test('같은 worker는 모든 테스트에서 같은 계정을 본다', async ({ workerAuth }, testInfo) => {
  // worker 스코프: 이 worker의 테스트 사이에 다시 생성되지 않음
  expect(workerAuth.username).toBe(`test-user-${testInfo.parallelIndex % 4}`);
});

test('내장 fixture들이 worker 계정으로 자동 인증된다', async ({ context, page, workerAuth }) => {
  // 어디에도 newContext가 없음: storageState 오버라이드가 worker의 상태
  // 파일을 기본 컨텍스트에 연결했으므로, 쿠키가 이 worker의 계정을 식별
  await page.goto('/');
  const cookies = await context.cookies();
  expect(cookies).toContainEqual(
    expect.objectContaining({ name: 'account', value: workerAuth.username }),
  );
});
