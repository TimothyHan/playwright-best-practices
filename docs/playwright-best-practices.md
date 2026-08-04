# Playwright 베스트 프랙티스 패턴

Playwright 테스트 자동화를 위한 살아있는 패턴 카탈로그입니다. 섹션 끝에 **실행 가능한 예제** 링크가 있는 패턴은 [`patterns/`](../patterns/) 아래에 동작하는 코드로 제공됩니다 — 번들된 타깃 앱에 대해 `npx playwright test`를 실행하면 통과하는 것을 볼 수 있습니다. 각 패턴은 해결하는 문제와 트레이드오프를 함께 명시합니다.

---

## 1. 프로젝트 아키텍처

### 1.1 Playwright 기본 구조 — 베이스라인

`npm init playwright@latest`가 생성하는 스캐폴드:

```
playwright.config.ts        # 단일 config: projects, use 옵션, 리포터
tests/                      # 스펙 (testDir)
│   └── example.spec.ts
tests-examples/             # 더 풍부한 데모 스펙 (삭제해도 무방)
.github/workflows/          # 선택 시 CI 워크플로우
playwright-report/          # 생성된 HTML 리포트 (gitignore)
test-results/               # 트레이스, 비디오, 스크린샷 (gitignore)
```

모든 것이 의도적으로 관례가 적습니다: 스펙은 `testDir`에, `testMatch`(기본값 `*.@(spec|test).?(c|m)[jt]s?(x)`)로 매칭되며, 헬퍼·페이지 객체·fixture의 위치는 정해져 있지 않습니다. 작은 스위트에는 이 정도 구조가 딱 맞습니다 — **고통이 오기 전에 계층을 추가하지 마세요.** 인라인 로케이터로 된 스펙 열두 개가 성급한 5계층 아키텍처보다 유지보수하기 쉽습니다.

평평한 기본 구조를 벗어날 때가 되었다는 신호:

- 같은 로케이터/플로우가 스펙마다 복사됨 → 페이지 객체 (§2)
- 스펙이 API 시딩과 UI 단언을 인라인으로 섞음 → API 클라이언트 계층 (§5)
- 인증/셋업 보일러플레이트가 파일마다 반복됨 → fixture + global setup (§3, §4)

### 1.2 스위트가 성장한 후의 계층 구조

Playwright 관련 파일 전부를 단일 `playwright/` 부모 폴더 아래로 모으세요. 부모로 `src/`는 피하세요: 스위트가 애플리케이션 레포 안에 있을 때 `src/`는 애플리케이션 자체의 소스 트리와 충돌하거나 혼동되며, 범용적인 이름은 내용물에 대해 아무것도 말해주지 않습니다. 도구 이름을 딴 폴더 하나가 소유권을 명확하게 합니다:

```
playwright/
├── api/            # API 클라이언트, 대상 API 버전 체계를 따름 (v1, v3)
├── pages/          # 페이지 객체 (UI 구조 지식)
├── support/        # fixture, global setup/teardown, 공용 타입
├── utils/          # 순수 헬퍼 (가능한 한 Playwright 의존성 없이)
└── tests/
    ├── data/       # 테스트 중 업로드/검증하는 데이터
    └── e2e/        # 스펙: 오케스트레이션 + 단언만
```

> **기본원칙: 스펙은 의도를 담고, 메커니즘을 담지 않는다.**
> 스펙이 CSS 셀렉터나 HTTP 라우트를 알고 있다면 계층이 새고 있는 것입니다.

흔한 동등 배치:

- `e2e/`를 부모로 두고 `e2e/*.spec.ts`, `e2e/playwright/`

```
e2e/
├── playwright/     ← fixtures, 페이지 객체, 순수 헬퍼
└── *.spec.ts       ← 스펙
```

- `tests/`를 부모로 두고 `tests/e2e/*.spec.ts`, `tests/lib/`

```
tests/
├── lib/            ← 스펙 외 (페이지 객체, API 클라이언트, fixtures)
└── e2e/            ← 스펙
```

루트레벨 폴더 이름보다 **테스트 소유임이 명확한 단일 루트**라는 점이 중요합니다. 하나를 골라 일관되게 유지하세요.

---

## 2. 페이지 객체 패턴

### 2.1 무상태 함수형 POM

로케이터와 인터랙션은 `page`를 받는 일반 함수이며, 페이지 객체는 클래스가 아닌 모듈 레벨 객체입니다.

```ts
const locators = {
    saveButton: (page: Page): Locator => page.getByRole('button', { name: 'Save' }),
};

export const somePage = {
    locators,
    async fillAndSubmitForm(page: Page, apiName: string): Promise<void> { ... },
};
```

- ✅ 생성 절차 없음. import 후 바로 사용. 숨겨진 상태가 없어 병렬 실행에 안전.
- ✅ 로케이터가 export되어 스펙에서 `expect(somePage.locators.x(page))`로 직접 조합 가능.
- ✅ 여러 팀이 하나의 프레임워크를 함께 관리할 때 유리 — POM 아키텍처의 복잡도가 제한되고, 무상태이므로 팀마다 다른 특정 상태에 의존하지 않음.
- ❌ 긴 플로우에서 매 호출마다 `page`를 넘기는 것이 번거로움.
- ❌ 유사 페이지 계열에 대한 상속/조합 수단이 없음 (2.3 참고).

실행 가능한 예제: [patterns/pom/stateless/](../patterns/pom/stateless/)

### 2.2 클래스 기반 POM

