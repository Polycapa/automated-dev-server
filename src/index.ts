import { chromium, request } from 'playwright';
import { stdin as input, stdout as output } from 'process';
import * as readline from 'readline';
import MainPage from './MainPage';

(async () => {
  const requestContext = await request.newContext();

  const chromeDebugResponse = await (
    await requestContext.get('http://127.0.0.1:9222/json/version')
  ).json();

  const wsEndpoint = chromeDebugResponse.webSocketDebuggerUrl;
  const browser = await chromium.connectOverCDP(wsEndpoint, {});
  const context = browser.contexts()[0];
  const url = process.env.URL ?? 'localhost';

  const pages = context
    .pages()
    .filter((p) => url === '*' || p.url().includes(url));

  if (!pages.length) {
    console.error(`No page found for url`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });

  const pagesClosedPromises = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const page of pages) {
    const mainPage = new MainPage(page);

    console.log(`Setting up page ${page.url()}...`);

    try {
      // eslint-disable-next-line no-await-in-loop
      await mainPage.main();
    } catch (error) {
      console.error(`Error setting up page ${page.url()}`, error);
    }

    pagesClosedPromises.push(
      new Promise<void>((resolve) => {
        page!.on('close', () => {
          rl.close();
          console.log('Page closed');
          resolve();
        });
      })
    );
  }

  const question = new Promise<void>((resolve) => {
    rl.question('Click on Enter or close all pages to exit... ', async () => {
      rl.close();
      console.log('Reloading pages to remove changes...');
      await Promise.all(pages.map((p) => p.reload()));
      resolve();
    });
  });

  await Promise.race([question, Promise.all(pagesClosedPromises)]);

  process.exit(0);
})();
