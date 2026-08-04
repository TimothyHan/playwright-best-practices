// 패턴 §2.4 — 테이블 파싱 코드를 소유하는 대신 dataTable 컴포넌트를
// 조합하는 페이지 객체. 페이지는 페이지 고유의 것만 담당합니다:
// 테이블의 위치, 그리고 페이지 자체 컨트롤.
import { type Page, type Locator } from '@playwright/test';
import { dataTable } from './data-table.js';

const locators = {
  table: (page: Page): Locator => page.getByTestId('items-table'),
  nameInput: (page: Page): Locator => page.getByTestId('name-input'),
  addButton: (page: Page): Locator => page.getByTestId('add-button'),
};

export const itemsPage = {
  locators,

  async addItem(page: Page, name: string): Promise<void> {
    await locators.nameInput(page).fill(name);
    await locators.addButton(page).click();
  },

  // 테이블 조작은 컴포넌트에 위임 — 페이지에는 파싱 코드가 없음
  parseTable(page: Page) {
    return dataTable.parse(locators.table(page));
  },

  async deleteItemByName(page: Page, name: string): Promise<void> {
    const row = await dataTable.rowByValue(locators.table(page), 'Name', name);
    await row.getByTestId('delete-button').click();
  },
};