```ts
export class ApisPage {
    constructor(private readonly page: Page) {}
    readonly saveButton = () => this.page.getByRole('button', { name: 'Save' });
    async create(name: string) { ... }
}
```

- ✅ `page`를 한 번만 바인딩. 긴 플로우에서 자연스럽게 읽힘 (`apisPage.create(...)`).
- ✅ 공통 크롬(내비게이션/토스트 헬퍼)을 BasePage 상속으로 공유 가능.
- ✅ 코드 재사용 비중이 커 소규모 팀이 관리할 때 유리.
- ❌ 테스트마다 인스턴스 생성이 필요 — 보통 fixture로 밀려나며(2.3), POM이 fixture 배관에 결합됨.
- ❌ 여러 팀·팀원이 프레임워크를 함께 관리하면 불필요한 상속과 긴 상속 체인이 생기기 쉬움 — 규모가 커질수록 깊은 베이스 클래스보다 조합(멤버로 `Table` 컴포넌트)을 우선할 것.

실행 가능한 예제: [patterns/pom/class-based/](../patterns/pom/class-based/) — 공통 크롬을 위한 의도적으로 얕은 `BasePage` 포함.

### 2.3 Fixture 주입 POM

생성된 페이지 객체를 fixture로 제공하여 스펙이 바로 받아 쓰게 합니다:

```ts
type Pages = { apisPage: ApisPage };
export const test = base.extend<Pages>({
    apisPage: async ({ page }, use) => { await use(new ApisPage(page)); },
});

test('create', async ({ apisPage }) => { await apisPage.create('x'); });
```

- ✅ 가장 깔끔한 스펙 시그니처. DI 스타일.
- ❌ 새 페이지 객체마다 fixture 파일을 수정해야 하며, fixture 타입이 무한히 커짐.
- ❌ 스펙이 실제로 어떤 페이지를 다루는지 가려짐 — grep 가능성이 떨어짐.
- 원 프로젝트는 스펙의 명시성을 위해 의도적으로 미채택. 페이지 객체 수나 팀 규모로 인해 생성 노이즈가 지배적이 되면 재검토.

실행 가능한 예제: [patterns/pom/fixture-injected/](../patterns/pom/fixture-injected/) — 클래스 기반 스펙과 비교해 보세요: 같은 플로우, `new` 없음.

### 2.4 컴포넌트 객체

공용 위젯(데이터 테이블, 모달, 토스트)은 루트 로케이터로 파라미터화된 자체 객체로 분리하여 페이지 간 재사용합니다. 컴포넌트가 위젯의 메커니즘을 소유하고, 각 페이지 객체는 이를 조합하며 페이지 고유의 것 — 위젯의 위치와 페이지 자체 컨트롤 — 만 담당합니다:

```ts
// data-table.ts — 컴포넌트: 루트 로케이터만 주면 어떤 테이블에도 동작
export const dataTable = {
    dataRows: (root: Locator): Locator => ...,
    // 헤더 키 행: { Name: 'x', Created: '...' } — 컬럼 순서가 바뀌어도 생존
    async parse(root: Locator): Promise<Record<string, string>[]> { ... },
    // 일치하는 행이 없으면 throw — 크게 실패 (§6.4)
    async rowByValue(root: Locator, column: string, value: string): Promise<Locator> { ... },
};

// items-page.ts — 페이지 객체가 컴포넌트를 조합
export const itemsPage = {
    locators,
    parseTable: (page: Page) => dataTable.parse(locators.table(page)),
    async deleteItemByName(page: Page, name: string): Promise<void> {
        const row = await dataTable.rowByValue(locators.table(page), 'Name', name);
        await row.getByTestId('delete-button').click();
    },
};
```

셀 인덱스가 아니라 **컬럼 헤더를 키로** 행을 파싱하는 것이 이 컴포넌트의 견고성 업그레이드입니다: 인덱스 기반 파서는 컬럼이 이동하면 조용히 깨지지만, 헤더 키 파서는 영향받지 않습니다.

- ✅ 위젯당 구현 하나 — DOM 변경을 한 번만 고치면 모든 페이지가 혜택을 받음.
- ✅ 루트 로케이터 파라미터화로 컴포넌트가 페이지에 독립적 — 같은 `dataTable`이 어떤 페이지의 테이블에도 동작.
- ❌ 간접화: 실제 셀렉터를 보려면 페이지 객체 → 컴포넌트로 건너가야 함.
- ❌ 공용 컴포넌트는 위젯 변형마다 옵션이 쌓이기 쉬움 — API가 조건문투성이가 되면 더 일반화하지 말고 변형별로 분리할 것.

실행 가능한 예제: [patterns/pom/component-object/](../patterns/pom/component-object/)

### 2.5 파싱된 데이터로 테이블 다루기

테이블을 한 번 타입 있는 행 객체로 파싱한 뒤, 행/열 텍스트 탐색이 아닌 데이터에 대해 단언하고 인터랙션합니다.

```ts
interface APISpecificationRow { current: boolean; version: string; ... }
const parseTable = async (page: Page): Promise<APISpecificationRow[]> => { ... }
```

- ✅ 단언이 데이터 비교로 읽힘(`toContainEqual`, `toMatchObject`) — 실패 시 diff도 읽기 좋음.
- ✅ 한 번 파싱해 여러 용도로 사용 — 행 개수 세기, 임의 컬럼으로 행 찾기, 인터랙션할 행 위치 찾기.
- ❌ 전체 파싱은 셀마다 프로토콜 왕복 비용 — 큰 테이블에서는 느림. 파싱 전에 필터/페이지네이션할 것.
- ❌ 파싱된 배열은 스냅샷 — UI가 다시 fetch하는 순간 낡음. 변경 후에는 반드시 재파싱하고, 액션을 건너 캐시하지 말 것.

