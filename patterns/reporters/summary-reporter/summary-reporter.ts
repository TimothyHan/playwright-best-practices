// 패턴 §9.3 — 생성된 HTML 리포트를 스크래핑하는 대신 커스텀 리포터.
// 소스에서 구조화된 데이터를 직접: 결과를 수집해 매 실행 후
// test-results/summary.md를 작성합니다. 필요에 따라 파일 쓰기를 Slack
// webhook / CI 어노테이션으로 교체하세요. playwright.config.ts에 등록됩니다.
import fs from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

interface CollectedResult {
  title: string;
  status: TestResult['status'];
  durationMs: number;
}

export default class SummaryReporter implements Reporter {
  private results: CollectedResult[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.push({
      title: test.titlePath().slice(2).join(' › '), // 루트 + 프로젝트 세그먼트 제거
      status: result.status,
      durationMs: result.duration,
    });
  }

  async onEnd(result: FullResult) {
    const passed = this.results.filter((r) => r.status === 'passed').length;
    const failed = this.results.filter((r) => r.status === 'failed').length;
    const skipped = this.results.filter((r) => r.status === 'skipped').length;
    const slowest = [...this.results].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);

    const lines = [
      `# 테스트 실행 요약`,
      ``,
      `- 결과: **${result.status}** (${(result.duration / 1000).toFixed(1)}s)`,
      `- 통과: ${passed} · 실패: ${failed} · 스킵: ${skipped}`,
      ``,
      `## 가장 느린 테스트`,
      ``,
      ...slowest.map((r) => `- ${(r.durationMs / 1000).toFixed(1)}s — ${r.title} (${r.status})`),
      ``,
    ];

    const outDir = path.join(process.cwd(), 'test-results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'summary.md'), lines.join('\n'));
  }

  // stdout은 line 리포터의 몫 — 여기서는 출력하지 않음
  printsToStdio() {
    return false;
  }
}
