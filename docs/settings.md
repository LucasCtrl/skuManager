# Settings and language

Code: settings page in `src/mainview/App.tsx`, `src/mainview/i18n.ts`, settings storage in `src/bun/index.ts`.

A dedicated page, opened from the settings icon in the header. See [navigation.md](navigation.md).

Settings:

- Change the data folder. See [data-folder.md](data-folder.md).
- App and database versions (read-only).
- Theme: follow system, light or dark.
- Manual database backup.
- Language.
- Currency (not implemented yet): a single currency symbol displayed with every raw material and purchased part price. It can be changed at any time; stored prices are not converted. See [materials-parts.md](materials-parts.md).
- Price units (not implemented yet): the list of units available for raw material and purchased part prices. Units can be added but not changed or deleted; adding one asks for confirmation. See [materials-parts.md](materials-parts.md).
- Sellers, material types, part types, colours and finishes (not implemented yet): the only place where they are created. Adding one asks for confirmation; an entry cannot be changed or deleted once created. See [materials-parts.md](materials-parts.md).

The UI is in English and French (i18n).
