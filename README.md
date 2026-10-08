# SKU Manager

Desktop app to create product SKUs and keep each product's files in its own folder.

- Every product gets a unique, never-reused SKU: `EK-PRD_00001`, `EK-PRD_00002`, …
- Products have a name, description and status (**In development**, **Active**, **Retired**), with a status history.
- Each SKU has a folder you can manage from inside the app: drag files in from your system file explorer, create folders, rename, duplicate, cut/copy/paste, move to trash, open with the default app.
- English and French, light and dark themes.
- Runs on Windows, macOS (Apple Silicon) and Linux.

## Install

Download the installer for your system from the [latest release](../../releases/latest).

| System  | File                                |
| ------- | ----------------------------------- |
| Windows | `windows-x64-SKUManager-Setup.*`    |
| macOS   | `macos-arm64-SKUManager-Setup.*`    |
| Linux   | `linux-x64-SKUManager-Setup.tar.gz` |

- **macOS:** builds are not signed. The first time, right-click the app and choose **Open**.
- **Linux:** needs WebKitGTK (`libwebkit2gtk-4.1`), which most desktops already have.

## Data folder

On first launch, choose a data folder. Pick an empty folder to start fresh, or an existing one to keep working with its data. Nothing in it is ever deleted.

```
<data folder>/
├── 1_PRODUCTS/
│   ├── EK-PRD_00001/   ← one folder per SKU, your files go here
│   └── EK-PRD_00002/
├── db.sqlite           ← products, status history, database version
└── db.backup-v1.0.0-2026-10-08.sqlite   ← backups (Settings → Back up now)
```

The data folder holds a SQLite database, which is not safe for several people to edit at once. Use it from one computer at a time.

### Versions

The app checks the version stored in `db.sqlite` when it opens a folder:

- **Same version:** the folder opens.
- **Database newer than the app:** the app asks you to update it, and changes nothing.
- **Database older than the app:** the app backs up `db.sqlite` next to it, then migrates it.

## Development

Stack: [Electrobun](https://electrobun.dev) 2 (Bun-based main process plus the system webview), React, Tailwind, SQLite with Drizzle, and OXC (oxlint, oxfmt).

Electrobun 2 uses the **Hutch** toolchain. Install it from <https://hutch.blackboard.sh>, or run `npx electrobun init` once. Either way, `hutch` must end up on your `PATH`. [Bun](https://bun.sh) is needed for the tests.

```sh
hutch install          # dependencies
hutch run dev          # build and launch, rebuilds on change
hutch run test         # backend tests (bun test)
hutch run lint         # oxlint
hutch run fmt          # oxfmt (fmt:check in CI)
hutch run typecheck    # tsc
hutch run build        # release build into artifacts/
```

Code layout:

- `src/shared/` holds the RPC contract between UI and main process, and `APP_VERSION`.
- `src/bun/` is the main process: data folder and database (`store.ts`), product file operations (`files.ts`), migrations (`db/`).
- `src/mainview/` is the React UI. Shared components are in `ui.tsx`; the design tokens are in `index.css`.

## Releasing

1. Bump `APP_VERSION` in `src/shared/version.ts`. If the database schema changed, add a migration to `src/bun/db/migrations.ts` and update `schema.ts`.
2. Commit, then publish a GitHub release tagged `v<APP_VERSION>`, for example `v1.0.1`.
3. The [release workflow](.github/workflows/release.yml) checks the code, builds on Windows, macOS and Linux, and attaches the installers to the release.

The workflow can also be started by hand from the Actions tab. That builds the installers as workflow artifacts without touching any release.

## License

[MIT](LICENSE)
