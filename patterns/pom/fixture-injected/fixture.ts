// 패턴 §2.3 — Fixture 주입 POM: 페이지 객체를 fixture 안에서 생성하므로
// 스펙은 완성된 객체를 받아 쓰고 `new`를 쓰지 않습니다.
// 트레이드오프(§2.3): 새 페이지 객체마다 이 파일을 수정해야 하고,
// 스펙의 import만 봐서는 어떤 페이지를 다루는지 드러나지 않습니다.
import { test as base, type Page, type Locator } from '@playwright/test';

// 페이지 객체는 클래스(§2.2) — 예제 디렉토리의 자기 완결성을 위해
// 여기에 슬림 버전을 그대로 둡니다.
export class ItemsPage {
  constructor(private readonly page: Page) {}

  readonly itemRows = (): Locator => this.page.getByTestId('item-row');

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async addItem(name: string): Promise<void> {
    await this.page.getByTestId('name-input').fill(name);
    await this.page.getByTestId('add-button').click();
  }

  async deleteItemByName(name: string): Promise<void> {
    const row = this.itemRows().filter({ has: this.page.getByText(name, { exact: true }) });
    if ((await row.count()) === 0) throw new Error(`"${name}" 이름의 아이템 행이 없습니다`);
    await row.getByTestId('delete-button').click();
  }
}

// 페이지 객체당 fixture 하나 — 페이지가 늘수록 타입 유니온도 커짐 (§2.3 ❌).
type Pages = {
  itemsPage: ItemsPage;
};

export const test = base.extend<Pages>({
  itemsPage: async ({ page }, use) => {
    await use(new ItemsPage(page));
  },
});

export { expect } from '@playwright/test';
