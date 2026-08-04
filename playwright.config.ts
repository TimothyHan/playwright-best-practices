import { defineConfig, devices } from '@playwright/test';

const APP_URL = 'http://localhost:4173';

export default defineConfig({
  testDir: './patterns',
  testMatch: /.*\.test\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['line'],
    ['html', { open: 'never' }],
    // §9.3 커스텀 리포터 — 매 실행 후 test-results/summary.md 작성
    ['./patterns/reporters/summary-reporter/summary-reporter.ts'],
  ],
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // 밀폐형 타깃 앱 — Playwright가 실행 전후로 시작/종료
  webServer: {
    command: 'node app/server.mjs',
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
