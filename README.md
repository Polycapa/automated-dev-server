# Automated dev server

A project to use Playwright to orchestrate an url with saved workflows (called contexts).

I use it to run recurrent tasks when working.

## Usage

```bash
npm install
npm start
```

By default, it will run on all pages with `localhost` in url.
You can specify a different url with the `URL` environment variable.

```bash
URL="https://example.com" npm start

# Using * in URL set it for all pages
URL="*" npm start
```

## Contexts

All contexts are saved in the `contexts.json` file in this directory. You can override it with the `CONTEXTS_PATH` environment variable.

```bash
CONTEXTS_PATH="/path/to/contexts.json" npm start
```

Contexts are grouped by url `host`.
