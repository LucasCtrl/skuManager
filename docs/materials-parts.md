# Raw materials and purchased parts

Not implemented yet. This file is the specification to build from.

Raw materials (filament, sheets, …) and purchased parts (screws, standoffs, feet, …) follow the same rules. They differ only in their SKU prefix, their data folder and their specification fields. "Item" below means either one.

|                | Raw material                        | Purchased part                                                   |
| -------------- | ----------------------------------- | ---------------------------------------------------------------- |
| SKU prefix     | `EK-MAT_`                           | `EK-PRT_`                                                        |
| Data folder    | `3_MATERIALS/`                      | `4_PARTS/`                                                       |
| List           | Materials list                      | Parts list                                                       |
| Type examples  | PLA, PMMA, PETG                     | Screw, standoff, feet                                            |
| Specifications | Colour, thickness or weight, finish | Multiple specifications field (`M3x50`, `Male-Female`, `8x2`, …) |

## SKU

```
EK-MAT_[SELLER]_[TYPE]_[SPECS]
EK-PRT_[SELLER]_[TYPE]_[SPECS]
```

Examples (illustrative): `EK-MAT_ESUN_PLA_BLK_1KG`, `EK-PRT_BOSSARD_SCREW_M3X50`, `EK-PRT_BOSSARD_STANDOFF_M3X50_MF`.