구현 규칙:

- **`.all()` 전에 렌더를 기다릴 것** — `.all()`은 스냅샷이며 auto-wait하지 않음. 첫 행(또는 기대 개수)을 먼저 기다림.
- **모든 `textContent()`에 `.trim()`** — DOM 텍스트의 공백이 `===` 매칭을 깨뜨림.
- **탐색 실패는 크게 실패시킬 것** — `findIndex`의 `-1`이 `nth(-1)`로 흘러가면 조용히 *마지막* 행을 클릭함. 가드하고 throw.

실행 가능한 예제: [patterns/pom/stateless/items-page.ts](../patterns/pom/stateless/items-page.ts) (타입 있는 행, 세 규칙 모두 적용); 헤더 키 변형은 [patterns/pom/component-object/](../patterns/pom/component-object/) 참고.

---

## 3. Fixture 패턴

### 3.1 내장 fixture 오버라이드

API 호스트가 애플리케이션 `baseURL`과 다를 때 `request`를 오버라이드합니다:

```ts
request: async ({}, use) => {
    const context = await request.newContext({
        baseURL: apiBaseUrl,   // API 호스트 — 앱의 baseURL과 다름
        // 인증도 여기에 붙습니다: Authorization 헤더 또는 storageState (§4)
    });
    await use(context);
    await context.dispose();
},
```

- ✅ 스펙은 문서 그대로 `request`를 사용 — 오버라이드는 보이지 않음.
- ❌ README + fixture TSDoc에 크게 문서화하지 않으면 다음 엔지니어가 "왜 request가 다른 호스트를 치지?"를 반나절 디버깅하게 됨.

실행 가능한 예제: [patterns/fixtures/request-override/](../patterns/fixtures/request-override/)

### 3.2 목적 특화 auto fixture: disposal context

테스트 데이터 자동 정리를 위한 테스트 단위 undo 스택. 엔티티를 생성하는 클라이언트 함수가 스스로 undo 엔트리를 push하고, `auto` fixture가 테스트 종료 후 — 실패 시에도 — 스택을 LIFO로 비웁니다.

```ts
disposalContext: [async ({ request }, use) => {
    const disposalContext: DisposalContext = [];
    await use(disposalContext);
    await disposeContext(disposalContext, request);   // LIFO로 pop하며 undo 실행
}, { auto: true }],
```

```ts
// createApi 내부:
disposalContext.push([deleteApi, responseBody.id]);
```

- ✅ 정리가 생성 바로 옆에 위치 — 잊는 것이 불가능. 테스트 중간 실패에도 생존.
- ✅ LIFO 순서가 의존 엔티티를 처리 (자식 먼저, 부모 나중 삭제).
- ❌ 균일한 `APIClientFunction` 시그니처가 필요하며 호출 단위 타입 안전성을 잃음 (`...args: any[]`). 완화책: 제네릭 변형 `APIClientFunction<TArgs extends unknown[]>`로 둘 다 확보 가능.
- ❌ 테스트 스코프 한정. `beforeAll`에서 만든 데이터는 worker 스코프 변형이 필요.

실행 가능한 예제: [patterns/fixtures/disposal-context/](../patterns/fixtures/disposal-context/)

### 3.3 Worker 스코프 fixture

Worker 프로세스당 한 번 생성되어 그 worker가 실행하는 모든 테스트가 공유합니다 — 만들기 비싸거나, 테스트가 아닌 worker 단위로 고유해야 하는 상태에 사용합니다:

- 두 번째 제네릭 슬롯은 타입 선언이고, `{ scope: 'worker' }`가 런타임 스코프를 결정 — 둘 다 필요.
- ⚠️ Worker fixture는 공유되는 가변 상태. 읽기 전용/인증 아티팩트에는 안전하지만, 공유 자원을 변경하는 테스트는 다른 테스트의 결과에 영향을 줄 수 있음.

#### 3.3.1 공유 셋업

한 worker의 테스트 전체가 재사용하는 비싼 셋업(시드된 org, DB 커넥션)에 사용:

```ts
export const test = base.extend<{}, { seededOrg: Org }>({
    seededOrg: [async ({}, use) => { ... }, { scope: 'worker' }],
});
```

- ✅ 비싼 셋업 비용을 테스트당이 아니라 worker당 한 번만 지불.
- ❌ 상태가 worker의 실행 전체에 걸쳐 유지됨 — 한 테스트가 오염시키면 그 worker의 이후 모든 테스트에 영향.
- ❌ Teardown은 worker 종료 시에만 실행됨 — worker가 크래시하면 공유 자원이 남을 수 있음.
- ⚠️ Worker fixture는 테스트 스코프 fixture(`page`, `request`)에 의존할 수 없음 — 내부에서 자체 `APIRequestContext`를 만들 것.

실행 가능한 예제: [patterns/fixtures/worker-shared-setup/](../patterns/fixtures/worker-shared-setup/) — 두 테스트가 같은 시드 인스턴스를 받았음을 증명합니다.

#### 3.3.2 병렬 실행을 위한 worker당 테스트 계정 하나

