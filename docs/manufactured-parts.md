# Manufactured parts

Parts made in-house from raw materials, operations, purchased parts and other manufactured parts. Each part keeps the product it was first designed for (its origin product) in its SKU, as a record of where it comes from. Any product or part can use it in its composition, see [Composition](#composition).

Examples:

- A tool ID card: 0.12 m² of yellow PMMA and 26 s of laser cutting.
- A mini figure: 14 g of gray PLA, 1 h 36 min of 3D printing, 10 min of sanding, 4 min of painting and 0.2 l of paint.

## SKU

```
EK-MAN_[ID5]_[partName]_v[N]
```

Example: `EK-MAN_00012_toolIdCard_v1`, `EK-MAN_00012_toolIdCard_v2`.

- `[ID5]`: the ID5 of the origin product: the product the part was first designed for. See [products.md](products.md).
- `[partName]`: the part name in camelCase. See [Part name](#part-name).
- `v[N]`: the version, `v1`, `v2`, … See [Versions](#versions).
- Each version is its own SKU, with its own folder and its own composition.
- The origin product is set at creation (from the product page) and never changes, even when the part is used by other products.
- Never reused or reassigned. A retired version keeps its SKU.

## Part name

The user types a free name (`Tool ID card`). The app builds `[partName]` from it and shows it in the SKU preview before it is saved.

- Accented letters lose their accent (`é` → `e`).
- The name is split into words on every character that is not `A`–`Z`, `a`–`z` or `0`–`9`: spaces, punctuation and any other letter (`ß`, `ø`, Greek, …) are word breaks and are not kept.
- The first word is lower case; every other word starts with an upper case letter, the rest lower case: `Tool ID card` → `toolIdCard`, `Mini-figure (base)` → `miniFigureBase`.
- A name that is empty after conversion is refused.
- At most 50 characters after conversion, so folder paths stay under the Windows path length limit.
- Unique per origin product, ignoring case: creating a part whose `[partName]` already exists on the same origin product in any letter case is refused, and the app says which part uses it. `toolIdCard` and `toolIdcard` clash, as folder names are case-insensitive on Windows and macOS.
- The name and `[partName]` are locked once the part exists. All versions share them.

## Fields

Per version:

| Field       | Required | Editable after creation | Notes                                   |
| ----------- | -------- | ----------------------- | --------------------------------------- |
| SKU         | —        | No                      | Built by the app.                       |
| Product     | —        | No                      | The origin product, set at creation.    |
| Name        | Yes      | No                      | Shared by all versions.                 |
| Version     | —        | No                      | `v1` at creation, then the next number. |
| Description | No       | Yes                     | Per version.                            |
| Status      | —        | Yes                     | See [Status](#status).                  |
| Composition | No       | Yes                     | See [Composition](#composition).        |
| Cost        | —        | No                      | Computed. See [Cost](#cost).            |
| created_at  | —        | No                      |                                         |
| updated_at  | —        | No                      |                                         |

## Status

- `In development`: the version is being worked on. Default at creation and for every new version.
- `Active`: the version is the one manufactured.
- `Retired`: the version is no longer manufactured.

The user can change the status at any time, from any status to any other, with one rule: a part has at most one `Active` version. Setting a version `Active` sets the current `Active` version of the same part (older or newer) to `Retired`. The status picker says which version will be retired before the user validates.

`Retired` keeps an archive: the user can still read the version's data or re-activate it, and the SKU is not deleted or reassigned.

A status history table logs every status change with a timestamp, including automatic retirements. The version page shows it.

## Versions

1. On a version page, the user clicks the button to create a new version.
2. A popup shows the SKU of the new version and asks for confirmation. The next number is above both the highest version of the part in the database and the highest version folder of the part in `2_MANUFACTURED_PARTS/`, so a folder left without a database row is never overwritten.
3. On confirm, the app:
   - creates the new version as `In development`, with the description of the version it was created from;
   - copies the composition of that version, with each line's `To review` mark;
   - creates the new version's folder in `2_MANUFACTURED_PARTS/` and copies the content of that version's folder into it;
   - opens the new version's page.

The new version can be created from any version, not only the latest.

## Composition

A list of lines. Each line is one of:

| Line              | Picked from                                                | Quantity entered                                                  |
| ----------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Raw material      | Materials list                                             | A number in the material's price unit (`0.014` kg)                |
| Operation         | Operations list                                            | Depends on the rate kind. See [operations.md](operations.md#rate) |
| Purchased part    | Purchased parts list                                       | A number in the part's price unit                                 |
| Manufactured part | Active manufactured part versions, from any origin product | A count                                                           |

- Quantities are entered in the item's price unit; the app does not convert units. The unit is shown next to the quantity field.
- A duration is entered as hours, minutes and seconds (`1 h 36 min`, `26 s`).
- Quantities have at most 3 decimal places. A manufactured part count is a whole number.
- The composition can be edited in any status. The user adds, edits and removes lines on the version page.
- An item appears on at most one line: adding an item already in the composition is refused. For a manufactured part, the item is the exact version, so `…_v1` and `…_v2` can be on two lines.
- Editing a line changes its quantity and, for a manufactured part line, the version of the same part it references. To use another item, the user deletes the line and adds a new one.
- A manufactured part line references an exact version SKU (`…_v2`), not the part.
- A version cannot contain itself, directly or through other parts. Adding or changing a line in a way that would create a cycle is refused, and the app says which part closes the loop.
- Only `Active` items can be picked for a new line: retired materials and purchased parts, and manufactured part versions that are `In development` or `Retired`, cannot be picked. Operations have no status and can always be picked.
- Existing lines stay when their item's status changes. A line whose item is no longer `Active` is marked with the item's status (`Retired`, `In development`).

### To review

When a version of a part becomes `Active`, every composition line that references any other version of the same part (older or newer, whatever its status) is marked `To review`, on manufactured parts and on products, except `Retired` products. See [products.md](products.md#composition).

- The mark shows on the line, and on the list row and page of the part version or product that holds it.
- It is cleared when the line is switched to the `Active` version of the part, or when the user clicks `Mark as reviewed` on the line (the line keeps its version).
- It is not cleared when the version the line references becomes `Active` later: the user still reviews the line.

## Cost

The app computes the cost of each version from its composition, with the current prices and rates. It is never stored: it changes as soon as a price or rate changes.

- Raw material and purchased part line: quantity × current price.
- Operation line: see [operations.md](operations.md#rate).
- Manufactured part line: count × the cost of that version.
- Version cost: the sum of its lines, shown with 2 decimal places and the currency setting.
- Costs are computed without rounding; only the displayed amounts are rounded. A displayed total can differ by a cent from the sum of the displayed lines.
- A line whose item has no price or rate shows `—`, and the total is marked as partial.
- An empty composition shows `—` as its cost.
- A manufactured part line whose version cost is partial is partial too: it shows the known amount, marked as partial, and so does the total.

## Manufactured parts list

Opened from the `Parts` header link. See [navigation.md](navigation.md). Works like the product list (see [products.md](products.md)).

- A search bar at the top. It searches the SKU, name, description and origin product (SKU and name), and the list refreshes while the user types.
- No create button: parts are created from the product page.
- Status filter chips: All / In development / Active / Retired.
- Below, the list of versions. Each row shows the SKU, name, origin product, cost, a status badge and the `To review` mark, and opens the version page on click.

## Creating a part

1. On the product page, the user clicks the button to create a manufactured part. This works in any product status, `Retired` included: it does not change the product's composition.
2. A popup asks for the name and optionally the description.
3. The popup shows the SKU that will be created (`v1`) as the name is typed.
4. The user validates or cancels.
   - Validated: the app creates a system folder named after the SKU in `2_MANUFACTURED_PARTS/`, then opens the version page.
   - Validated but the part name already exists on the origin product (ignoring case): the app refuses and says which part uses it.
   - Validated but a folder of that part (any version, ignoring case) already exists in `2_MANUFACTURED_PARTS/` without a database row: the app refuses and says which folder is in the way. Existing files are never reused or overwritten.
   - Cancelled: the app returns to the product page.

## Viewing a version

1. The user clicks the version in the parts list or on the product page.
2. The version page shows:
   - At the top, the details: SKU, name, origin product (link to its page), version, description, status with the status history, and cost.
   - Next to the details, a button to edit the version and a button to create a new version.
   - The other versions of the part, each with its status badge, linking to their page.
   - The composition, with a button to add a line and, on each line, buttons to edit and delete it, the line cost, the item's status when it is not `Active`, and the `To review` mark.
   - The parts and products that use this version, linking to their page.
   - Below, the content of the SKU's system folder (STL, DXF, …). See [file-explorer.md](file-explorer.md).

## Editing a version

1. On the version page, the user clicks the edit button next to the details.
2. A popup asks for the description and the status. The name and version are shown but cannot be changed.
3. The user validates or cancels.
   - Validated: the version is updated and the app returns to the version page.
   - Cancelled: the app returns to the version page without changing anything.
