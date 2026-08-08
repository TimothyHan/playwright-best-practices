// 패턴 §2.4 — 컴포넌트 객체: 공용 위젯을 루트 로케이터로 파라미터화된
// 자체 객체로 추출해 어떤 페이지에서도 재사용합니다.
// pom/stateless/items-page.ts의 페이지 전용 파서와 비교해 보세요 —
// 이 파일이 그 파서를 추출해 일반화한 버전입니다.
import { type Locator } from '@playwright/test';

/**
 * 헤더 키 테이블 파싱: 행이 { [컬럼헤더]: 셀텍스트 } 형태로 반환됩니다.
 * 셀 인덱스가 아니라 헤더를 키로 쓰면 컬럼 순서가 바뀌어도 생존 —
 * 인덱스 기반 파서는 컬럼이 이동하면 조용히 깨집니다.
 */
export const dataTable = {
  headerRow: (root: Locator): Locator => root.getByRole('row').first(),
  dataRows: (root: Locator): Locator => root.getByRole('row').filter({ has: root.page().getByRole('cell') }),

  async headers(root: Locator): Promise<string[]> {
    // 원자적 읽기 — 헤더는 정적이라 위험은 낮지만(R6 가드), parse()와 동일한
    // 규칙을 따른다: 스냅샷과 읽기 사이에 await 공백을 두지 않는다.
    const texts = await this.headerRow(root)
      .getByRole('columnheader')
      .evaluateAll((cells) => cells.map((cell) => (cell.textContent ?? '').trim()));
    return texts.map((text, index) => text || `col${index}`); // 이름 없는 컬럼(예: 액션)은 위치 키
  },

  async parse(root: Locator): Promise<Record<string, string>[]> {
    // 스냅샷 전에 최소 한 개의 데이터 행을 기다림 (§2.5 / §6.4)
    await this.dataRows(root).first().waitFor();
    const headers = await this.headers(root);
    // 원자적 읽기: 행/셀 텍스트를 브라우저 안에서 한 번에 수집.
    // `.all()` 후 셀마다 textContent()를 await하는 방식은 스냅샷과 읽기
    // 사이에 공백이 생겨, 동시 실행 중인 다른 테스트가 행을 지우면
    // 사라진 요소를 auto-wait하다 타임아웃까지 매달린다 (실전 확인).
    const rowTexts = await this.dataRows(root).evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('[role="cell"], td')).map(
          (cell) => (cell.textContent ?? '').trim(),
        ),
      ),
    );
    return rowTexts.map((cells) => {
      const entry: Record<string, string> = {};
      cells.forEach((text, index) => {
        entry[headers[index] ?? `col${index}`] = text;
      });
      return entry;
    });
  },

  /**
   * `column` 셀의 값이 `value`와 일치하는 데이터 행의 로케이터.
   * 크게 실패(§6.4): 일치하는 행이 없으면 아무것도 가리키지 않는
   * 로케이터를 반환하는 대신 throw합니다.
   */
  async rowByValue(root: Locator, column: string, value: string): Promise<Locator> {
    const table = await this.parse(root);
    const index = table.findIndex((row) => row[column] === value);
    if (index === -1) throw new Error(`"${column}"이 "${value}"인 행이 없습니다`);
    // 인덱스가 아니라 내용으로 앵커: parse와 사용 사이에 다른 테스트가 행을
    // 추가/삭제하면 nth(index)는 조용히 다른 행을 가리킨다. exact-match
    // 필터는 대상 행 자체에 고정된다.
    return this.dataRows(root).filter({ has: root.page().getByText(value, { exact: true }) });
  },
};
