Application to generate SKU and organized them in system folder.

# SKU structure

```
EK-PRD_[ID5]
```
`[ID5]` is a numbered value of 5 number representing an unique ID. Each product have an unique ID.

# SKU status
Each SKU can have the following status:
- `In development`: Product that is currently being worked on,
- `Active`: Product that can be produced, sold, ...,
- `Retired`: Product that is now retired and now longer relevant.

When a product is created, the status is set to `In development` by default. That mean the product is not ready to be manufactured/sold yet.
The user can then choose to set the status to `Active` or `Retired`.
`Active` means the product is ready for manufacturing/selling.
`Retired` means the product reached it's end of life, the status is important to keep an archive allowing the user to check old products datas or to re-activate it and to prevent deleting/reassigning an SKU.

# Folders
When the app opens for the first time, the user can select a folder where the data will be located.
This folder will contains :
- `1_PRODUCTS` folder. Every time a new SKU is created, the app create a new folder inside this one. The newly created folder will have the name of the newly create SKU.
- `db.sqlite` SQLite database. In this file, the application will store all details about SKU (SKU, name, description, status, ...) as well as the application version.

If the folder already contains data, do not delete them. Work with the existing data.
If the folder is empty, create the database and the folders structure.

# Application versions
Versions are named as follow:
```
v[MAJOR].[MINOR].[PATCH]
```
- MAJOR version increments indicate incompatible API changes
- MINOR version increments add functionality in a backward-compatible manner
- PATCH version increments are for backward-compatible bug fixes

The version is stored in the database, this ensure the database is up to date against the application.
## Examples
| Database version | Application version | What to do in that case |
| ----- | ----- | ----- |
| 1.0.2 | 1.0.2 | Database and application are up to date, do nothing |
| 1.0.2 | 1.0.1 | Application is not up to date, display a popup telling the application needs to be updated |
| 1.0.2 | 1.0.3 | Database is not up to date, ask the user to backup the database, then perform a database migration on the latest version |

# User stories
## Opening the application
1. The user opens the desktop applicaton
2. The application opens and display a product list.
   The product list is contructed as follow:
   - A search bar at the top; the user can search a product SKU, name or description. While writing in the search bar the app refresh the product list
   - On the right of the search bar, a button to create a new product
   - Below the search bar and the button, the product list. Each product can be clicked to go to a dedicated product page.
## Creating new product
1. The users clicks on the button to create a new product
2. The app open a popup asking for a product name and description
3. The user can then validate the creation of the product or cancel it
4. If:
  - The product creation was validated, the app redirect the user to the product page. In the background, the app create a system folder with the SKU
  - The product creation was canceled, the app redirect the user to the product list
## Viewing a product
1. The users searchs and/or clicks on the product he wants to view
2. The application opens and display the product.
   The product view is contructed as follow:
   - The product details at the top; the app display the SKU, name, description and status of the product
   - Next to the product details, a button to edit the product
   - Below the product details and edit button, an area to display the SKU system folder content. This area needs to be editable like a real file explorer :
     - Copy/Paste files from system file explorer to the app,
     - Right-click with `New folder`, `Rename`, ...
     - Multi file selection to:
       - Drag-and-drop them in a new folder
       - Delete them
       - Make copy of them
       - ...
     - Delete
     - ...
## Editing a product
1. The users searchs and/or clicks on the product he wants to edit
2. The application opens and display the product
3. Next to the product name, description, status, the user can click an edit button.
4. The app open a popup asking for a product name, description and status
5. The user can then validate the edition of the product or cancel it
6. If:
  - The product edition was validated, the app redirect the user to the product page and update the product
  - The product creation was canceled, the app redirect the user to the product page without editing data
## Change app setting
1. The user opens the desktop application
2. At the top of the application, the user clicks on a setting icon
3. A dedicated page opens allowing the user to change settings

# Stack
Bun, Typescript, OXC (linter, formatter), sqlite, drizzle

# Decisions (v1)
- Desktop shell: Electrobun (Bun main process + system webview). UI: React.
- Targets: Windows, Linux, macOS. Single user only (no shared/network folder support).
- SKU ID: sequential, `max(id) + 1`, starting at `00001`. Never reused (Retired keeps its number).
- Status values: `In development` (default), `Active`, `Retired`.
- Product fields: SKU, name (required, not unique), description (optional), status, created_at, updated_at.
- Status history table: logs every status change with a timestamp.
- Product list: status badge + filter chips (All / In development / Active / Retired).
- File explorer v1: browse, new folder, rename, delete (to OS trash), duplicate, multi-select, internal drag-and-drop move, drag-in from OS, double-click opens with default app, "Show in system explorer". OS clipboard Ctrl+C/V deferred.
- Migration: popup explains, on confirm auto-copy `db.sqlite` → `db.backup-<version>-<date>.sqlite`, then migrate.
- Settings: change data folder, app/DB version (read-only), theme light/dark, manual DB backup, language.
- UI language: English + French (i18n).
- Chosen data folder path is stored in the per-user app config dir (not in the data folder).
