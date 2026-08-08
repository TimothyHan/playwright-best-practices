// 패턴 §3.3.2 — 파일시스템에서 발견하는 worker별 계정 할당.
// 문제: 병렬 worker들이 테스트 계정 하나를 공유하면 서로 간섭 —
// 한 worker의 로그인이 다른 worker의 세션을 무효화하고, 데이터가 충돌.
// 해결: global setup(§4.1)이 계정별로 한 번씩 로그인해 .auth/ 아래에
// 계정당 인증된 storageState 파일 하나를 저장. 이 worker 스코프 fixture가
// fs로 파일 목록을 읽어 목록 순서대로 worker에 할당 — worker N이 N번째
// 파일을 가져감. 상태 파일 수는 `workers` 수에 맞출 것.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base } from '@playwright/test';

const AUTH_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '.auth');

export interface WorkerAuth {
  /** 상태 파일 이름에서 도출한 계정 이름. */
  username: string;
  /** 이 worker의 인증된 storageState 파일 경로. */
  statePath: string;
}

export const test = base.extend<{}, { workerAuth: WorkerAuth }>({
  workerAuth: [
    async ({}, use, workerInfo) => {
      // .sort()가 중요: readdir 순서는 플랫폼에 따라 다름 — 없으면
      // worker→계정 매핑이 실행/머신마다 달라짐
      const stateFiles = fs
        .readdirSync(AUTH_DIR)
        .filter((file) => file.endsWith('.json'))
        .sort();

      // 데모는 어떤 worker 수에서도 돌아가도록 모듈로 연산을 사용.
      // parallelIndex: 안정적인 슬롯(0..workers-1). workerIndex는 worker
      // 재시작(크래시 후 등) 시 계속 증가해 풀 할당에 쓰면 범위를 벗어난다.
      // 실제 스위트는 worker당 파일 하나를 유지하고 크게 실패시킬 것:
      //   const stateFile = stateFiles[workerInfo.parallelIndex];
      //   if (!stateFile) throw new Error(`worker 슬롯 #${workerInfo.parallelIndex}의 인증 상태가 없습니다 — .auth/에 계정을 추가하세요`);
      const stateFile = stateFiles[workerInfo.parallelIndex % stateFiles.length]!;

      const auth: WorkerAuth = {
        username: path.basename(stateFile, '.json'),
        statePath: path.join(AUTH_DIR, stateFile),
      };
      await use(auth);
    },
    { scope: 'worker' },
  ],

  // 직접 할당: 내장 `storageState` 옵션을 오버라이드하면 worker의 상태 파일이
  // 모든 내장 fixture에 연결됩니다 — `page`, `context`, `request` 전부 이
  // worker의 계정으로 자동 인증. 스펙에서 newContext를 호출할 필요가 없으며,
  // 수동 컨텍스트(§3.1)는 테스트 기본값과 달라야 할 때만 필요합니다.
  storageState: async ({ workerAuth }, use) => {
    await use(workerAuth.statePath);
  },
});

export { expect } from '@playwright/test';
