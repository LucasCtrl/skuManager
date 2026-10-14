# Data folder

Code: `src/bun/store.ts` (open, inspect), `src/bun/index.ts` (settings), first-run screen in `src/mainview/App.tsx`.

When the app opens for the first time, the user selects the folder where the data is stored. It contains:

- `1_PRODUCTS/`: each time a product SKU is created, the app creates a folder here named after the SKU.
- `2_PARTS/` (reserved for a future release): same, for manufactured part SKUs. Not specified yet.
- `3_MATERIALS/`: same, for raw material SKUs. See [materials-parts.md](materials-parts.md).
- `4_PARTS/`: same, for purchased part SKUs.
- `db.sqlite`: SQLite database with every product, raw material and purchased part detail (SKU, name, description, status, …) and the application version.

Rules:

- If the folder already contains data, never delete it. Work with the existing data.
- If the folder is empty, create the database and the folder structure.
- If the folder has files but no `db.sqlite`, create the database and the folders next to the existing files.
- On every open, create any missing data folder (`1_PRODUCTS/`, and later `3_MATERIALS/`, `4_PARTS/`), for example in a folder made by an older version.
- Changing the data folder in the settings opens the new folder. Nothing is moved or copied from the old one.
- Single user only. Shared and network folders are not supported.
- The chosen folder path is stored in the per-user app config dir, not in the data folder.
