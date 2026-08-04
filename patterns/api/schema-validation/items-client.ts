// 패턴 §5.4 — 클라이언트 경계에서 응답 바디 검증.
// 모든 호출이 raw response 대신 파싱되고 타입이 있는 데이터를 반환합니다:
// 조용한 API 형태 변화(필드 이름 변경, string→number, 속성 누락)가
// 드리프트된 페이로드를 받은 바로 그 호출에서 크게 실패합니다 —
// 손으로 고른 두 필드에 대한 `toMatchObject`로는 절대 잡히지 않는 것.
import { expect, type APIRequestContext } from '@playwright/test';
import { ItemSchema, ListItemsResponseSchema, type Item, type ListItemsResponse } from './item.schema.js';

const route = '/api/items';

export const createItem = async (
  request: APIRequestContext,
  name: string,
  expStatusCode: number = 201,
): Promise<Item> => {
  const response = await request.post(route, { data: { name } });
  expect(response.status()).toBe(expStatusCode);
  // .parse는 스키마 불일치 시 정확한 경로와 함께 throw
  return ItemSchema.parse(await response.json());
};

export const listItems = async (
  request: APIRequestContext,
  expStatusCode: number = 200,
): Promise<ListItemsResponse> => {
  const response = await request.get(route);
  expect(response.status()).toBe(expStatusCode);
  return ListItemsResponseSchema.parse(await response.json());
};

export const deleteItem = async (
  request: APIRequestContext,
  itemId: string,
  expStatusCode: number = 204,
): Promise<void> => {
  const response = await request.delete(`${route}/${itemId}`);
  expect(response.status()).toBe(expStatusCode);
};