병렬 worker들이 계정 하나를 공유하면 서로 간섭합니다 — 한 worker의 로그인이 다른 worker의 세션을 무효화할 수 있고, 데이터가 충돌합니다. Global setup(§4.1)이 테스트 계정별로 한 번씩 로그인하여 `.auth/` 아래에 계정당 인증된 `storageState` 파일 하나를 저장하고, worker fixture가 `fs`로 그 파일 목록을 읽어 목록 순서대로 worker에 할당합니다 — worker N이 N번째 파일을 가져갑니다. 상태 파일 수는 `workers` 수에 맞춥니다:

```ts
workerAuth: [async ({}, use, workerInfo) => {
    // .sort()가 중요: readdir 순서는 플랫폼에 따라 다름
    const stateFiles = fs.readdirSync(AUTH_DIR).filter((f) => f.endsWith('.json')).sort();
    const stateFile = stateFiles[workerInfo.workerIndex];
    if (!stateFile) throw new Error(`No auth state for worker #${workerInfo.workerIndex} — add accounts to .auth/`);
    await use({ username: path.basename(stateFile, '.json'), statePath: path.join(AUTH_DIR, stateFile) });
}, { scope: 'worker' }],

// 직접 할당: 내장 `storageState` 옵션을 오버라이드하면 worker의 상태 파일이
// 모든 내장 fixture에 연결됩니다 — `page`, `context`, `request` 전부 이 worker의
// 계정으로 자동 인증되며, 스펙에서 newContext를 호출할 필요가 없습니다
storageState: async ({ workerAuth }, use) => {
    await use(workerAuth.statePath);
},
```

한 worker의 모든 테스트는 그 worker의 계정을 받고, 두 worker가 세션을 공유하는 일은 없습니다. 계정 풀은 코드가 아니라 디스크에 있으므로, worker를 늘리려면 상태 파일 하나만 추가하면 됩니다. 수동 `newContext({ storageState })`는 테스트 기본값과 다른 컨텍스트가 필요할 때만 사용합니다(§3.1). 계정 접두사를 붙인 테스트 데이터 이름(§5.3)과 결합하면 완전한 병렬 격리가 됩니다.

- ✅ Worker 간 세션 완전 격리 — 로그인 경합이나 세션 무효화가 없음.
- ✅ 확장이 코드 변경이 아니라 파일 추가: worker 증가 = 상태 파일 증가.
- ❌ 실제 계정 N개를 프로비저닝하고 유지해야 함 (자격 증명, 시크릿, 만료되는 저장 세션).
- ❌ Worker 수가 풀 크기에 묶임 — 계정을 먼저 추가하지 않으면 CI에서 `workers`를 올릴 수 없음.

실행 가능한 예제: [patterns/fixtures/worker-account/](../patterns/fixtures/worker-account/)

### 3.4 옵션 fixture

환경변수 대신 오버라이드 가능한 fixture로 스위트를 파라미터화:

```ts
export const test = base.extend<{ locale: string }>({
    locale: ['en-US', { option: true }],
});
// 파일 단위: test.use({ locale: 'ja-JP' });
```

- ✅ 타입이 있고 발견 가능 — 스위트 곳곳에 흩어진 문자열 `process.env` 읽기와 달리 컴파일러가 모든 옵션을 알고 있음.
- ✅ 모든 레벨에서 오버라이드 가능: config 기본값 → 프로젝트 → 파일 단위 `test.use` — 하나의 메커니즘으로 전체 매트릭스를 처리.
- ❌ 실효 값이 어디서 오버라이드됐는지에 따라 달라짐 — "이 값을 어느 레이어가 설정했지?" 디버깅에 시간이 듦.
- ❌ 프로젝트 곱하기 옵션으로 실행 매트릭스가 빠르게 커짐 — 실제로 두 가지 구성이 필요할 때만 옵션을 추가할 것.

실행 가능한 예제: [patterns/fixtures/option-fixture/](../patterns/fixtures/option-fixture/) — 한 스펙은 기본값을 사용하고, 다른 스펙은 `test.use`로 오버라이드합니다.

### 3.5 Fixture 소스 조합

`mergeTests(apiTest, uiTest)`로 독립적으로 정의된 fixture 집합을 결합합니다. 진짜 독립적인 도메인(예: 한 레포에서 API 전용 프로젝트와 브라우저 전용 프로젝트 공존)이 생기기 전까지는 잘 정리된 fixture 파일 하나를 유지하는 편이 낫습니다.

---

## 4. 인증 패턴

### 4.1 브라우저 프로젝트당 1회 로그인 + 상태 재사용

Global setup이 **브라우저 프로젝트별로** 한 번씩 (동시에) 로그인하여 브라우저별 `storageState`를 저장하고, teardown이 각 세션을 로그아웃하고 파일을 삭제합니다.

핵심 연결 고리는 **브라우저 이름을 키로 한 상태 파일 네이밍 컨벤션**입니다: global setup이 프로젝트별로 파일 하나씩 저장하고, config가 각 프로젝트에 해당 파일을 할당하며, 컨텍스트를 다시 만드는 fixture(예: §3.1의 `request` 오버라이드)는 내장 `browserName` fixture로 같은 경로를 재구성합니다:

```ts
// playwright.config.ts — 프로젝트마다 자기 상태 파일을 할당
projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: `${AUTH_DIR_PATH}/default-user-chromium.json` } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'], storageState: `${AUTH_DIR_PATH}/default-user-firefox.json` } },
],

