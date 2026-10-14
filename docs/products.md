# Products

Code: `src/bun/store.ts`, `src/bun/db/schema.ts`, `src/mainview/pages.tsx`, product dialogs in `src/mainview/ui.tsx`.

## SKU

```
EK-PRD_[ID5]
```

`[ID5]` is a 5-digit number, unique per product.

- Sequential: `max(id) + 1`, starting at `00001`.
- The next number is above both the highest id in the database and the highest `EK-PRD_` folder in `1_PRODUCTS/`, so a folder left without a database row is never overwritten.
- Never reused or reassigned. A retired product keeps its number.
- Limit: `EK-PRD_99999`. Creation is refused past it.

## Fields

SKU, name (required, not unique), description (optional), status, created_at, updated_at.

## Status

- `In development`: the product is being worked on. Not ready to be manufactured or sold. Default at creation.
- `Active`: the product can be manufactured and sold.
- `Retired`: the product reached its end of life.
- `Research`: a research project (calibration programs, experiments, ...), not a product to manufacture or sell.

The user can change the status at any time, from any status to any other. `Retired` keeps an archive: the user can still read the product's data or re-activate it, and the SKU is not deleted or reassigned.

A status history table logs every status change with a timestamp.

## Product list

Shown when the application opens. See [navigation.md](navigation.md).

- A search bar at the top. It searches the SKU, name and description, and the list refreshes while the user types.
- To the right of the search bar, a button to create a new product.
- Status filter chips: All / In development / Active / Retired / Research.
- Below, the product list. Each row shows a status badge and opens the product page on click.

## Creating a product

1. The user clicks the button to create a new product.
2. A popup asks for a name and a description.
3. The user validates or cancels.
   - Validated: the app creates a system folder named after the SKU, then opens the product page.
   - Cancelled: the app returns to the product list.

## Viewing a product

1. The user searches for and/or clicks the product.
2. The product page shows:
   - At the top, the product details: SKU, name, description and status.
   - Next to the details, a button to edit the product.
   - Below, the content of the SKU's system folder. See [file-explorer.md](file-explorer.md).

## Editing a product

1. On the product page, the user clicks the edit button next to the details.
2. A popup asks for the name, description and status.
3. The user validates or cancels.
   - Validated: the product is updated and the app returns to the product page.
   - Cancelled: the app returns to the product page without changing anything.
