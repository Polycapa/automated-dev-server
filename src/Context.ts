import { Page } from 'playwright';
import {
  Action,
  ClickAction,
  FillAction,
  FocusAction,
  GoToAction,
  PressAction,
  RunContextAction,
  ScrollIntoViewAction,
  SelectOptionAction,
  TypeAction,
  WaitForAction,
  WaitForLoadStateAction,
} from './Actions';
import ContextsManager from './ContextsRunner';

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

  private readonly actionTimeout = 30 * 1000;

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
      case 'press':
        return this.runPressAction(updatedAction);
      case 'type':
        return this.runTypeAction(updatedAction);
      case 'run-context':
        return this.runRunContextAction(updatedAction);
      default:
        return undefined;
    }
  }

  private runClickAction({ selector }: ClickAction) {
    return this.page.locator(selector).click({
      timeout: this.actionTimeout,
    });
  }

  private runFillAction({ selector, value }: FillAction) {
    return this.page.locator(selector).fill(value, {
      timeout: this.actionTimeout,
    });
  }

  private runPressAction({ selector, value }: PressAction) {
    return this.page.locator(selector).press(value, {
      timeout: this.actionTimeout,
    });
  }

  private runTypeAction({ selector, value }: TypeAction) {
    return this.page.locator(selector).type(value, {
      timeout: this.actionTimeout,
    });
  }

  private runSelectOptionAction({ selector, value }: SelectOptionAction) {
    return this.page.locator(selector).selectOption(value, {
      timeout: this.actionTimeout,
    });
  }

  private runWaitForAction({ selector }: WaitForAction) {
    return this.page.locator(selector).waitFor({
      timeout: this.actionTimeout,
    });
  }

  private runFocusAction({ selector }: FocusAction) {
    return this.page.locator(selector).focus({
      timeout: this.actionTimeout,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  private runRunContextAction({ value }: RunContextAction) {
    const index = parseInt(value, 10);
    if (!Number.isNaN(index)) {
      return ContextsManager.instance.runContext(index);
    }
    return undefined;
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
      let prompt = '';
      const acceptPrompt = () => {};

      this.page.on('dialog', acceptPrompt);

      prompt = await this.page.evaluate(
        () => window.prompt('Enter value') ?? ''
      );

      this.page.off('dialog', acceptPrompt);

      return prompt;
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
      case 'press':
      case 'type':
        return {
          ...action,
          selector: selector ?? action.selector,
          value: value ?? action.value,
        };
      case 'wait-for-load-state':
      case 'run-context':
      case 'go-to':
        return { ...action, value: value ?? action.value };
      default:
        return action;
    }
  }
}