// 커스텀 fixture는 browserName fixture로 올바른 파일을 찾음
request: async ({ browserName }, use) => {
    const context = await request.newContext({
        baseURL: apiBaseUrl,
        storageState: `${AUTH_DIR_PATH}/default-user-${browserName}.json`,
    });
    ...
},
```

- ✅ 테스트마다가 아니라 브라우저마다 한 번씩만 human-check를 통과하는 로그인.
- ✅ 같은 상태 파일이 브라우저 컨텍스트와 API `request` 컨텍스트를 모두 인증.
- ⚠️ IdP가 봇 감지를 하는 경우 headed 로그인이 필요. Headless CI는 PAT 경로 또는 테스트 테넌트에 대한 봇 감지 예외가 필요.
- ⚠️ 브라우저별 상태 파일이 중요: 한 엔진에서 캡처한 쿠키는 UA에 종속될 수 있음. 하나의 파일을 엔진 간 공유하지 말 것.

### 4.2 API 컨텍스트의 토큰 인증

request 컨텍스트에 `Authorization: Bearer <PAT>`를 설정하면 순수 API 테스트에서 쿠키 상태를 대체합니다. UI 단언이 세션을 필요로 하지 않거나 CI가 headless여야 할 때 우선하세요. 스킴 접두사를 잊지 말 것 — 헤더에 토큰만 넣으면 아무것도 인증되지 않습니다.

### 4.3 다중 역할 인증

역할별 상태 파일(`admin.json`, `viewer.json`)을 global setup에서 캡처하고, 스펙 파일 단위로 `test.use({ storageState: ... })` 또는 옵션 fixture로 역할을 선택합니다. 공유 계정의 역할을 스위트 도중 변경하지 말 것 — 병렬 테스트가 그 변경을 관측하게 됩니다.

---

## 5. API 테스트 패턴

### 5.1 내부에서 상태 코드를 단언하는 얇은 클라이언트

```ts
export const getApi: APIClientFunction = async (request, apiId, expStatusCode = 200) => {
    const response = await request.get(`${route}/${apiId}`);
    expect(response.status()).toBe(expStatusCode);
    return response;
};
```

- ✅ 모든 호출이 기본으로 상태 검증됨. 네거티브 테스트는 기대 코드를 명시적으로 전달 (`createApi(request, bad, ctx, 400)`).
- ✅ response를 그대로 반환하므로 바디 단언은 스펙에서 수행 — 테스트의 의도가 스펙에 드러남.
- ❌ 클라이언트 내부 `expect` 실패는 스펙의 스텝이 아닌 클라이언트의 라인을 보고함 — 호출을 `test.step`으로 감싸 완화.

실행 가능한 예제: [patterns/api/thin-client/](../patterns/api/thin-client/)

### 5.2 클라이언트 생성 vs 수작성

생성된 클라이언트(openapi-generator, `openapi-typescript` + `openapi-fetch`)는 스펙 변화를 자동 추적하지만 툴체인 무게가 추가됩니다(openapi-generator는 Java 필요). 소규모 스위트/과제는 수작성, API 표면이나 변경 빈도가 커지면 생성. `openapi-typescript`는 중간 경로: *타입*만 생성, 호출은 수작성, 런타임 의존성 0.

### 5.3 병렬 안전한 데이터와 단언

- **고유한 엔티티 이름**: 프로젝트 + 타임스탬프 접미사 (`tc01-${test.info().project.name}-${Date.now()}`). 크로스 브라우저 프로젝트는 *같은 테스트*를 *같은 테넌트*에서 동시에 실행 — 하드코딩된 이름은 충돌함.
- **전역 카운트 단언 금지** (`initialCount + 1`): 동시 실행 중인 어떤 테스트가 엔티티를 생성해도 깨짐. *내* 엔티티의 존재/부재를 단언 (id로 탐색).
- 매처를 의도적으로 선택: 배열 전체 동등성은 `toEqual`, 원소 하나의 포함은 `toContainEqual`, 순서 무관 동등성은 `arrayContaining` + `toHaveLength`.

### 5.4 응답 스키마 검증

계약 테스트 스택 없이 계약 수준의 신뢰를 얻으려면 클라이언트 경계에서 `zod`(또는 생성된 타입 + 타입 가드)로 바디를 검증합니다. 필드 두 개에 대한 `toMatchObject`로는 절대 잡히지 않는 조용한 API 형태 변화를 잡아냅니다.

```ts
// 스키마가 곧 계약이며, z.infer가 같은 소스에서 TS 타입을 도출
export const ItemSchema = z.object({ id: z.uuid(), name: z.string().min(1), created_at: z.iso.datetime() });
export type Item = z.infer<typeof ItemSchema>;

