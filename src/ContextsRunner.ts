/* eslint-disable no-use-before-define */
import fs from 'fs/promises';
import path from 'path';
import { Page } from 'playwright';
import { Context, ContextJson } from './Context';

export default class ContextsManager {
  get contextsList() {
    return this.contexts.map((context) => context.toJSON());
  }

  private static _instance: ContextsManager;

  private page?: Page;

  private readonly contextsPath = process.env.CONTEXTS_PATH
    ? process.env.CONTEXTS_PATH
    : path.join(__dirname, 'contexts.json');

  private get contextsKey() {
    if (!this.page) {
      throw new Error('Page not set');
    }

    const url = new URL(this.page.url());
    return url.host;
  }

  static get instance(): ContextsManager {
    if (!this._instance) {
      this._instance = new ContextsManager();
    }
    return this._instance;
  }

  private contexts: Context[] = [];

  deleteContext(contextName: string) {
    this.contexts = this.contexts.filter((c) => c.name !== contextName);
    return this.writeContexts();
  }

  async loadContexts() {
    if (!this.page) {
      throw new Error('Page not set');
    }

    try {
      const data = await fs.readFile(this.contextsPath, 'utf8');

      const contexts = JSON.parse(data) as Record<string, ContextJson[]>;

      const contextsList = contexts[this.contextsKey] || [];

      ContextsManager.instance.setContexts(
        contextsList.map(
          (context) => new Context(this.page!, context.value, context.actions)
        )
      );
    } catch (error) {
      ContextsManager.instance.setContexts([]);
    }
  }

  async saveContext(context: ContextJson) {
    if (!this.page) {
      throw new Error('Page not set');
    }

    const hasContext = !!this.contexts.find((c) => c.name === context.value);
    this.contexts = hasContext
      ? this.contexts.map((c) => {
          if (c.name === context.value) {
            return new Context(this.page!, context.value, context.actions);
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

  private setContexts(contexts: Context[]) {
    this.contexts = contexts;
  }

  setPage(page: Page) {
    this.page = page;
  }

  runContext(contextName: string | number): Promise<void> {
    const context =
      typeof contextName === 'string'
        ? this.contexts.find((c) => c.name === contextName)
        : this.contexts[contextName];

    if (context) {
      return context.run();
    }
    return Promise.resolve();
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
