// 패턴 §5.1 — 내부에서 상태 코드를 단언하는 얇은 API 클라이언트.
// 모든 호출이 기본으로 상태 검증됨. 네거티브 테스트는 기대 코드를
// 명시적으로 전달합니다. response를 그대로 반환하므로 바디 단언은
// 테스트 의도가 드러나는 스펙에서 수행합니다.
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';

const route = '/api/items';

export interface Item {
  id: string;
  name: string;
  created_at: string;
}

export const listItems = async (
  request: APIRequestContext,
  expStatusCode: number = 200,
): Promise<APIResponse> => {
  const response = await request.get(route);
  expect(response.status()).toBe(expStatusCode);
  return response;
};

export const createItem = async (
  request: APIRequestContext,
  name: string,
  expStatusCode: number = 201,
): Promise<APIResponse> => {
  const response = await request.post(route, { data: { name } });
  expect(response.status()).toBe(expStatusCode);
  return response;
};

export const deleteItem = async (
  request: APIRequestContext,
  itemId: string,
  expStatusCode: number = 204,
): Promise<APIResponse> => {
  const response = await request.delete(`${route}/${itemId}`);
  expect(response.status()).toBe(expStatusCode);
  return response;
};