// 클라이언트는 파싱되고 타입이 있는 데이터를 반환 — 드리프트는 정확한 경로와 함께 여기서 throw
export const createItem = async (request: APIRequestContext, name: string): Promise<Item> => {
    const response = await request.post(route, { data: { name } });
    expect(response.status()).toBe(201);
    return ItemSchema.parse(await response.json());
};
```

- ✅ 스키마 하나가 런타임 계약이자 컴파일 타임 타입 — 둘이 어긋날 수 없음.
- ✅ 실패가 드리프트된 페이로드를 받은 바로 그 호출에서, 정확한 필드와 경로를 지목함.
- ❌ 스키마가 실제 API를 따라가야 함 — 낡은 스키마는 정상 응답을 실패시킴. API 표면이 크면 OAS에서 생성할 것(§5.2).
- ❌ 큰 목록 응답의 모든 요소를 검증하면 시간이 듦 — 필요하면 샘플이나 첫 페이지만 검증.

실행 가능한 예제: [patterns/api/schema-validation/](../patterns/api/schema-validation/) — 드리프트 실패가 어떤 모습인지 보여주는 테스트 포함.

---

## 6. E2E/UI 테스트 패턴

### 6.1 네트워크 인지 동기화

비동기 데이터 fetch를 유발하는 액션은 *response*를 기다린 뒤 *렌더된 요소*를 기다립니다 — response만으로는 렌더가 보장되지 않습니다:

```ts
const listPromise = page.waitForResponse(r => r.url().includes('/versions?page') && r.request().method() === 'GET');
await saveButton.click();
await listPromise;
await locators.apiRows(page).first().waitFor();   // response ≠ render
```

순서가 중요합니다: `waitForResponse` 프로미스는 유발하는 클릭 **이전에** 생성해야 response와 경쟁하지 않습니다. 같은 리스닝-먼저 규칙이 모든 이벤트 대기에 적용됩니다 — `waitForEvent('filechooser')`, `waitForEvent('popup')`, `waitForEvent('download')` — 유발하는 액션과 `Promise.all`로 페어링하세요.

실행 가능한 예제: [patterns/e2e/network-sync/](../patterns/e2e/network-sync/)

### 6.2 하이브리드 API+UI 플로우

상태의 시딩과 검증은 API로 (빠르고 안정적), 브라우저는 진짜 사용자 대면 동작(파일 업로드 모달, 렌더된 스펙 내비게이션)에만 사용합니다. `test.step` 블록을 요구사항 스텝과 1:1로 매핑하면 리포트가 요구사항 그 자체로 읽힙니다.

### 6.3 의도적인 비처리

- 반응형 동작이 범위 밖일 때는 고정 뷰포트(1440×1080) — 햄버거 메뉴 브레이크포인트가 아무 이유 없이 셀렉터를 복잡하게 만들지 않도록.
- 자동으로 사라지는 컴포넌트는 가능하면 단언 경쟁 대신 무시. 3초짜리 일시적 요소에 대한 단언은 플레이키 테스트 생성기입니다.

### 6.4 실패 경로 위생

테스트 인프라에서 가장 비싼 결함은 크게 실패하지 않는 실패입니다:

| 조용한 실패 | 시끄러운 버전 |
| --- | --- |
| `findIndex` → `-1` → `nth(-1)`이 마지막 행 클릭 | 가드하고 `throw` |
| 렌더 전 테이블에 `.all()` → `[]` | 파싱 전 `first().waitFor()` |
| `getAttribute('aria-expanded')` → `"false"`는 truthy | `!== 'true'`로 비교 |
| `undefined`를 반환하는 탐색 헬퍼 | 호출자가 즉시 `expect(x).toBeDefined()` |
| DOM 텍스트에 앵커 없는 정규식 | 앵커(`$`), 스타일이 소문자화할 수 있으면 대소문자 무시 플래그 |

---

## 7. 백엔드 목킹 UI 테스트

백엔드가 테스트에 필요한 상태를 만들어줄 수 없을 때 — 백엔드가 없거나, 느리거나, 그 상태를 실제로 만들기가 비현실적일 때:

- **강제 상태**: 에러(500), 빈 목록, 실제 API가 원하는 시점에 만들어주지 않는 레이스 타이밍.
- **테스트 계정 하나로 역할별 UI 테스트**: 역할마다 계정을 프로비저닝하고 유지하는 대신, 프로필/권한 응답(`/api/me`)을 역할별로 목킹 — admin, viewer, read-only. 실행 가능한 예제: [patterns/mocked-ui/role-mocking/](../patterns/mocked-ui/role-mocking/) — 계정 하나로 같은 행이 admin 액션이 있는 상태와 없는 상태로 렌더링됩니다.
- **피처 플래그와 변형**: 플래그 서비스를 건드리지 않고, 플래그 엔드포인트를 목킹해 각 변형을 결정적으로 렌더링.
- **서드파티 API** (결제, 지도, 분석): 실제 호출은 비용이 들고, rate limit에 걸리고, 플레이키함 — 앱과 서드파티의 경계에서 목킹.
- **경계 데이터셋**: 정확히 꽉 찬 페이지, 가상 스크롤용 수천 행, 극단적인 문자열 길이 — 실제로 시딩하기 번거롭거나 느린 상태.
- **성능 저하 모드**: 429 rate limit, 503 점검 모드, 다른 엔드포인트는 성공하는데 하나만 실패, 또는 지연된 `fulfill`로 로딩 상태를 붙잡아 스피너/스켈레톤 단언.

### 7.1 라우트 인터셉션

```ts
await page.route('**/v3/apis?*', route =>
    route.fulfill({ json: { data: [], meta: { page: { total: 0 } } } }));
