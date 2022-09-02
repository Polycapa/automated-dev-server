import fs from 'fs/promises';
import path from 'path';
import { Page } from 'playwright';
import { Context, ContextJson } from './Context';

export default class MainPage {
  private get contextsList() {
    return this.contexts.map((context) => context.toJSON());
  }

  private contexts: Context[] = [];

  private readonly contextsPath = process.env.CONTEXTS_PATH
    ? process.env.CONTEXTS_PATH
    : path.join(__dirname, 'contexts.json');

  private readonly page: Page;

  private get contextsKey() {
    const url = new URL(this.page.url());
    return url.host;
  }

  constructor(page: Page) {
    this.page = page;
  }

  async main() {
    this.page.on('dialog', (dialog) => dialog.accept());
    await this.loadContexts();
    await this.generateMenu();
  }

  private contextSelected(contextName: string): Promise<void> {
    const context = this.contexts.find((c) => c.name === contextName);

    if (context) {
      return context.run();
    }
    return Promise.resolve();
  }

  private async loadContexts() {
    try {
      const data = await fs.readFile(this.contextsPath, 'utf8');

      const contexts = JSON.parse(data) as Record<string, ContextJson[]>;

      const contextsList = contexts[this.contextsKey] || [];

      this.contexts = contextsList.map(
        (context) => new Context(this.page, context.value, context.actions)
      );
    } catch (error) {
      this.contexts = [];
    }
  }

  private deleteContext(contextName: string) {
    this.contexts = this.contexts.filter((c) => c.name !== contextName);
    return this.writeContexts();
  }

  private async generateMenu() {
    const script = await fs.readFile(
      path.join(__dirname, 'playwright-injected-menu.js'),
      'utf-8'
    );

    await this.page.reload();

    await this.page.addScriptTag({
      content: script,
      type: 'module',
    });

    await this.page.exposeFunction(
      'playwrightContextSelected',
      async (context: string): Promise<Error | undefined> => {
        try {
          await this.contextSelected(context);
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
        this.deleteContext(context);
      }
    );
    await this.page.exposeFunction(
      'playwrightSaveContext',
      (context: ContextJson) => this.saveContext(context)
    );

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
    }, this.contextsList);
  }

  private async saveContext(context: ContextJson) {
    const hasContext = !!this.contexts.find((c) => c.name === context.value);
    this.contexts = hasContext
      ? this.contexts.map((c) => {
          if (c.name === context.value) {
            return new Context(this.page, context.value, context.actions);
          }

          return c;
        })
      : [
          ...this.contexts,
          new Context(this.page, context.value, context.actions),
        ];

    await this.writeContexts();

    return this.contextsList;
  }

  private async writeContexts() {
    let contexts: Record<string, ContextJson[]> = {};

    try {
      const data = await fs.readFile(this.contextsPath, 'utf8');

      contexts = JSON.parse(data) as Record<string, ContextJson[]>;
    } catch (error) {
      console.error(error);
    }

    return fs.writeFile(
      this.contextsPath,
      JSON.stringify(
        {
          ...contexts,
          [this.contextsKey]: this.contextsList,
        },
        null,
        2
      )
    );
  }
}
