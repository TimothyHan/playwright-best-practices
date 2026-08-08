# Playwright 테스트 자동화 규칙 (AI 에이전트용)

> 이 파일은 AI 코딩 에이전트가 Playwright 테스트를 작성할 때 따라야 할 규칙 모음입니다.
> 프로젝트의 `CLAUDE.md`, `AGENTS.md`, `.cursorrules` 등에 이 내용을 복사하거나 컨텍스트로 제공하세요.
> 각 규칙의 근거와 트레이드오프는 [패턴 카탈로그](./playwright-best-practices.md)에, 동작하는 예제는 [`patterns/`](../patterns/)에 있습니다.

## 범위

**이 문서는 [Playwright 공식 베스트 프랙티스](https://playwright.dev/docs/best-practices)를 대체하지 않습니다.** 공식 문서의 지침(user-facing 셀렉터, web-first assertion, 테스트 격리, 서드파티 의존 배제 등)은 기본 전제로 두고, 그 위에 실전 프로젝트에서 얻은 **추가 규칙**을 얹습니다 — 병렬 실행 안전성, fixture 설계, 정리(teardown) 전략, 크게 실패시키기, 공식 문서가 다루지 않는 함정들.

두 문서가 충돌하면: 이 문서가 명시적으로 다른 선택을 한 경우(예: 셀렉터 우선순위)는 이 문서를, 그 외에는 공식 문서를 따릅니다.

## 역할

당신은 Playwright 테스트 자동화를 작성하는 엔지니어입니다. 아래 규칙은 협상 불가능한 기본값입니다. 규칙에서 벗어나야 한다면 그 이유를 코드 주석으로 남기세요.

## 필수 규칙 (MUST)

### 구조
- 모든 Playwright 관련 파일은 단일 `playwright/` 부모 폴더 아래에 둔다. 앱 레포의 `src/`에 테스트 파일을 섞지 않는다.
- 스펙 파일에는 의도(행동 + 단언)만 담는다. CSS 셀렉터, HTTP 라우트, 파싱 로직이 스펙에 보이면 페이지 객체/API 클라이언트 계층으로 옮긴다.
- 테스트 정의를 셋업 → 테스트 → 티어다운으로 분리하고 전용 훅(`beforeAll`/`beforeEach`/`afterEach`/`afterAll`)에 둔다. 여러 단계의 플로우는 `test.step`으로 감싼다 — step 이름은 요구사항 수준의 단계로.
- 정리(teardown)는 테스트 본문 끝이 아니라 훅 또는 auto fixture에 둔다. 본문 끝의 인라인 정리는 테스트가 실패하면 실행되지 않는다.

### 대기 (waits)
- `page.waitForTimeout()` 금지. 시간이 아니라 상태를 기다린다.
- 비동기 fetch를 유발하는 액션은 2단 대기: `waitForResponse` → 렌더된 요소 대기. **response 수신 ≠ 렌더 완료.**
- `waitForResponse` / `waitForEvent` 프로미스는 유발하는 액션 **이전에** 생성한다 (`Promise.all` 페어링).
- `.all()`은 auto-wait하지 않는 스냅샷이다. 호출 전에 `first().waitFor()` 또는 기대 개수 단언으로 렌더를 먼저 보장한다.

### 셀렉터
- 우선순위: `getByTestId` > `getByRole` > 그 외. CSS/XPath 셀렉터는 최후 수단. (공식 문서는 `getByRole` 우선을 권장 — 이 문서는 마크업 리팩터링에 대한 내성을 위해 testId를 우선하는 의도적 선택)
- **테스트 속성 컨벤션을 먼저 확인한다.** `data-test`, `data-cy` 등을 쓰는 앱이면 설정에 `use.testIdAttribute` 필수. 러너 밖 스크립트는 별도로 `selectors.setTestIdAttribute(...)` 호출.
- **이름으로 행/카드를 찾을 때는 exact-match.** `filter({ hasText: name })`은 부분 일치 — "Pliers"가 "Combination Pliers"에도 매칭된다. `filter({ has: page.getByText(name, { exact: true }) })`를 쓴다.
- 로케이터는 페이지 객체에 모으고 export한다. 스펙은 `expect(pom.locators.x(page))`로 조합한다.

### 테스트 데이터 (병렬 안전)
- 엔티티 이름에는 worker+repeat 엔트로피까지: `` `${접두사}-${Date.now()}-w${workerIndex}r${repeatEachIndex}` ``. `Date.now()`만으로는 병렬 워커나 `--repeat-each` 인스턴스가 같은 밀리초에 충돌한다. 하드코딩된 이름은 논외.
- 전역 개수 단언 금지 (`초기개수 + 1` 패턴). 동시 실행 중인 다른 테스트가 깨뜨린다. 대신 id/이름으로 *내* 엔티티의 존재/부재를 단언한다.
- 생성한 데이터는 반드시 정리한다 — disposal context(생성 시 undo 큐잉) 또는 `afterEach`/`afterAll` 훅으로.

### 크게 실패시키기 (fail loudly)
- `findIndex` 결과를 가드 없이 `nth()`에 넘기지 않는다: `-1`은 `nth(-1)` = 마지막 요소를 조용히 클릭한다. `if (index === -1) throw` 필수.
- 탐색 헬퍼가 `undefined`를 반환하면 호출자가 즉시 단언한다.
- 모든 `textContent()` 읽기에 `.trim()`. DOM 공백이 `===` 매칭을 깨뜨린다.
- API 클라이언트는 내부에서 상태 코드를 단언한다: `expect(response.status()).toBe(expStatusCode)`. 네거티브 테스트는 기대 코드를 인자로 전달.

### 매처 선택
| 의도 | 매처 |
| --- | --- |
| 배열 전체가 순서까지 일치 | `toEqual` |
| 배열에 특정 요소 하나가 존재 | `toContainEqual` |
| 순서 무관 동등 | `arrayContaining` + `toHaveLength` |
| 객체의 일부 필드만 확인 | `toMatchObject` / `objectContaining` |

`toContainEqual`에 배열 전체를 넘기지 않는다 — "배열을 요소로 포함하는가"를 묻게 되어 항상 실패한다.

## 금지 (NEVER)

- `page.waitForTimeout()` — 상태 기반 대기로 대체
- `test.only` 커밋 — config에 `forbidOnly: !!process.env.CI`
- 전역 개수 단언 (`count + 1`)
- 하드코딩된 테스트 데이터 이름
- 본문 끝 인라인 정리에만 의존 (실패 시 건너뜀)
- 자동으로 사라지는 컴포넌트(토스트 등)에 대한 단언 경쟁 — 가능하면 무시
- 스펙 파일 안의 CSS 셀렉터/HTTP 라우트 직접 사용
- `beforeAll`에서 테스트 스코프 fixture(`page`, `request`) 사용 시도 — 자체 컨텍스트를 만든다

## 결정 테이블

### 페이지 객체 스타일
| 상황 | 선택 |
| --- | --- |
| 여러 팀이 프레임워크 공동 관리 | 무상태 함수형 POM (모듈 객체 + `page` 인자) |
| 소규모 팀, 긴 플로우 위주 | 클래스 기반 POM (얕은 BasePage까지만, 깊은 상속 금지) |
| 페이지 객체 수가 많아 생성 노이즈가 지배적 | Fixture 주입 POM |
| 같은 위젯(테이블/모달)이 여러 페이지에 등장 | 컴포넌트 객체로 추출 (루트 로케이터 파라미터화) |

### 테스트 계층
| 검증 대상 | 계층 |
| --- | --- |
| 통합된 제품이 실제로 동작 | 라이브 E2E (얇게 유지) |
| UI 로직, 에러/빈/엣지 상태, 역할별 UI, 플래그 변형 | `page.route` 목킹 |
| 서비스 자체의 계약과 동작 | API 테스트 (+ zod 스키마 검증) |
| 상태 시딩과 사전 조건 | API로 (UI로 시딩하지 않는다 — 느리고 취약) |

### 셋업/정리 배치
| 상황 | 위치 |
| --- | --- |
| 테스트마다 새로 필요한 상태 | `beforeEach` 또는 테스트 스코프 fixture |
| 생성한 엔티티의 정리 | disposal context fixture (생성 함수가 undo를 큐잉) |
| worker 전체가 공유하는 비싼 셋업 | worker 스코프 fixture (읽기 전용으로만 사용) |
| 파일 하나를 넘는 재사용 | 훅이 아니라 fixture로 승격 |

### 병렬 실행 (기본: 최소 2 worker)
직렬로만 통과하는 스위트는 순서 의존 버그를 숨긴다. `workers = clamp(floor(cores/2), 최소 2, 최대 사용 가능 계정 수)`.

| 상황 | 방법 |
| --- | --- |
| worker 간 세션 격리 | `.auth/`의 계정별 storageState 파일을 `parallelIndex`로 할당 (fs 목록 + `.sort()` 필수; `workerIndex`는 worker 재시작 시 증가 — 풀 할당에는 `parallelIndex`) |
| 할당된 상태를 내장 fixture에 연결 | `storageState` 옵션 fixture 오버라이드 — 스펙에서 `newContext` 호출 불필요 |
| 단일 계정 / 전역 공유 상태 | 공유 상태 변경 스펙은 종속 프로젝트로: `{ name: 'global-state', dependencies: ['parallel'], workers: 1 }` — `--repeat-each`는 같은 파일도 워커에 분산시키므로 프로젝트별 `workers: 1` 필수 |
| 역할별 UI 테스트 (계정은 하나뿐) | `/api/me` 등 프로필 응답을 `page.route`로 역할별 목킹 |

- **검증/스모크 스펙도 같은 계정 fixture를 소비한다.** 기본 `@playwright/test`를 직접 import한 스펙은 config 기본 storageState의 같은 계정으로 인증되어, `--repeat-each`에서 같은 계정을 동시 변경하는 레이스가 생긴다. 주변 상태를 읽지 말고 self-seed.
- **결정적 네거티브 인증 테스트는 `--repeat-each`에서 제외.** 반복해도 타이밍 플레이크를 못 잡고, brute-force 잠금(N회 실패 시 계정 잠금)이 있으면 같은 계정의 모든 테스트가 연쇄 실패한다. 별도 프로젝트로 1회만 실행.
- 플레이크 게이트는 프로젝트별로: `--repeat-each`는 종속 프로젝트를 반복하지 않는다 — `--project={이름} --repeat-each=3`.

## 템플릿

### 무상태 POM + 테이블 파싱
```ts
import { type Page, type Locator } from '@playwright/test';

const locators = {
  itemRows: (page: Page): Locator => page.getByTestId('item-row'),
  addButton: (page: Page): Locator => page.getByTestId('add-button'),
};

const parseTable = async (page: Page) => {
  await locators.itemRows(page).first().waitFor(); // .all() 전 렌더 보장
  // 원자적 읽기: .all() 후 셀마다 textContent()를 await하면 스냅샷과 읽기
  // 사이 리렌더로 행이 detach될 때 타임아웃까지 매달린다 (실전 확인)
  const rowTexts = await locators.itemRows(page).evaluateAll((rows) =>
    rows.map((row) =>
      Array.from(row.querySelectorAll('[role="cell"], td')).map((c) => (c.textContent ?? '').trim()),
    ),
  );
  return rowTexts.map((cells) => ({ name: cells[0] ?? '' }));
};

export const somePage = {
  locators,
  parseTable,
  async deleteByName(page: Page, name: string) {
    const table = await parseTable(page);
    if (!table.some((row) => row.name === name)) throw new Error(`"${name}" 행이 없습니다`); // fail loudly
    // 내용으로 앵커 (exact-match): parse와 클릭 사이에 행이 추가/삭제되면
    // nth(index)는 조용히 다른 행을 가리킨다
    const row = locators.itemRows(page).filter({ has: page.getByText(name, { exact: true }) });
    await row.getByTestId('delete-button').click();
  },
};
```

### 얇은 API 클라이언트 + disposal context
```ts
// fixture.ts
export type DisposalContext = [APIClientFunction, ...unknown[]][];
export const test = base.extend<{ disposalContext: DisposalContext }>({
  disposalContext: [async ({ request }, use) => {
    const ctx: DisposalContext = [];
    await use(ctx);
    while (ctx.length) {              // LIFO — 실패해도 실행됨
      const [fn, ...args] = ctx.pop()!;
      await fn(request, ...args);
    }
  }, { auto: true }],
});

// client.ts — 생성이 곧 정리 예약
export const createItem = async (request, name, disposalContext, expStatusCode = 201) => {
  const response = await request.post('/api/items', { data: { name } });
  expect(response.status()).toBe(expStatusCode);
  disposalContext.push([deleteItem, (await response.json()).id]);
  return response;
};
```

### 네트워크 인지 동기화
```ts
const refetch = page.waitForResponse((r) =>
  r.url().includes('/api/items') && r.request().method() === 'GET',
); // 클릭 이전에 장전
await page.getByTestId('add-button').click();
await refetch;                                                        // response 수신
await expect(page.getByTestId('item-row')
  .filter({ has: page.getByText(name, { exact: true }) })).toBeVisible(); // 렌더 확인 (exact-match)
```

### 스펙 구조 (훅 + step)
```ts
test.describe('아이템 관리', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/'); });

  test('아이템 생애주기', async ({ page, request }) => {
    const info = test.info();
    const name = `demo-${Date.now()}-w${info.workerIndex}r${info.repeatEachIndex}`; // 병렬+repeat-each 안전

    await test.step('API로 아이템 생성', async () => { /* ... */ });
    const table = await test.step('테이블 파싱', async () => { /* step은 값 반환 가능 */ });
    await test.step('생성 확인', async () => { /* ... */ });
  });

  test.afterEach(async ({ request }) => { /* 데이터 정리 */ });
});
```

### 역할별 UI 목킹
```ts
await page.route('**/api/me', (route) =>
  route.fulfill({ json: { user: 'view-only', role: 'viewer' } }),
); // goto 이전에 등록
await page.goto('/');
await expect(row.getByTestId('delete-button')).toHaveCount(0); // 역할에 따라 액션 미노출
```

## 안티패턴 → 교정

| ❌ 잘못된 코드 | ✅ 교정 |
| --- | --- |
| `await page.waitForTimeout(3000)` | 상태 대기: `await expect(locator).toBeVisible()` |
| `await button.click(); await page.waitForResponse(...)` | 프로미스를 클릭 전에 생성 |
| `const rows = await locator.all()` (대기 없이) | `await locator.first().waitFor()` 후 `.all()` |
| `rows.nth(table.findIndex(...))` | `-1` 가드 후 throw |
| `expect(count).toBe(before + 1)` | `expect(list).toContainEqual(objectContaining({ id }))` |
| `name: 'test-item'` / `` `x-${Date.now()}` `` | worker+repeat 엔트로피 추가 (`-w${workerIndex}r${repeatEachIndex}`) |
| 이름 조회에 `filter({ hasText: name })` | `filter({ has: getByText(name, { exact: true }) })` — hasText는 부분 일치 |
| 본문 마지막 줄에서 `deleteItem(...)` | disposal context 또는 `afterEach` |
| `expect(arr).toContainEqual(expectedArray)` | `toEqual` (전체 비교) 또는 요소 하나만 전달 |
| `baseURL: 'https://host/api'` + `get('/items')` | 트레일링 슬래시 `…/api/` + 상대 경로 `get('items')` |
| `beforeAll(async ({ request }) => ...)` | `beforeAll(async () => { const api = await apiRequest.newContext(...) })` |
| `storageState`를 테스트마다 `newContext`로 지정 | `storageState` 옵션 fixture 오버라이드 |

## 함정 (알아두면 디버깅이 빨라지는 것들)

- **`request.newContext()`는 config의 `use.baseURL`을 상속하지 않는다.** 명시적으로 지정할 것.
- **경로 포함 base URL은 트레일링 슬래시 + 상대 경로.** `/items`는 base의 `/api`를 URL 결합 규칙으로 대체해버린다.
- **로케이터 개수는 hidden 요소도 센다.** `toHaveCount(0)`이 실패하는데 화면에 안 보인다면 DOM에 남은(attached) 숨겨진 요소를 의심할 것 — 앱 버그일 수 있다.
- **`getAttribute('aria-expanded')`의 반환값 `"false"`는 truthy 문자열.** `!== 'true'`로 비교.
- **`reuseExistingServer: !CI`는 포트의 좀비 서버에 붙는다.** 이유 없이 낡은 동작이 보이면 `lsof -ti :<port>`로 오래된 서버를 확인.
- **`fullyParallel`에서는 같은 파일의 테스트도 다른 worker로 흩어진다.** 순서 의존 테스트는 `test.describe.configure({ mode: 'serial' })`.
- **`.auth/` 파일 목록을 worker에 할당할 때 `.sort()` 필수.** `readdir` 순서는 플랫폼마다 다르다.