// 강제 에러 상태:
await page.route('**/v3/apis', route => route.fulfill({ status: 500, json: { message: 'boom' } }));
```

- ✅ 테스트마다 완전한 제어 — 어떤 상태 코드, 페이로드, 타이밍이든 백엔드 상태 셋업 없이 강제 가능.
- ✅ 빠르고 결정적: 네트워크 편차도, 공유 백엔드 간섭도 없음.
- ❌ 목은 실제 API에서 조용히 멀어짐 — 백엔드가 더 이상 보내지 않는 형태에 대해 UI 테스트가 통과할 수 있음. 얇은 라이브 E2E 계층(§7.3)과 계약 검증(§5.4)을 병행할 것.
- ❌ 수작성 페이로드는 유지보수 부담: 현실적으로 만들면 커지고, 최소로 만들면 비현실적이 됨.

구현 규칙:

- 로드 시 발생하는 요청은 `page.goto` **이전에** 라우트를 등록.
- 핸들러를 여러 층 쌓을 때는 `continue()`가 아닌 `route.fallback()`.
- 목 페이로드는 인라인 블롭이 아니라 `tests/data/`의 이름 있는 픽스처로 — 인라인 JSON은 낡아도 눈에 띄지 않습니다.

실행 가능한 예제: [patterns/mocked-ui/route-fulfill/](../patterns/mocked-ui/route-fulfill/)

### 7.2 HAR 기록/재생

```ts
await page.routeFromHAR('tests/data/hars/apis-page.har', { url: '**/api/**', update: false });
```

라이브 백엔드에 대해 한 번 기록(`update: true`)하고 밀폐적으로 재생. 안정적인 읽기 위주 페이지에 최적. API 변경 시 HAR 재생성 — 오래된 HAR는 실패할 수 없는 테스트입니다.

- ✅ 실제 기록된 페이로드 — 목을 하나도 수작성하지 않고 현실적인 형태, 헤더, 페이지네이션 확보.
- ✅ 재기록은 플래그 하나(`update: true`)로 라이브 백엔드에 대해 수행.
- ❌ HAR는 불투명한 블롭: diff 리뷰가 불가능하고, 엣지 케이스를 위해 필드 하나만 바꾸기도 비현실적 — 특정 상태 강제는 `route.fulfill`(§7.1)을 사용.
- ❌ 동적 응답은 재생이 잘 안 됨 — 기록 시점에 박힌 타임스탬프, 토큰, 생성된 id가 재생 시점과 어긋날 수 있음.

### 7.3 계층 선택

| 스위트 | 백엔드 | 목적 |
| --- | --- | --- |
| E2E (이 레포의 모델) | 라이브 | 통합된 제품이 동작함을 증명 |
| 목킹-UI | `page.route`/HAR | UI 로직, 에러/빈/엣지 상태, 속도 |
| API | 라이브 | 서비스 자체의 계약 + 동작 |

목킹-UI 테스트는 얇은 라이브 E2E 계층을 보완할 뿐 절대 대체하지 않습니다: 목은 백엔드가 발밑에서 바뀌는 것을 잡을 수 없습니다.

---

## 8. 테스트 구조

테스트 정의를 **셋업 → 테스트 → 티어다운**으로 분리하고, 각 단계를 전용 훅에 두세요: `beforeAll`, `beforeEach`, `test` 본문, `afterEach`, `afterAll`. 테스트 본문에는 검증하려는 행동과 단언만 남깁니다 — 준비와 정리가 본문에 섞이면 무엇을 검증하는 테스트인지 읽어내기 어려워집니다.

```ts
import { test, expect, request as apiRequest } from '@playwright/test';

