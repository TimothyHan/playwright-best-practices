// 패턴 §2.2 — 클래스 기반 POM: 생성자에서 `page`를 한 번만 바인딩하므로
// 매 호출마다 `page`를 넘기지 않고 플로우가 자연스럽게 읽힙니다
// (itemsPage.addItem(...)). 공통 크롬은 베이스 클래스에 두되 의도적으로
// 얕게 유지 — 한 단계까지만, 계층이 커지면 조합을 우선.
import { type Page, type Locator } from '@playwright/test';

export class BasePage {
  constructor(protected readonly page: Page) {}

  // 앱의 모든 페이지가 공유하는 크롬
  readonly heading = (): Locator => this.page.getByRole('heading', { level: 1 });

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }
}

export class ItemsPage extends BasePage {
  readonly nameInput = (): Locator => this.page.getByTestId('name-input');
  readonly addButton = (): Locator => this.page.getByTestId('add-button');
  readonly itemRows = (): Locator => this.page.getByTestId('item-row');

  async addItem(name: string): Promise<void> {
    await this.nameInput().fill(name);
    await this.addButton().click();
  }

  /** §6.4 — 일치하는 행이 없으면 아무것도 클릭하지 않는 대신 크게 실패. */
  async deleteItemByName(name: string): Promise<void> {
    const row = this.itemRows().filter({ has: this.page.getByText(name, { exact: true }) });
    if ((await row.count()) === 0) throw new Error(`"${name}" 이름의 아이템 행이 없습니다`);
    await row.getByTestId('delete-button').click();
  }
}
