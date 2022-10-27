import fs from 'fs/promises';
import path from 'path';
import { Page } from 'playwright';
import { ContextJson } from './Context';
import ContextsManager from './ContextsRunner';

export default class MainPage {
  private readonly contextsPath = process.env.CONTEXTS_PATH
    ? process.env.CONTEXTS_PATH
    : path.join(__dirname, 'contexts.json');

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async main() {
    ContextsManager.instance.setPage(this.page);
    await ContextsManager.instance.loadContexts();
    await this.generateMenu();
    this.page.on('load', () => {
      console.log(`Page ${this.page.url()} navigated, adding back menu`);
      this.generateMenu(true);
    });
  }

  private async generateMenu(skipReload = false) {
    const script = await fs.readFile(
      path.join(__dirname, 'playwright-injected-menu.js'),
      'utf-8'
    );

    if (!skipReload) {
      await this.page.reload();

      await this.page.exposeFunction(
        'playwrightContextSelected',
        async (context: string): Promise<Error | undefined> => {
          try {
            await ContextsManager.instance.runContext(context);
          } catch (error) {
            if (error instanceof Error) {
              console.error(error);
              return error;
            }
          }
          return undefined;
        }
      );
      await this.page.exposeFunction(
        'playwrightContextDeleted',
        (context: string) => {
          ContextsManager.instance.deleteContext(context);
        }
      );
      await this.page.exposeFunction(
        'playwrightSaveContext',
        (context: ContextJson) => ContextsManager.instance.saveContext(context)
      );
    }

    await this.page.addScriptTag({
      content: script,
      type: 'module',
    });

    await this.page.evaluate((initialContextList) => {
      const menu = document.createElement('playwright-injected-menu');

      menu.addEventListener('save-context', (event) => {
        if (event instanceof CustomEvent) {
          const { detail } = event;
          (window as any)
            .playwrightSaveContext?.(detail)
            .then((contexts: ContextJson[]) => {
              console.log('save', contexts);
              (menu as any).contexts = contexts;
            });
        }
      });

      menu.addEventListener('delete-context', (event) => {
        if (event instanceof CustomEvent) {
          const { detail } = event;
          (window as any).playwrightContextDeleted?.(detail);
        }
      });

      (menu as any).contexts = initialContextList;

      document.body.appendChild(menu);
    }, ContextsManager.instance.contextsList);
  }
}
