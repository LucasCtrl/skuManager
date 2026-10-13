# Settings and language

Code: settings page in `src/mainview/App.tsx`, `src/mainview/i18n.ts`, settings storage in `src/bun/index.ts`.

1. At the top of the application, the user clicks the settings icon.
2. A dedicated page opens where the user can change settings.

Settings:

- Change the data folder. See [data-folder.md](data-folder.md).
- App and database versions (read-only).
- Theme: follow system, light or dark.
- Manual database backup.
- Language.
- Currency (not implemented yet): a single currency applied to every raw material and purchased part price. See [materials-parts.md](materials-parts.md).

The UI is in English and French (i18n).
