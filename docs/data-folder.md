# Data folder

Code: `src/bun/store.ts` (open, inspect), `src/bun/index.ts` (settings), first-run screen in `src/mainview/App.tsx`.

When the app opens for the first time, the user selects the folder where the data is stored. It contains:

- `1_PRODUCTS/`: each time a product SKU is created, the app creates a folder here named after the SKU.
- `2_MATERIALS/` (not implemented yet): same, for raw material SKUs. See [materials-parts.md](materials-parts.md).
- `3_PARTS/` (not implemented yet): same, for purchased part SKUs.
- `db.sqlite`: SQLite database with every product, raw material and purchased part detail (SKU, name, description, status, …) and the application version.

Rules:

- If the folder already contains data, never delete it. Work with the existing data.
- If the folder is empty, create the database and the folder structure.
- Single user only. Shared and network folders are not supported.
- The chosen folder path is stored in the per-user app config dir, not in the data folder.
