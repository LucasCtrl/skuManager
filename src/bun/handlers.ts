// RPC handlers that only need the data folder: shared by the app (index.ts) and the e2e runner.
// Settings, native dialogs, the system file explorer, trash and the upload server stay in index.ts.
import type { AppRPC } from "../shared/rpc";
import { APP_VERSION } from "../shared/version";
import { operationSku, productSku } from "../shared/sku";
import * as store from "./store";
import * as files from "./files";
import * as items from "./items";
import * as operations from "./operations";
import * as parts from "./parts";
import * as composition from "./composition";
import * as variants from "./variants";

type Requests = AppRPC["bun"]["requests"];
export type Handlers = {
  [K in keyof Requests]: (
    p: Requests[K]["params"],
  ) => Requests[K]["response"] | Promise<Requests[K]["response"]>;
};

export const handlers = {
  inspectFolder: ({ path }) => store.inspectFolder(path),
  getDbState: () => store.getState(),
  migrate: () => store.migrate(),
  backupDb: () => store.backup(),
  getInfo: () => ({
    app: APP_VERSION,
    db: store.dbVersion(),
    dataFolder: store.dataFolder(),
    lastBackup: store.lastBackup(),
  }),

  nextSku: () => productSku(store.nextId()),
  listProducts: ({ query }) => store.listProducts(query),
  getProduct: ({ id }) => store.getProduct(id),
  createProduct: ({ name, description }) => store.createProduct(name, description),
  updateProduct: ({ id, name, description, status }) =>
    store.updateProduct(id, name, description, status),

  getCurrency: () => items.getCurrency(),
  setCurrency: ({ currency }) => items.setCurrency(currency),
  listEntries: () => items.listAllEntries(),
  addEntry: ({ list, name, code }) => items.addEntry(list, name, code),
  listItems: ({ kind, query }) => items.listItems(kind, query),
  getItem: ({ id }) => items.getItem(id),
  createItem: (v) => items.createItem(v),
  updateItem: ({ id, description, sellerSku, status }) =>
    items.updateItem(id, description, sellerSku, status),
  addPrice: ({ itemId, date, amount }) => items.addPrice(itemId, date, amount),
  updatePrice: ({ id, date, amount }) => items.updatePrice(id, date, amount),
  deletePrice: ({ id }) => items.deletePrice(id),

  listOperations: ({ query }) => operations.listOperations(query),
  getOperation: ({ id }) => operations.getOperation(id),
  nextOperationSku: () => operationSku(operations.nextOperationId()),
  createOperation: (v) => operations.createOperation(v),
  updateOperation: ({ id, name, description }) => operations.updateOperation(id, name, description),
  addRate: ({ operationId, date, amount }) => operations.addRate(operationId, date, amount),
  updateRate: ({ id, date, amount }) => operations.updateRate(id, date, amount),
  deleteRate: ({ id }) => operations.deleteRate(id),

  listPartVersions: ({ query, status, productId }) =>
    parts.listPartVersions(query, status, productId),
  getPartVersion: ({ id }) => parts.getPartVersion(id),
  partSku: ({ productId, name }) => parts.partSku(productId, name),
  createPart: ({ productId, name, description }) => parts.createPart(productId, name, description),
  nextVersionSku: ({ fromId }) => parts.nextVersionSku(fromId),
  newVersion: ({ fromId }) => parts.newVersion(fromId),
  updatePartVersion: ({ id, description, status }) =>
    parts.updatePartVersion(id, description, status),

  getComposition: ({ owner }) => composition.getComposition(owner),
  addLine: ({ owner, component, quantity }) => composition.addLine(owner, component, quantity),
  updateLine: ({ id, quantity, versionId }) => composition.updateLine(id, quantity, versionId),
  deleteLine: ({ id }) => composition.deleteLine(id),
  moveLine: ({ id, by }) => composition.moveLine(id, by),
  markReviewed: ({ id }) => composition.markReviewed(id),
  usedBy: ({ component }) => composition.usedBy(component),

  getVariant: ({ id }) => {
    const variant = variants.getVariant(id);
    return { variant, product: store.getProduct(variant.productId).product };
  },
  variantSku: ({ productId, code }) => variants.variantSku(productId, code).sku,
  createVariant: ({ productId, code, name, description, copyFromId }) =>
    variants.createVariant(productId, code, name, description, copyFromId),
  updateVariant: ({ id, name, description }) => variants.updateVariant(id, name, description),
  deleteVariant: ({ id }) => variants.deleteVariant(id),
  listSwaps: ({ variantId }) => variants.listSwaps(variantId),
  addSwap: ({ variantId, fromId, toId }) => variants.addSwap(variantId, fromId, toId),
  updateSwap: ({ id, toId }) => variants.updateSwap(id, toId),
  deleteSwap: ({ id }) => variants.deleteSwap(id),

  listDir: ({ sku, path }) => files.listDir(sku, path),
  mkdir: ({ sku, path, name }) => files.mkdir(sku, path, name),
  rename: ({ sku, path, newName }) => files.rename(sku, path, newName),
  copy: ({ sku, paths, dest }) => files.copy(sku, paths, dest),
  move: ({ sku, paths, dest }) => files.move(sku, paths, dest),
} satisfies Partial<Handlers>;
