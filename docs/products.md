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

A variant adds its code to the product SKU: `EK-PRD-[ID5]-[CODE]`, for example `EK-PRD-00012-Y10`. See [Variants](#variants).

## Fields

SKU, name (required, not unique), description (optional), status, composition or variants (see [Composition](#composition) and [Variants](#variants)), cost (computed, see [Cost](#cost)), created_at, updated_at.

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
- The search also matches the code and name of the product's variants. The row shown is the product's.
- Below, the product list. Each row shows a status badge, the cost (a range for a product with variants, see [Cost](#cost)) and the `To review` mark (on the product or any of its variants), and opens the product page on click.

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
   - Without variants: the composition, with a button to add a line and, on each line, buttons to edit and delete it, the line cost, the item's status when it is not `Active`, and the `To review` mark. See [Composition](#composition).
   - With variants: the list of variants, each with its SKU, name, cost and `To review` mark, linking to its page. See [Variants](#variants).
   - A button to add a variant.
   - Below, the content of the SKU's system folder. See [file-explorer.md](file-explorer.md).

## Editing a product

1. On the product page, the user clicks the edit button next to the details.
2. A popup asks for the name, description and status.
3. The user validates or cancels.
   - Validated: the product is updated and the app returns to the product page.
   - Cancelled: the app returns to the product page without changing anything.

## Composition

The bill of materials of the product. A product without variants holds its composition; a product with variants holds none, each variant has its own (see [Variants](#variants)). A list of lines, each one:

- a manufactured part version, from any product, with a whole-number count. A line references an exact version SKU (`…-v2`);
- or a purchased part, with a quantity in the part's price unit, at most 3 decimal places.

Rules:

- The manufactured parts designed for the product are not added automatically: the user adds the version and quantity. A product can use manufactured parts from any origin product.
- The composition can be edited unless the product is `Retired`.
- The rules below apply the same way to a variant's composition, which follows its product's status.
- Same line rules as a manufactured part: one line per item (per exact version), lines can be reordered, and editing a line changes its quantity and the version of the same part. See [manufactured-parts.md](manufactured-parts.md#composition).
- Only `Active` items can be picked for a new line: retired purchased parts, and manufactured part versions that are `In development` or `Retired`, cannot be picked. Existing lines stay when their item's status changes, marked with that status.
- A line is marked `To review` when another version of its manufactured part becomes `Active`, unless the product is `Retired` (its composition is locked, so the mark could not be cleared). The mark also shows on the variant row and page, and on the product list row. See [manufactured-parts.md](manufactured-parts.md#to-review).
- When a product leaves `Retired`, every manufactured part line of the product or its variants that does not reference the `Active` version of its part is marked `To review` (a part with no `Active` version marks nothing).

## Cost

Computed from the composition with the current prices, never stored: line quantity × current price (purchased part) or × the version cost (manufactured part), summed. Same display and partial rules as a manufactured part. See [manufactured-parts.md](manufactured-parts.md#cost).

- Product without variants: the cost of its composition.
- Variant: the cost of its composition with its [swaps](#swaps) applied.
- Product with variants: the range of its variants' costs, `min – max` (a single amount when they are equal). It is partial when any variant cost is partial. A variant with an empty composition (`—`) is left out of the range; when every variant is empty, the product shows `—`.

## Variants

The options of one product sold under one listing, where the customer picks colour, pack size, size, …: a Tool ID card in yellow ×10, yellow ×100, blue ×10, blue ×100. Products that the customer sees as different items (HSK63F and BT40 tool ID cards) are separate products, not variants. Variants can use different manufactured parts (a small and a big cup holder, each its own part) or the same parts in another colour (see [Swaps](#swaps)).

A product has either no variants, and holds its composition, or one or more variants, each with its own composition, and holds none.

### Variant SKU

```
EK-PRD-[ID5]-[CODE]
```

- `[CODE]`: typed by the user (`Y10`), converted to the [code format](materials-parts.md#code-format) (upper case letters, digits and dots), shown in the SKU preview before it is saved.
- Unique per product, ignoring case. Creating a variant whose code already exists on the product is refused, and the app says which variant uses it.
- Locked once the variant exists.
- Never reused or reassigned while the product exists. A deleted variant's code can be reused.

### Variant fields

| Field       | Required | Editable after creation | Notes                            |
| ----------- | -------- | ----------------------- | -------------------------------- |
| SKU         | —        | No                      | Product SKU + code.              |
| Code        | Yes      | No                      | See [Variant SKU](#variant-sku). |
| Name        | Yes      | Yes                     | `Yellow ×10`. Not unique.        |
| Description | No       | Yes                     |                                  |
| Composition | No       | Yes                     | Same rules as the product's.     |
| Swaps       | No       | Yes                     | See [Swaps](#swaps).             |
| Cost        | —        | No                      | Computed. See [Cost](#cost).     |
| created_at  | —        | No                      |                                  |
| updated_at  | —        | No                      |                                  |

- A variant has no status: the product's status applies to all its variants.
- A variant has no folder: its files go in the product's folder.
- A variant of a `Retired` product is locked: it cannot be created, edited, copied or deleted, and its composition and swaps cannot be edited.

### Creating a variant

1. On the product page, the user clicks the button to add a variant.
2. A popup asks for the code, the name and optionally the description, and shows the SKU that will be created as the code is typed.
3. On a product that already has variants, the popup can copy an existing variant: its composition (with each line's `To review` mark and order) and its swaps are copied. Otherwise the new variant is empty.
4. The user validates or cancels.
   - Validated: the variant is created and the app opens its page.
   - Validated on a product without variants: the product's composition is moved into the new variant (lines, order and `To review` marks kept), so nothing is lost. The product's composition becomes empty.
   - Validated but the code already exists on the product: the app refuses and says which variant uses it.
   - Cancelled: the app returns to the product page.

### Viewing a variant

1. The user clicks the variant on the product page or in a used-by list.
2. The variant page shows:
   - At the top, the details: SKU, name, description, product (link to its page, with its status), and cost.
   - Next to the details, buttons to edit, copy and delete the variant.
   - The swaps, with a button to add a swap and, on each one, buttons to edit and delete it, and the `Not used` and `Retired` marks. See [Swaps](#swaps).
   - The composition, with the same buttons, line costs and marks as the product composition. Line costs include the swaps.

### Editing a variant

1. On the variant page, the user clicks the edit button next to the details.
2. A popup asks for the name and the description. The code is shown but cannot be changed.
3. The user validates or cancels.

### Copying a variant

The copy button on the variant page opens the creation popup with that variant preselected as the one to copy.

### Deleting a variant

1. On the variant page, the user clicks the delete button.
2. A popup asks for confirmation. When it is the last variant, it says that its composition will move back to the product and its swaps will be deleted.
3. On confirm:
   - Other variants remain: the variant, its composition and its swaps are deleted.
   - Last variant: its composition is moved to the product (lines, order and `To review` marks kept), its swaps are deleted, and the product is back to having no variants.
   - The app opens the product page.

### Swaps

A swap replaces one item with another everywhere in a variant: `Yellow PMMA → Blue PMMA`, `Black PLA → Blue PLA`, `Small box → Large box`. It lets variants use the same manufactured parts in another colour or with other consumables, without creating new parts.

- A swap replaces item X with item Y. X and Y are both raw materials or both purchased parts (screws, boxes, bags, …), with the same price unit. Y is picked from the `Active` items; X from any item.
- It applies at any depth: on the variant's own lines and inside every manufactured part of its composition, sub-assemblies included. Each line of X keeps its quantity and uses Y instead.
- A variant can have several swaps. Each item can be replaced by at most one swap: adding a second swap for the same X is refused. X and Y must differ.
- Swaps are not chained: a swap's Y is never replaced by another swap.
- Only variants have swaps. A product without variants uses its parts as they are.
- Parts are never changed by a swap: their page, composition and cost stay as they are. Only the variant's cost uses the swaps.
- Editing a swap changes its Y. To replace another item, the user deletes the swap and adds a new one.
- A swap is marked `Not used` when X appears nowhere in the variant, at any depth (for example after a line was switched to a new part version that no longer uses X). It is kept, and has no effect on the cost.
- A swap is marked `Retired` when Y becomes `Retired`. It keeps applying.
- The marks show on the swap only, not on the product list.
