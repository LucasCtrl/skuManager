Desktop application that generates product SKUs (`EK-PRD_00001`, …) and organizes each product's files in a system folder named after its SKU.

# Documentation

The specification is split by feature in `docs/`. Do not read all of it: read only the file for the feature you are working on.

| Working on                                                    | Read                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| SKU format, status, product list, creating/viewing/editing    | [docs/products.md](docs/products.md)                     |
| Raw materials and purchased parts, managed lists, prices      | [docs/materials-parts.md](docs/materials-parts.md)       |
| Manufactured parts, versions, composition (BOM), cost         | [docs/manufactured-parts.md](docs/manufactured-parts.md) |
| Operations and their rates                                    | [docs/operations.md](docs/operations.md)                 |
| Header, links between pages                                   | [docs/navigation.md](docs/navigation.md)                 |
| Data folder, first launch, `1_PRODUCTS`, `db.sqlite`          | [docs/data-folder.md](docs/data-folder.md)               |
| App/database versions, migration, backup, bumping the version | [docs/versions.md](docs/versions.md)                     |
| File explorer on the product page                             | [docs/file-explorer.md](docs/file-explorer.md)           |
| Settings page, theme, language (i18n)                         | [docs/settings.md](docs/settings.md)                     |
| Colours, fonts, shared UI components                          | [docs/design.md](docs/design.md)                         |

When a feature changes, update its file in `docs/`, not this one.

# Stack

Bun, TypeScript, OXC (linter, formatter), SQLite, Drizzle. Desktop shell: Electrobun (Bun main process + system webview). UI: React.

Targets: Windows, Linux, macOS.

# Commands

Electrobun 2 uses the Hutch toolchain (`~/.hutch/bin` on PATH); the main process runs on Cottontail (Electrobun's Bun runtime).

- `hutch install` — install deps
- `hutch run start` / `hutch run dev` — build and launch (dev = watch)
- `hutch run build` — release build
- `hutch run test` — backend tests (`bun test`, store, items, operations, parts, composition, file ops)
- `hutch run e2e [filter]` — Playwright UI tests: the real React UI on the real backend handlers, each spec on a fresh data folder. Failures leave a screenshot in `e2e/failures/`. Run `hutch run e2e:install` once per machine to download Chromium.
- `hutch run lint` / `hutch run fmt` / `hutch run typecheck`

# Testing a new feature

Every new feature ships with an e2e spec: add `e2e/<feature>.e2e.ts` (or extend the existing one), clicking through its UI flow and asserting what the user sees, then run `hutch run e2e` with the backend tests before committing. Seed data through `rpc` in the spec, not through the UI. Native-only handlers (folder picker, trash, system explorer) are not available in e2e.

# Layout

- `src/shared/` — RPC contract (`rpc.ts`), `APP_VERSION` (`version.ts`, single source of truth), SKU formats, part names and folders (`sku.ts`)
- `src/bun/` — main process: `store.ts` (data folder, db, versions, products), `items.ts` (materials, parts, managed lists, prices), `operations.ts` (operations, rates), `parts.ts` (manufactured parts, versions), `composition.ts` (composition lines, cost, To review, cycles, used-by), `variants.ts` (product variants, swaps), `files.ts` (SKU folder ops, path guard), `db/` (drizzle schema + SQL migrations), `handlers.ts` (RPC handlers that only need the data folder, shared with e2e), `index.ts` (settings, native RPC handlers, localhost upload server for OS drag-in)
- `src/mainview/` — React UI, one component per file where practical:
  - `App.tsx` — shell: settings and db gate, `Page` state and routing
  - `layouts/Header.tsx` — header and list links
  - `components/` — shared UI: `styles.ts` (class names), `Icon`, `Logo`, `Modal`, `Skeleton`, `text.tsx` (Rich, Code, ErrorText), `status.tsx` (badge, history, status picker), `SearchField`, `FilterChips`, `form.tsx` (Field, Req, useSubmit), `explorer/`
  - `pages/setup/` — first run, app outdated, migration; `pages/products/`; `pages/parts/` (manufactured parts, versions, composition, cost); `pages/items/` (materials and purchased parts); `pages/operations/`; `pages/settings/`
  - `i18n/` — `index.ts` (t, formatters), `en.ts`, `fr.ts`
- `e2e/` — `run.ts` (Vite + api server + Chromium runner), `rpc-shim.ts` (replaces `src/mainview/rpc.ts`), one `*.e2e.ts` spec per feature
