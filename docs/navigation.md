# Navigation

Code: `Header` and the `Page` state in `src/mainview/App.tsx`.

## Pages

| Page                 | Opened from                                                | Spec                                     |
| -------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| Product list         | App start, `Products` header link                          | [products.md](products.md)               |
| Product page         | A row of the product list, product creation                | [products.md](products.md)               |
| Materials list       | `Materials` header link                                    | [materials-parts.md](materials-parts.md) |
| Material page        | A row of the materials list, material creation             | [materials-parts.md](materials-parts.md) |
| Purchased parts list | `Purchased parts` header link                              | [materials-parts.md](materials-parts.md) |
| Purchased part page  | A row of the purchased parts list, purchased part creation | [materials-parts.md](materials-parts.md) |
| Settings             | Settings icon in the header                                | [settings.md](settings.md)               |

The product list is the page shown when the application opens.

The header is only shown once the data folder is open. The first-run, app-outdated and migration screens have no header. See [data-folder.md](data-folder.md) and [versions.md](versions.md).

## Header

- The same header is shown on every page: the logo, the list links, the data folder path, then the settings icon.
- It has the links `Products`, `Materials`, `Purchased parts`. Each opens the corresponding list.
- A `Parts` link (manufactured parts, `2_PARTS/`) is added in a future release, separate from `Purchased parts`.
- The link of the current list is highlighted. A product, material or part page highlights the link of its list.
- The settings icon is always visible, and highlighted on the settings page.
- There is no back button: the links replace it.

## Popups

Creation, edit and confirmation popups open over the current page and do not change it, except:

- Validating a creation opens the page of the new product or item.
- Cancelling returns to the page the popup was opened from.
