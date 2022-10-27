import { Page } from 'playwright';
import {
  Action,
  ClickAction,
  FillAction,
  FocusAction,
  GoToAction,
  ScrollIntoViewAction,
  SelectOptionAction,
  WaitForAction,
  WaitForLoadStateAction,
} from './Actions';

export type ContextJson = {
  actions: Action[];
  value: string;
};

export class Context {
  get name() {
    return this._name;
  }

  private readonly page: Page;

  private readonly _name: string;

  private readonly actions: Action[];

  constructor(page: Page, name: string, actions: Action[]) {
    this.page = page;
    this._name = name;
    this.actions = actions;
  }

  async run() {
    // eslint-disable-next-line no-restricted-syntax
    for (const action of this.actions) {
      // eslint-disable-next-line no-await-in-loop
      await this.runAction(action);
    }
  }

  toJSON(): ContextJson {
    return {
      actions: this.actions,
      value: this.name,
    };
  }

  private async runAction(action: Action) {
    const updatedAction = await this.prepareAction(action);
    switch (updatedAction.type) {
      case 'click':
        return this.runClickAction(updatedAction);
      case 'fill':
        return this.runFillAction(updatedAction);
      case 'select-option':
        return this.runSelectOptionAction(updatedAction);
      case 'wait-for':
        return this.runWaitForAction(updatedAction);
      case 'focus':
        return this.runFocusAction(updatedAction);
      case 'wait-for-load-state':
        return this.runWaitForLoadStateAction(updatedAction);
      case 'scroll-into-view':
        return this.runScrollIntoViewAction(updatedAction);
      case 'go-to':
        return this.runGoToAction(updatedAction);
      default:
        return undefined;
    }
  }

  private runClickAction({ selector }: ClickAction) {
    return this.page.locator(selector).click({
      timeout: 1000,
    });
  }

  private runFillAction({ selector, value }: FillAction) {
    return this.page.locator(selector).fill(value);
  }

  private runSelectOptionAction({ selector, value }: SelectOptionAction) {
    return this.page.locator(selector).selectOption(value);
  }

  private runWaitForAction({ selector }: WaitForAction) {
    return this.page.locator(selector).waitFor();
  }

  private runFocusAction({ selector }: FocusAction) {
    return this.page.locator(selector).focus();
  }

  private runWaitForLoadStateAction({
    value,
  }: WaitForLoadStateAction): Promise<void | undefined> {
    if (
      value === 'domcontentloaded' ||
      value === 'load' ||
      value === 'networkidle'
    ) {
      return this.page.waitForLoadState(value);
    }
    return Promise.resolve();
  }

  private runScrollIntoViewAction({ selector }: ScrollIntoViewAction) {
    return this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  private runGoToAction({ value }: GoToAction) {
    return this.page.goto(value);
  }

  private async getDynamicValue(value = ''): Promise<string> {
    if (value.startsWith('env:')) {
      return process.env[value.slice(4)] ?? '';
    }

    if (value === '$input') {
      return this.page.evaluate(() => prompt('Enter value') ?? '');
    }

    return value;
  }

  private async prepareAction(action: Action): Promise<Action> {
    const value =
      'value' in action ? await this.getDynamicValue(action.value) : undefined;
    const selector =
      'selector' in action
        ? await this.getDynamicValue(action.selector)
        : undefined;

    switch (action.type) {
      case 'click':
      case 'wait-for':
      case 'focus':
      case 'scroll-into-view':
        return { ...action, selector: selector ?? action.selector };
      case 'fill':
      case 'select-option':
        return {
          ...action,
          selector: selector ?? action.selector,
          value: value ?? action.value,
        };
      case 'wait-for-load-state':
      case 'go-to':
        return { ...action, value: value ?? action.value };
      default:
        return action;
    }
  }
}