- `[SELLER]`: the short code of the seller. See [Sellers and types](#sellers-and-types).
- `[TYPE]`: the short code of the material type or part type.
- `[SPECS]`: a code built by the app from the specification fields. See [Specs code](#specs-code).
- Codes are upper case letters, digits and dots. See [Code format](#code-format).
- No counter. The SKU is unique by the combination of its three codes. Creating an item whose SKU already exists is refused.
- Seller, type and specifications are locked once the SKU exists. A different seller or a different specification is a new SKU.
- Never reused or reassigned. A retired item keeps its SKU.

## Fields

| Field          | Required | Editable after creation   | Notes                                                                                                                                                |
| -------------- | -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| SKU            | —        | No                        | Built by the app.                                                                                                                                    |
| Seller         | Yes      | No                        | Picked from the sellers list.                                                                                                                        |
| Type           | Yes      | No                        | Picked from the material types list or the part types list.                                                                                          |
| Specifications | Yes      | No                        | Material: colour, thickness or weight (`3mm` sheet, `1kg` spool), finish (opaque, transparent, translucent, …). Part: multiple specifications field. |
| Description    | No       | Yes                       | Manufacturer, additional information, …                                                                                                              |
| Seller SKU     | No       | Yes                       | The seller's own reference, if known.                                                                                                                |
| Price unit     | Yes      | No                        | Set at item creation, picked from the price units list. See [Price](#price).                                                                         |
| Price          | No       | Through the price history | See [Price](#price).                                                                                                                                 |
| Status         | —        | Yes                       | See [Status](#status).                                                                                                                               |
| created_at     | —        | No                        |                                                                                                                                                      |
| updated_at     | —        | No                        |                                                                                                                                                      |

## Sellers and types

Sellers, material types and part types are managed lists. Each entry has a name and a short code (for example `Bossard` / `BOSSARD`). The code is what appears in the SKU.

- When creating an item, the user picks the seller and the type from a dropdown.
- The sellers list is shared by materials and parts. Material types and part types are two separate lists.
- Sellers and types are created only in the settings page, not from the dropdown. See [settings.md](settings.md).
- Once created, a seller or type can never be changed or deleted, so the database relations and the SKUs built from its code stay stable.

Because an entry is permanent, creating one asks for confirmation:

1. In the settings page, the user fills in the name and the short code.
2. A popup shows the values entered, with the code corrected to the [code format](#code-format), and asks for confirmation.
   - Confirmed: the seller or type is created.
   - Not confirmed: the user is sent back to the form, with the values kept, to correct them.

## Code format

Applies to seller, type, colour and finish codes, and to every part of the specs code.

- Only letters, digits and the dot (`.`). `-` and `_` are reserved by the app as SKU separators.
- Always upper case: the app converts what the user types (`M3x50` → `M3X50`).
- Any other character is removed by the app (`1,75 mm` → `175MM`, `Male-Female` → `MALEFEMALE`); a dot is kept (`1.75mm` → `1.75MM`).
- The user always sees the corrected code before it is saved: in the confirmation popup for a managed list entry, in the SKU preview for an item.
- No maximum length.
- Below each code field, a hint recommends a short code instead of the full name, with examples: `L'acrylic` → `LACRY`, `Bossard` → `BSSRD`.

## Specs code

The app builds `[SPECS]` from the specification fields; the user does not type it. The parts are joined with `_`.

- Material: colour code, thickness or weight, finish code.
  - Colours and finishes are managed lists (name + short code), with the same rules as [sellers and types](#sellers-and-types): created only in the settings page, with confirmation, never changed or deleted.
  - Thickness or weight is one free value (`3mm`, `1kg`), used as typed after conversion to the [code format](#code-format).
- Part: each specifications field is a free value, used as typed after conversion to the [code format](#code-format) (`M3x50` → `M3X50`, `8x2` → `8X2`).

## Price

- The currency is a single app setting, applied to every price. See [settings.md](settings.md). It is only the symbol displayed next to prices: the user can change it at any time and stored prices are not converted.
- The price unit is picked from a list of units managed in the settings page. See [settings.md](settings.md).
- A price unit cannot be changed or deleted once created. Creating one asks for confirmation, with the same popup as for [sellers and types](#sellers-and-types).
- The price unit is fixed per item: it is set at item creation and every price entry of the item uses it.
- The price is recorded as manual entries. The user adds an entry with a price and a date they choose (for example the invoice date).
- A price entry can be edited or deleted.
- The current price is the most recent entry by date.
- The item page shows the price history with its dates.

## Status

- `Active`: the item is in use. Default at creation.
- `Retired`: the item is no longer bought or used.

The user can set the status to `Active` or `Retired` at any time. `Retired` keeps an archive: the user can still read the item's data or re-activate it, and the SKU is not deleted or reassigned.

A status history table logs every status change with a timestamp.

## Materials list and parts list

Two separate lists, one for raw materials and one for purchased parts. Each works like the product list (see [products.md](products.md)).

- A search bar at the top. It searches every field of the item (SKU, seller, type, specifications, description, seller SKU, …), and the list refreshes while the user types.
- To the right of the search bar, a button to create a new item.
- Status filter chips: All / Active / Retired.
- Below, the item list. Each row shows a status badge and opens the item page on click.

## Navigation

The header links to the materials list and the parts list. See [navigation.md](navigation.md).

## Creating an item

1. The user clicks the button to create a new material or a new part.
2. A popup asks for the seller, the type, the specifications and the price unit, and optionally the description, the seller SKU and a first price.
3. The popup shows the SKU that will be created as the fields are filled.
4. The user validates or cancels.
   - Validated: the app creates a system folder named after the SKU in `3_MATERIALS/` or `4_PARTS/`, then opens the item page.
   - Validated but the SKU already exists: the app refuses and says which item already uses it.
   - Cancelled: the app returns to the list.

## Viewing an item

1. The user searches for and/or clicks the item.
2. The item page shows:
   - At the top, the item details: SKU, seller, type, specifications, description, seller SKU, current price with its unit, and status.
   - Next to the details, a button to edit the item.
   - The price history, with a button to add a price entry and, on each entry, buttons to edit and delete it.
   - Below, the content of the SKU's system folder. See [file-explorer.md](file-explorer.md).

## Editing an item

1. On the item page, the user clicks the edit button next to the details.
2. A popup asks for the description, the seller SKU and the status. Seller, type and specifications are shown but cannot be changed.
3. The user validates or cancels.
   - Validated: the item is updated and the app returns to the item page.
   - Cancelled: the app returns to the item page without changing anything.
