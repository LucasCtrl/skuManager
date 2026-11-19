# Navigation

Code: `src/mainview/layouts/Header.tsx`, the `Page` state in `src/mainview/App.tsx`.

## Pages

| Page                 | Opened from                                                                                                     | Spec                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Product list         | App start, `Products` header link                                                                               | [products.md](products.md)                     |
| Product page         | A row of the product list, product creation, the origin product of a part version, a used-by list               | [products.md](products.md)                     |
| Materials list       | `Materials` header link                                                                                         | [materials-parts.md](materials-parts.md)       |
| Material page        | A row of the materials list, material creation, a composition line                                              | [materials-parts.md](materials-parts.md)       |
| Purchased parts list | `Purchased parts` header link                                                                                   | [materials-parts.md](materials-parts.md)       |
| Purchased part page  | A row of the purchased parts list, purchased part creation, a composition line                                  | [materials-parts.md](materials-parts.md)       |
| Parts list           | `Parts` header link                                                                                             | [manufactured-parts.md](manufactured-parts.md) |
| Part version page    | A row of the parts list, a part on a product page, a composition line, a used-by list, part or version creation | [manufactured-parts.md](manufactured-parts.md) |
| Operations list      | `Operations` header link                                                                                        | [operations.md](operations.md)                 |
| Operation page       | A row of the operations list, a composition line, operation creation                                            | [operations.md](operations.md)                 |
| Settings             | Settings icon in the header                                                                                     | [settings.md](settings.md)                     |

The product list is the page shown when the application opens.

The header is only shown once the data folder is open. The first-run, app-outdated and migration screens have no header. See [data-folder.md](data-folder.md) and [versions.md](versions.md).

## Header

- The same header is shown on every page: the logo, the list links, the data folder path, then the settings icon.
- The header stays fixed at the top of the window while the page scrolls.
- It has the links `Products`, `Parts`, `Materials`, `Purchased parts`, `Operations`, in that order. Each opens the corresponding list. `Parts` is the manufactured parts list, separate from `Purchased parts`.
- The link of the current list is highlighted. A product, part, material, purchased part or operation page highlights the link of its list.
- The settings icon is always visible, and highlighted on the settings page.
- There is no back button: the links replace it.

## Popups

Creation, edit and confirmation popups open over the current page and do not change it, except:

- Validating a creation opens the page of the new product, item, operation or part version.
- Cancelling returns to the page the popup was opened from.
