// 패턴 §3.2 — 목적 특화 auto fixture: disposal context.
// 테스트 단위 undo 스택: 엔티티를 생성하는 API 클라이언트가 스스로 undo
// 엔트리를 push하고, 이 auto fixture가 테스트 종료 후 — 실패 시에도 —
// 스택을 LIFO로 비웁니다.
import { test as base, type APIRequestContext, type APIResponse } from '@playwright/test';

/** undo 호출을 저장하고 범용적으로 재생할 수 있도록 하는 균일한 클라이언트 시그니처. */
export type APIClientFunction = (request: APIRequestContext, ...args: any[]) => Promise<APIResponse>;

/** `[클라이언트함수, ...request를 제외한 인자들]` undo 엔트리의 스택. */
export type DisposalContext = [APIClientFunction, ...unknown[]][];

const disposeContext = async (disposalContext: DisposalContext, request: APIRequestContext) => {
  while (disposalContext.length) {
    const entry = disposalContext.pop();
    if (!entry) continue;
    const [apiFunction, ...args] = entry;
    await apiFunction(request, ...args);
  }
};

export const test = base.extend<{ disposalContext: DisposalContext }>({
  disposalContext: [
    async ({ request }, use) => {
      const disposalContext: DisposalContext = [];
      await use(disposalContext);
      // 테스트 본문 이후 실행 — 테스트가 실패했을 때도 포함
      await disposeContext(disposalContext, request);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
