// disposal context(§3.2)에 연결된 얇은 API 클라이언트(§5.1):
// createItem이 생성 시점에 자신의 deleteItem undo를 큐에 넣습니다.
import { expect, type APIRequestContext } from '@playwright/test';
import type { APIClientFunction, DisposalContext } from './fixture.js';

const route = '/api/items';

export const createItem: APIClientFunction = async (
  request: APIRequestContext,
  name: string,
  disposalContext: DisposalContext,
  expStatusCode: number = 201,
) => {
  const response = await request.post(route, { data: { name } });
  expect(response.status()).toBe(expStatusCode);

  // 생성 시점에 테스트 데이터 제거를 큐잉 — 잊는 것이 불가능
  const body = await response.json();
  disposalContext.push([deleteItem, body.id as string]);
  return response;
};

export const deleteItem: APIClientFunction = async (
  request: APIRequestContext,
  itemId: string,
  expStatusCode: number = 204,
) => {
  const response = await request.delete(`${route}/${itemId}`);
  expect(response.status()).toBe(expStatusCode);
  return response;
};

export const listItems: APIClientFunction = async (
  request: APIRequestContext,
  expStatusCode: number = 200,
) => {
  const response = await request.get(route);
  expect(response.status()).toBe(expStatusCode);
  return response;
};
