# Playwright Best Practices

Playwright 테스트 자동화 패턴 카탈로그입니다. 번들된 무의존성 타깃 앱에 대해 CI에서 통과하는 실행 가능한 예제로 뒷받침됩니다.

- 📖 **[패턴 카탈로그](./docs/playwright-best-practices.md)**

## 빠른 시작

```bash
npm install
npx playwright install chromium
npm test                # 타깃 앱을 자동으로 시작하고 모든 패턴 예제 실행
npm run report          # HTML 리포트 열기
```

타깃 앱(UI와 REST API를 갖춘 "Item Catalog", ~150ms 지연 시뮬레이션)은 [app/](./app/)에 있으며 Playwright의 `webServer`가 시작/종료합니다 — 외부 서비스, 자격 증명, 별도 셋업이 없습니다.

## 실행 가능한 패턴 예제

| 문서 섹션 | 패턴 | 예제 |
| --- | --- | --- |
| §2.1, §2.5 | 무상태 POM + 테이블 파싱 | [patterns/pom/stateless/](./patterns/pom/stateless/) |
| §2.2 | 클래스 기반 POM (얕은 BasePage) | [patterns/pom/class-based/](./patterns/pom/class-based/) |
| §2.3 | Fixture 주입 POM | [patterns/pom/fixture-injected/](./patterns/pom/fixture-injected/) |
| §2.4 | 컴포넌트 객체 (헤더 키 테이블) | [patterns/pom/component-object/](./patterns/pom/component-object/) |
| §3.1 | `request` fixture 오버라이드 | [patterns/fixtures/request-override/](./patterns/fixtures/request-override/) |
| §3.2 | Disposal context (자동 정리) | [patterns/fixtures/disposal-context/](./patterns/fixtures/disposal-context/) |
| §3.3.1 | Worker 스코프 공유 셋업 | [patterns/fixtures/worker-shared-setup/](./patterns/fixtures/worker-shared-setup/) |
| §3.3.2 | Worker별 계정 할당 | [patterns/fixtures/worker-account/](./patterns/fixtures/worker-account/) |
| §3.4 | 옵션 fixture | [patterns/fixtures/option-fixture/](./patterns/fixtures/option-fixture/) |
| §5.1, §5.3 | 얇은 API 클라이언트 + 네거티브 테스트 | [patterns/api/thin-client/](./patterns/api/thin-client/) |
| §5.4 | 응답 스키마 검증 (zod) | [patterns/api/schema-validation/](./patterns/api/schema-validation/) |
| §6.1 | 네트워크 인지 동기화 | [patterns/e2e/network-sync/](./patterns/e2e/network-sync/) |
| §7.1 | 백엔드 목킹 UI (route.fulfill) | [patterns/mocked-ui/route-fulfill/](./patterns/mocked-ui/route-fulfill/) |
| §7 | 프로필 목킹으로 역할별 UI | [patterns/mocked-ui/role-mocking/](./patterns/mocked-ui/role-mocking/) |
| §9.3 | 커스텀 리포터 | [patterns/reporters/summary-reporter/](./patterns/reporters/summary-reporter/) |

각 예제 디렉토리는 자기 완결적(fixture + 클라이언트 + 스펙)이라 실제 프로젝트의 시작점으로 그대로 복사할 수 있습니다. 아직 예제가 없는 문서화된 패턴은 백로그입니다 — 여기에 예제를 얻으면 졸업합니다.

## 저장소 레이아웃

```
├── app/                    # 밀폐형 타깃 앱 (무의존성 Node HTTP 서버 + 페이지 하나)
├── docs/                   # 패턴 카탈로그
├── patterns/               # 실행 가능한 예제, 패턴당 디렉토리 하나 (testDir)
├── playwright.config.ts    # webServer + 커스텀 summary 리포터 포함 리포터 설정
└── .github/workflows/      # CI: 타입체크 + 모든 예제를 매 push마다 실행
```

## 원칙

1. **모든 샘플은 실행되어야 합니다.** CI가 매 push마다 모든 예제를 실행합니다 — 샘플이 컴파일되지 않는 패턴 문서는 Playwright 메이저 두 번 안에 허구가 됩니다.
2. **트레이드오프는 필수입니다.** 트레이드오프가 없는 패턴 설명은 엔지니어링이 아니라 마케팅입니다.
