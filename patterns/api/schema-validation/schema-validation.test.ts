// 패턴 §5.4 — 스키마 검증 동작. api/thin-client와 비교해 보세요:
// 같은 플로우지만 모든 바디가 들어오는 길목에서 계약 검증되고,
// 반환값은 z.infer로 완전한 타입을 갖습니다.
import { test, expect } from '@playwright/test';
import { z } from 'zod';
import { createItem, listItems, deleteItem } from './items-client.js';
import { ItemSchema } from './item.schema.js';

test('모든 응답 바디가 클라이언트 경계에서 계약 검증된다', async ({ request }) => {
  const name = `schema-demo-${Date.now()}`;

  // createItem이 이미 id(uuid), name, created_at(ISO datetime)을 검증
  const created = await createItem(request, name);
  expect(created.name).toBe(name);

  // listItems가 data[]의 모든 요소를 검증 — 드리프트된 행 하나만 있어도 throw
  const list = await listItems(request);
  expect(list.data).toContainEqual(expect.objectContaining({ id: created.id }));

  await deleteItem(request, created.id);
});

test('드리프트 감지의 실제 모습: 스키마 불일치가 정확한 경로와 함께 실패한다', async ({ request }) => {
  const created = await createItem(request, `schema-drift-${Date.now()}`);

  // API가 계약이 요구하는 필드를 빠뜨린 상황을 시뮬레이션: 실제 페이로드를
  // `price`를 기대하는 스키마로 검증 — zod가 정확히 어느 필드가 어디서
  // 빠졌는지 보고
  const DriftedSchema = ItemSchema.extend({ price: z.number() });
  const result = DriftedSchema.safeParse(created);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({ path: ['price'], code: 'invalid_type' }),
    );
  }

  await deleteItem(request, created.id);
});
