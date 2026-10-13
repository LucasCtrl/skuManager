# Raw materials and purchased parts

Not implemented yet. This file is the specification to build from.

Raw materials (filament, sheets, …) and purchased parts (screws, standoffs, feet, …) follow the same rules. They differ only in their SKU prefix, their data folder and their specification fields. "Item" below means either one.

|                       | Raw material   | Purchased part |
| --------------------- | -------------- | -------------- |
| SKU prefix            | `EK-MAT_`      | `EK-PRT_`      |
| Data folder           | `2_MATERIALS/` | `3_PARTS/`     |
| List                  | Materials list | Parts list     |
| Type examples         | PLA, PMMA, PETG | Screw, standoff, feet |
| Specifications        | Colour, thickness or weight, finish | One specifications field (`M3x50`, `Male-Female`, `8x2mm bumpon`, …) |

## SKU

```
EK-MAT_[SELLER]-[TYPE]-[SPECS]
EK-PRT_[SELLER]-[TYPE]-[SPECS]
```

Examples (illustrative): `EK-MAT_ESUN-PLA-BLK1KG`, `EK-PRT_BOSSARD-SCREW-M3X50`.

- `[SELLER]`: the short code of the seller. See [Sellers and types](#sellers-and-types).
- `[TYPE]`: the short code of the material type or part type.
- `[SPECS]`: a code built by the app from the specification fields. See [Specs code](#specs-code).
- No counter. The SKU is unique by the combination of its three codes. Creating an item whose SKU already exists is refused.
- Seller, type and specifications are locked once the SKU exists. A different seller or a different specification is a new SKU.
- Never reused or reassigned. A retired item keeps its SKU.

## Fields

| Field          | Required | Editable after creation | Notes |
| -------------- | -------- | ----------------------- | ----- |
| SKU            | —        | No                      | Built by the app. |
| Seller         | Yes      | No                      | Picked from the sellers list. |
| Type           | Yes      | No                      | Picked from the material types list or the part types list. |
| Specifications | Yes      | No                      | Material: colour, thickness or weight (`3mm` sheet, `1kg` spool), finish (opaque, transparent, translucent, …). Part: one specifications field. |
| Description    | No       | Yes                     | Manufacturer, additional information, … |
| Seller SKU     | No       | Yes                     | The seller's own reference, if known. |
| Price          | No       | Through the price history | See [Price](#price). |
| Status         | —        | Yes                     | See [Status](#status). |
| created_at, updated_at | — | No                    | |

## Sellers and types

Sellers, material types and part types are managed lists. Each entry has a name and a short code (for example `Bossard` / `BOSSARD`). The code is what appears in the SKU.

- When creating an item, the user picks the seller and the type from a dropdown.
- A new seller or type can be added on the fly from that dropdown.
- The sellers list is shared by materials and parts. Material types and part types are two separate lists.

## Specs code

The app builds `[SPECS]` from the specification fields; the user does not type it.

- Material: from colour, thickness or weight, and finish.
- Part: from the specifications field.

The derivation rules are not defined yet. See [Open points](#open-points).

## Price

- The currency is a single app setting, applied to every price. See [settings.md](settings.md).
- The price unit is one of: per kilo, per m², per unit.
- The price is recorded as manual entries. The user adds an entry with a price, a unit and a date they choose (for example the invoice date).
- The current price is the most recent entry by date.
- The item page shows the price history with its dates.

## Status

- `Active`: the item is in use. Default at creation.
- `Retired`: the item is no longer bought or used.

The user can set the status to `Active` or `Retired` at any time. `Retired` keeps an archive: the user can still read the item's data or re-activate it, and the SKU is not deleted or reassigned.

A status history table logs every status change with a timestamp.

## Materials list and parts list

Two separate lists, one for raw materials and one for purchased parts. Each works like the product list (see [products.md](products.md)).

- A search bar at the top. The list refreshes while the user types.
- To the right of the search bar, a button to create a new item.
- Status filter chips: All / Active / Retired.
- Below, the item list. Each row shows a status badge and opens the item page on click.

## Creating an item

1. The user clicks the button to create a new material or a new part.
2. A popup asks for the seller, the type, the specifications, and optionally the description, the seller SKU and a first price.
3. The popup shows the SKU that will be created as the fields are filled.
4. The user validates or cancels.
   - Validated: the app creates a system folder named after the SKU in `2_MATERIALS/` or `3_PARTS/`, then opens the item page.
   - Validated but the SKU already exists: the app refuses and says which item already uses it.
   - Cancelled: the app returns to the list.

## Viewing an item

1. The user searches for and/or clicks the item.
2. The item page shows:
   - At the top, the item details: SKU, seller, type, specifications, description, seller SKU, current price with its unit, and status.
   - Next to the details, a button to edit the item.
   - The price history, with a button to add a price entry.
   - Below, the content of the SKU's system folder. See [file-explorer.md](file-explorer.md).

## Editing an item

1. On the item page, the user clicks the edit button next to the details.
2. A popup asks for the description, the seller SKU and the status. Seller, type and specifications are shown but cannot be changed.
3. The user validates or cancels.
   - Validated: the item is updated and the app returns to the item page.
   - Cancelled: the app returns to the item page without changing anything.

## Open points

To decide before implementation.

- **Specs code derivation.** How colour, thickness or weight, and finish become a code (`Black` + `1kg` + `Opaque` → ?). Are colours and finishes managed lists with their own short codes, like sellers and types, or free text that the app abbreviates? How is a part's specifications text normalised (`M3x50` → `M3X50`, `8x2mm bumpon` → ?)?
- **Thickness or weight.** Is it one field with a free value (`3mm`, `1kg`), or does the material type decide which one applies?
- **Code format.** Allowed characters, case and maximum length of seller, type and specs codes. The SKU is also a folder name, and `-` and `_` are already separators.
- **Editing sellers and types.** Where the lists are managed outside the creation popup (settings page?). Whether a code can be changed or an entry deleted once a SKU uses it.
- **Price entries.** Whether an entry can be corrected or deleted after it is added. Whether the unit is chosen per entry or fixed per item.
- **Currency change.** What happens to existing prices when the currency setting is changed.
- **Search.** Which fields the search bar covers (SKU, seller, type, specifications, description, seller SKU?).
- **Navigation.** How the user switches between the product list, the materials list and the parts list.
