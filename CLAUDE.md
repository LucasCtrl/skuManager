Desktop application that generates product SKUs (`EK-PRD_00001`, …) and organizes each product's files in a system folder named after its SKU.

# Documentation

The specification is split by feature in `docs/`. Do not read all of it: read only the file for the feature you are working on.

| Working on                                                    | Read                                           |
| ------------------------------------------------------------- | ---------------------------------------------- |
| SKU format, status, product list, creating/viewing/editing    | [docs/products.md](docs/products.md)           |
| Raw materials and purchased parts (spec, not implemented yet) | [docs/materials-parts.md](docs/materials-parts.md) |
| Header, links between pages                                   | [docs/navigation.md](docs/navigation.md)       |
| Data folder, first launch, `1_PRODUCTS`, `db.sqlite`          | [docs/data-folder.md](docs/data-folder.md)     |
| App/database versions, migration, backup, bumping the version | [docs/versions.md](docs/versions.md)           |
| File explorer on the product page                             | [docs/file-explorer.md](docs/file-explorer.md) |
| Settings page, theme, language (i18n)                         | [docs/settings.md](docs/settings.md)           |
| Colours, fonts, shared UI components                          | [docs/design.md](docs/design.md)               |

When a feature changes, update its file in `docs/`, not this one.

# Stack

Bun, TypeScript, OXC (linter, formatter), SQLite, Drizzle. Desktop shell: Electrobun (Bun main process + system webview). UI: React.

Targets: Windows, Linux, macOS.

# Commands

Electrobun 2 uses the Hutch toolchain (`~/.hutch/bin` on PATH); the main process runs on Cottontail (Electrobun's Bun runtime).

- `hutch install` — install deps
- `hutch run start` / `hutch run dev` — build and launch (dev = watch)
- `hutch run build` — release build
- `hutch run test` — backend tests (`bun test`, store + file ops)
- `hutch run lint` / `hutch run fmt` / `hutch run typecheck`

# Layout

- `src/shared/` — RPC contract (`rpc.ts`) and `APP_VERSION` (`version.ts`, single source of truth)
- `src/bun/` — main process: `store.ts` (data folder, db, versions, products), `files.ts` (product folder ops, path guard), `db/` (drizzle schema + SQL migrations), `index.ts` (settings, RPC handlers, localhost upload server for OS drag-in)
- `src/mainview/` — React UI: `App.tsx` (shell, db gate, settings), `pages.tsx` (list, product), `ui.tsx`, `i18n.ts`, `explorer/`
