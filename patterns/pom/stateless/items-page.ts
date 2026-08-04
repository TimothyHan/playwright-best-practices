// 패턴 §2.1 + §2.5 — 무상태 함수형 POM과 테이블 파싱.
// 클래스도, 저장된 상태도 없음: 모든 함수가 `page`를 인자로 받습니다.
// 로케이터를 export하므로 스펙에서 expect()로 직접 조합할 수 있습니다.
import { type Page, type Locator } from '@playwright/test';

const locators = {
  nameInput: (page: Page): Locator => page.getByTestId('name-input'),
  addButton: (page: Page): Locator => page.getByTestId('add-button'),
  itemRows: (page: Page): Locator => page.getByTestId('item-row'),
  emptyState: (page: Page): Locator => page.getByTestId('empty-state'),
  errorState: (page: Page): Locator => page.getByTestId('error-state'),
  deleteButtonInRow: (row: Locator): Locator => row.getByTestId('delete-button'),
};

/** 아이템 테이블의 파싱된 행 하나. */
export interface ItemRow {
  name: string;
  created: string;
}

/**
 * §2.5 — 테이블을 한 번 타입 있는 행으로 파싱하고, 데이터에 대해 단언/인터랙션.
 * 경험으로 얻은 규칙 반영: `.all()` 전에 렌더를 기다림(`.all()`은 스냅샷이며
 * auto-wait하지 않음), 모든 textContent 읽기에 `.trim()`.
 * 최소 한 행을 기대함 — 빈 테이블 단언에는 사용하지 말 것.
 */
const parseTable = async (page: Page): Promise<ItemRow[]> => {
  await locators.itemRows(page).first().waitFor();
  const rows = await locators.itemRows(page).all();
  const parsed: ItemRow[] = [];
  for (const row of rows) {
    const cells = await row.getByRole('cell').all();
    parsed.push({
      name: (await cells.at(0)?.textContent() ?? '').trim(),
      created: (await cells.at(1)?.textContent() ?? '').trim(),
    });
  }
  return parsed;
};

export const itemsPage = {
  locators,
  parseTable,

  async addItem(page: Page, name: string): Promise<void> {
    await locators.nameInput(page).fill(name);
    await locators.addButton(page).click();
  },

  /**
   * §6.4 — 탐색 실패는 크게 실패시킬 것: findIndex의 -1이 nth(-1)로 흘러가면
   * 조용히 마지막 행을 클릭하게 됨. 대신 가드하고 throw.
   */
  async deleteItemByName(page: Page, name: string): Promise<void> {
    const table = await parseTable(page);
    const index = table.findIndex((row) => row.name === name);
    if (index === -1) throw new Error(`"${name}" 이름의 아이템 행이 없습니다`);
    await locators.deleteButtonInRow(locators.itemRows(page).nth(index)).click();
  },
};