test.describe('아이템 관리', () => {
  let seeded: { id: string; name: string };

  // 셋업 (worker당 한 번): 비싼 공유 준비.
  // beforeAll에서는 테스트 스코프 fixture(page, request)를 쓸 수 없으므로 자체 컨텍스트를 생성
  test.beforeAll(async () => {
    const api = await apiRequest.newContext({ baseURL: 'http://localhost:4173' });
    seeded = await (await api.post('/api/items', { data: { name: `seed-${Date.now()}` } })).json();
    await api.dispose();
  });

  // 셋업 (테스트마다): 시작 상태 만들기
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // 테스트 본문: 행동과 단언만
  test('시드된 아이템이 목록에 보인다', async ({ page }) => {
    await expect(page.getByTestId('item-row').filter({ hasText: seeded.name })).toBeVisible();
  });

  // 티어다운 (worker당 한 번): 시드 제거 — 테스트가 실패해도 실행됨
  test.afterAll(async () => {
    const api = await apiRequest.newContext({ baseURL: 'http://localhost:4173' });
    await api.delete(`/api/items/${seeded.id}`);
    await api.dispose();
  });
});
```

- ✅ 본문이 "무엇을 검증하는가"만 담음 — 스펙은 의도를 담는다는 §1 기본원칙의 테스트 파일 버전. 리포트의 실패 지점이 곧 검증 실패를 의미하게 됨.
- ✅ 훅의 티어다운은 테스트가 실패해도 실행됨 — 본문 끝의 인라인 정리 코드는 실패 시 건너뛰어져 데이터가 남음.
- ✅ 셋업 중복이 사라져 같은 describe에 테스트를 추가하는 비용이 낮아짐.
- ✅ 리포트/트레이스에서 훅이 별도 단계로 표시되어 셋업 실패와 검증 실패가 구분됨.
- ❌ 훅 간 상태 공유가 파일 스코프 `let` 변수로 이루어짐 — fixture보다 타입과 수명 관리가 느슨함.
- ❌ `beforeAll`/`afterAll`은 **worker당** 실행됨: `fullyParallel`로 같은 파일의 테스트가 여러 worker에 흩어지면 여러 번 실행되고, worker가 크래시 후 재시작될 때도 다시 실행됨.
- ❌ 훅이 쌓이면 테스트 하나를 이해하기 위해 파일을 위아래로 훑어야 함.
- ❌ Playwright에서는 fixture(§3)가 같은 역할의 더 조합 가능한 형태 — 재사용이 파일 단위를 넘어서면 훅을 fixture로 승격할 것. §3.2의 disposal context가 `afterEach` 정리의 일반화이고, §3.3.1이 `beforeAll` 공유 셋업의 일반화입니다.

**본문 안의 단계는 `test.step`으로.** 훅이 파일을 구조화한다면, `test.step`은 테스트 본문을 구조화합니다. 여러 단계로 이루어진 플로우를 이름 있는 step으로 감싸면 리포트와 트레이스가 단계별로 표시되어, 실패가 "테스트 어딘가"가 아니라 "어느 단계"에서 났는지 즉시 드러납니다:

```ts
test('아이템 생애주기', async ({ page, request }) => {
  const name = `step-demo-${Date.now()}`;

  await test.step('API로 아이템 생성', async () => {
    const response = await request.post('/api/items', { data: { name } });
    expect(response.status()).toBe(201);
  });

  // step은 값을 반환할 수 있음 — 단계 간 데이터 전달에 사용
  const table = await test.step('테이블 파싱', async () => {
    await page.goto('/');
    return itemsPage.parseTable(page);
  });

  await test.step('생성된 아이템 확인', async () => {
    expect(table).toContainEqual(expect.objectContaining({ name }));
  });
});
```

- ✅ 리포트 가독성: 실패가 step 이름으로 지역화됨 — 리포트만 보고도 어느 단계가 깨졌는지 알 수 있고, 트레이스 뷰어에서 step 단위로 접고 펼칠 수 있음.
- ✅ step 이름이 주석을 대체 — 코드의 주석과 달리 리포트에도 나타나는 문서.
- ✅ 요구사항 스텝과 1:1로 매핑하면 리포트가 요구사항 그 자체로 읽힘 (§6.2).
- ❌ 모든 것을 step으로 감싸면 보일러플레이트 노이즈 — 요구사항 수준의 단계에만 사용하고, 한 줄짜리 단언까지 감싸지 말 것.

---

## 9. 리포터와 리포트 후처리

### 9.1 기본 구성

```ts
reporter: [['line'], ['html']],
use: { trace: 'on-first-retry', video: 'retain-on-failure', screenshot: 'only-on-failure' },
```

터미널엔 line, 사람에겐 HTML, 아티팩트는 실패 시에만 남겨 실행을 가볍게. `trace: 'on-first-retry'`는 flake가 재현되는 바로 그 시점의 전체 트레이스를 제공합니다.

### 9.2 CI 지향 리포터

- 샤드별 `['blob']` → `npx playwright merge-reports --reporter html ./all-blobs`로 샤딩된 CI 실행을 병합 — N개의 부분 리포트 대신 하나의 병합된 HTML 리포트.
- CI 대시보드와 다운스트림 툴링에는 `['junit', { outputFile: ... }]` / `['json', ...]`.
- GitHub Actions에서는 `['github']`이 PR diff에 실패를 주석으로 표시.

### 9.3 커스텀 리포터

작은 클래스 하나로 HTML 후처리 없이 Slack 요약, flake 추적, 실행시간 예산을 구현할 수 있습니다:

```ts
class SummaryReporter implements Reporter {
    onTestEnd(test: TestCase, result: TestResult) { /* 수집 */ }
    async onEnd(result: FullResult) { /* Slack 전송 / summary.md 작성 */ }
}
// reporter: [['html'], ['./src/playwright/reporters/summary-reporter.ts']]
```

생성된 HTML을 스크래핑하기보다 커스텀 리포터(소스에서 구조화된 데이터를 직접)를 우선하세요 — HTML 리포트의 내부 포맷은 안정된 API가 아닙니다. 꼭 후처리해야 한다면 **JSON 리포터** 출력을 소비하고, HTML 리포트는 사람용 아티팩트로만 취급해 업로드하세요 (`playwright-report/` → CI 아티팩트 저장소).

실행 가능한 예제: [patterns/reporters/summary-reporter/](../patterns/reporters/summary-reporter/) — [playwright.config.ts](../playwright.config.ts)에 등록되어 매 실행마다 `test-results/summary.md`를 작성합니다.

### 9.4 어태치먼트

`testInfo.attach('payload', { body: JSON.stringify(resp), contentType: 'application/json' })`는 요청/응답 증거를 HTML 리포트 안에 인라인으로 남깁니다 — 아무도 읽지 않는 stdout에 남는 `console.log`보다 훨씬 디버깅하기 좋습니다.

---

## 10. 새 스위트를 위한 체크리스트

1. 계층화된 구조 (§1); 스펙은 의도만 표현.
2. 의도적으로 선택한 하나의 POM 스타일 (§2) — 일관성이 최적성을 이깁니다.
3. 인증은 브라우저별 1회 캡처, 종료 시 정리 (§4).
4. 생성된 모든 데이터는 스스로 undo를 큐잉 (§3.2); 이름은 병렬 실행에 고유 (§5.3).
5. 모든 비동기 fetch에 response 대기 *와* 렌더 대기 (§6.1).
6. 조용한 실패 경로 없음 (§6.4).
7. 목 계층은 라이브 계층이 상태를 강제할 수 없는 곳에만 (§7).
8. 리포트: 사람에겐 HTML, 기계에겐 JSON/JUnit, 증거는 어태치먼트로 (§9).
9. 의사결정은 ADR로 기록 — *이유*는 코드보다 오래 살아남습니다.
