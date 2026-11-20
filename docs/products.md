# Products

Code: `src/bun/store.ts`, `src/bun/db/schema.ts`, `src/mainview/pages/products/`.

## SKU

```
EK-PRD-[ID5]
```

`[ID5]` is a 5-digit number, unique per product.

- Sequential: `max(id) + 1`, starting at `00001`.
- The next number is above both the highest id in the database and the highest `EK-PRD-` folder in `1_PRODUCTS/`, so a folder left without a database row is never overwritten.
- Never reused or reassigned. A retired product keeps its number.
- Limit: `EK-PRD-99999`. Creation is refused past it.

## Fields

SKU, name (required, not unique), description (optional), status, composition (see [Composition](#composition)), cost (computed, see [Cost](#cost)), created_at, updated_at.

## Status

- `In development`: the product is being worked on. Not ready to be manufactured or sold. Default at creation.
- `Active`: the product can be manufactured and sold.
- `Retired`: the product reached its end of life.
- `Research`: a research project (calibration programs, experiments, ...), not a product to manufacture or sell.

The user can change the status at any time, from any status to any other. `Retired` keeps an archive: the user can still read the product's data or re-activate it, and the SKU is not deleted or reassigned.

A status history table logs every status change with a timestamp. The product page shows it.

## Product list

Shown when the application opens. See [navigation.md](navigation.md).

- A search bar at the top. It searches the SKU, name and description, and the list refreshes while the user types.
- To the right of the search bar, a button to create a new product.
- Status filter chips: All / In development / Active / Retired / Research.
- Below, the product list. Each row shows a status badge and the `To review` mark, and opens the product page on click.

## Creating a product

1. The user clicks the button to create a new product.
2. A popup asks for a name and a description.
3. The user validates or cancels.
   - Validated: the app creates a system folder named after the SKU, then opens the product page.
   - Cancelled: the app returns to the product list.

## Viewing a product

1. The user searches for and/or clicks the product.
2. The product page shows:
   - At the top, the product details: SKU, name, description, status with the status history, and cost. See [Cost](#cost).
   - Next to the details, a button to edit the product.
   - The manufactured parts designed for the product (this product is their origin product): every version, with its status badge and the `To review` mark, linking to its page, and a button to create a manufactured part. See [manufactured-parts.md](manufactured-parts.md).
   - The composition, with a button to add a line and, on each line, buttons to edit and delete it, the line cost, the item's status when it is not `Active`, and the `To review` mark. See [Composition](#composition).
   - Below, the content of the SKU's system folder. See [file-explorer.md](file-explorer.md).

## Editing a product

1. On the product page, the user clicks the edit button next to the details.
2. A popup asks for the name, description and status.
3. The user validates or cancels.
   - Validated: the product is updated and the app returns to the product page.
   - Cancelled: the app returns to the product page without changing anything.

## Composition

The bill of materials of the product. A list of lines, each one:

- a manufactured part version, from any product, with a whole-number count. A line references an exact version SKU (`…-v2`);
- or a purchased part, with a quantity in the part's price unit, at most 3 decimal places.

Rules:

- The manufactured parts designed for the product are not added automatically: the user adds the version and quantity. A product can use manufactured parts from any origin product.
- The composition can be edited unless the product is `Retired`.
- Same line rules as a manufactured part: one line per item (per exact version), and editing a line changes its quantity and the version of the same part. See [manufactured-parts.md](manufactured-parts.md#composition).
- Only `Active` items can be picked for a new line: retired purchased parts, and manufactured part versions that are `In development` or `Retired`, cannot be picked. Existing lines stay when their item's status changes, marked with that status.
- A line is marked `To review` when another version of its manufactured part becomes `Active`, unless the product is `Retired` (its composition is locked, so the mark could not be cleared). The mark also shows on the product list row. See [manufactured-parts.md](manufactured-parts.md#to-review).
- When a product leaves `Retired`, every manufactured part line that does not reference the `Active` version of its part is marked `To review` (a part with no `Active` version marks nothing).

## Cost

Computed from the composition with the current prices, never stored: line quantity × current price (purchased part) or × the version cost (manufactured part), summed. Same display and partial rules as a manufactured part. See [manufactured-parts.md](manufactured-parts.md#cost).
