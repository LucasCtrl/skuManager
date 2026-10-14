# Versions and migration

Code: `src/shared/version.ts`, `src/bun/db/migrations.ts`, `src/bun/db/version.ts`, `src/bun/store.ts`, migration popup in `src/mainview/App.tsx`.

```
v[MAJOR].[MINOR].[PATCH]
```

- MAJOR: incompatible API changes.
- MINOR: new functionality, backward compatible.
- PATCH: bug fixes, backward compatible.

The version is stored in the database, so the app can check that the database matches it.

| Database version | Application version | What to do                                                                                   |
| ---------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| 1.0.2            | 1.0.2               | Both are up to date: do nothing.                                                             |
| 1.0.2            | 1.0.1               | The application is outdated: show a popup saying it needs to be updated.                     |
| 1.0.2            | 1.0.3               | The database is outdated: ask the user to back it up, then migrate it to the latest version. |

## Migration

A popup explains what will happen. On confirm, the app copies `db.sqlite` to `db.backup-v<version>-<YYYY-MM-DD>.sqlite` (`-2`, `-3`, … appended if that name exists), then migrates.

## Bumping the version

Change `APP_VERSION` in `src/shared/version.ts` (single source of truth). If the schema changes, add an entry to `src/bun/db/migrations.ts` and update `schema.ts`.
