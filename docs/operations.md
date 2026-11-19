# Operations

The operations needed to turn raw materials into a finished part: 3D printing, laser cutting, laser engraving, sanding, painting, bending, assembly, …

Operations are used in the composition of manufactured parts. See [manufactured-parts.md](manufactured-parts.md).

## SKU

```
EK-OPE_[ID5]
```

`[ID5]` is a 5-digit number, unique per operation. Same rules as the product SKU (see [products.md](products.md)):

- Sequential: `max(id) + 1`, starting at `00001`.
- The next number is above both the highest id in the database and the highest `EK-OPE_` folder in `5_OPERATIONS/`.
- Never reused or reassigned.
- Limit: `EK-OPE_99999`. Creation is refused past it.

## Fields

| Field       | Required          | Editable after creation  | Notes                                               |
| ----------- | ----------------- | ------------------------ | --------------------------------------------------- |
| SKU         | —                 | No                       | Built by the app.                                   |
| Name        | Yes               | Yes                      | `3D printing`, `Laser cutting`, … Not unique.       |
| Description | No                | Yes                      | Machine, settings, additional information.          |
| Rate kind   | Yes               | No                       | See [Rate](#rate).                                  |
| Rate unit   | Per quantity only | No                       | Picked from the price units list (`bend`, `m²`, …). |
| Rate        | No                | Through the rate history | See [Rate](#rate).                                  |
| created_at  | —                 | No                       |                                                     |
| updated_at  | —                 | No                       |                                                     |

Operations have no status: an operation is always available.

## Rate

The rate kind is set at creation and fixed. It decides what a composition line enters for this operation:

| Rate kind    | Example                                         | Composition line enters              | Line cost                |
| ------------ | ----------------------------------------------- | ------------------------------------ | ------------------------ |
| Per hour     | `0.95 €` per hour of print                      | A duration (hours, minutes, seconds) | duration in hours × rate |
| Per quantity | `0.10 €` per bend, `0.40 €` per m² of engraving | A quantity in the rate unit          | quantity × rate          |

- Per quantity: the rate unit is picked from the price units list managed in the settings page. See [settings.md](settings.md).
- The rate follows the same rules as the price of a raw material (see [materials-parts.md](materials-parts.md#price)): currency setting, manual dated entries, editable and deletable, 2 decimal places, current rate = most recent entry by date (last entered wins on the same date), `—` when there is no entry.
- The operation page shows the rate history with its dates.

## Operations list

Works like the product list (see [products.md](products.md)).

- A search bar at the top. It searches the SKU, name and description, and the list refreshes while the user types.
- To the right of the search bar, a button to create a new operation.
- No status filter chips.
- Below, the operation list. Each row shows the SKU, name, description and current rate with its kind (`0.95 € / h`, `0.10 € / bend`, `0.40 € / m²`), and opens the operation page on click.

## Creating an operation

1. The user clicks the button to create a new operation.
2. A popup asks for the name, the rate kind (and the rate unit for per quantity), and optionally the description and a first rate.
3. The user validates or cancels.
   - Validated: the app creates a system folder named after the SKU in `5_OPERATIONS/`, then opens the operation page.
   - Cancelled: the app returns to the operations list.

## Viewing an operation

1. The user searches for and/or clicks the operation.
2. The operation page shows:
   - At the top, the operation details: SKU, name, description, rate kind, rate unit and current rate.
   - Next to the details, a button to edit the operation.
   - The rate history, with a button to add a rate entry and, on each entry, buttons to edit and delete it.
   - The manufactured part versions that use the operation, linking to their page.
   - Below, the content of the SKU's system folder (machine profiles, settings files, …). See [file-explorer.md](file-explorer.md).

## Editing an operation

1. On the operation page, the user clicks the edit button next to the details.
2. A popup asks for the name and the description. The rate kind and unit are shown but cannot be changed.
3. The user validates or cancels.
   - Validated: the operation is updated and the app returns to the operation page.
   - Cancelled: the app returns to the operation page without changing anything.
