import type { RPCSchema } from "electrobun/main";

export const STATUSES = ["In development", "Active", "Retired", "Research"] as const;
export type Status = (typeof STATUSES)[number];

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
};

export type StatusChange = { status: Status; changedAt: string };

// ---------- raw materials and purchased parts (docs/materials-parts.md) ----------

export const ITEM_STATUSES = ["Active", "Retired"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemKind = "material" | "part";

// Managed lists: entries are permanent. For units, `code` is the unit name.
export const LISTS = ["seller", "materialType", "partType", "colour", "finish", "unit"] as const;
export type ListName = (typeof LISTS)[number];
export type ListEntry = { id: number; list: ListName; name: string; code: string };

// amount = ten-thousandths of the currency (4 decimals), date = YYYY-MM-DD. Also used for operation rates.
export type Price = { id: number; date: string; amount: number };

export type Item = {
  id: number;
  kind: ItemKind;
  sku: string;
  seller: ListEntry;
  type: ListEntry;
  colour: ListEntry | null; // material only
  finish: ListEntry | null; // material only
  size: string | null; // material thickness or weight code
  specs: string[]; // part specification codes
  unit: ListEntry;
  description: string;
  sellerSku: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
  price: Price | null; // current: latest date, then latest entered
};

export type NewItem = {
  kind: ItemKind;
  sellerId: number;
  typeId: number;
  colourId: number | null;
  finishId: number | null;
  size: string;
  specs: string[];
  unitId: number;
  description: string;
  sellerSku: string;
  firstPrice: { date: string; amount: number } | null;
};

export type ItemStatusChange = { status: ItemStatus; changedAt: string };

// ---------- operations (docs/operations.md) ----------

export type RateKind = "hour" | "quantity";

export type Operation = {
  id: number;
  sku: string;
  name: string;
  description: string;
  rateKind: RateKind;
  unit: ListEntry | null; // per quantity only
  createdAt: string;
  updatedAt: string;
  rate: Price | null; // current: latest date, then latest entered
};

// ---------- manufactured parts and composition (docs/manufactured-parts.md) ----------

export const PART_STATUSES = ["In development", "Active", "Retired"] as const;
export type PartStatus = (typeof PART_STATUSES)[number];
export type PartStatusChange = { status: PartStatus; changedAt: string };

// value in currency units, unrounded; null = "—" (no price, or empty composition).
export type Cost = { value: number | null; partial: boolean };

export type PartVersion = {
  id: number;
  partId: number;
  sku: string;
  name: string;
  version: number;
  product: { id: number; sku: string; name: string }; // origin product
  description: string;
  status: PartStatus;
  toReview: boolean; // a composition line is marked To review
  cost: Cost;
  createdAt: string;
  updatedAt: string;
};

export type Owner = { kind: "product" | "version"; id: number };
export type Component = { kind: "item" | "operation" | "version"; id: number };

// quantity: thousandths of the unit; seconds for a per hour operation; a whole count for a version.
export type CompositionLine = {
  id: number;
  component: Component;
  sku: string;
  name: string;
  status: ItemStatus | PartStatus | null; // null for operations
  measure: "quantity" | "duration" | "count";
  unit: string | null; // price or rate unit, for "quantity"
  quantity: number;
  toReview: boolean;
  cost: Cost;
};

export type UsedBy = { kind: "product" | "version"; id: number; sku: string; name: string };
export type Theme = "system" | "light" | "dark";
export type Lang = "en" | "fr";
export type Settings = { dataFolder: string | null; theme: Theme; lang: Lang | null };

// Result of opening the data folder.
export type DbState =
  | { kind: "noFolder" }
  | { kind: "ready" }
  | { kind: "appOutdated"; dbVersion: string; appVersion: string }
  | { kind: "needsMigration"; dbVersion: string; appVersion: string }
  | { kind: "error"; message: string };

// What a folder holds before it is opened (first-run screen).
export type FolderInfo = {
  path: string;
  hasDb: boolean;
  products: number | null;
  dbVersion: string | null;
};

export type AppInfo = {
  app: string;
  db: string | null;
  dataFolder: string | null;
  lastBackup: number | null;
};

// `path` values are always relative to the product folder, "/"-separated, "" = folder root.
// `size` is bytes for files and the number of entries for folders.
export type FileEntry = { name: string; path: string; isDir: boolean; size: number; mtime: number };

type Req<P, R> = { params: P; response: R };

export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      getSettings: Req<{}, Settings>;
      setSettings: Req<Partial<Omit<Settings, "dataFolder">>, Settings>;
      defaultFolder: Req<{}, string>; // suggestion for first run
      pickFolder: Req<{ start: string | null }, string | null>; // native picker, null = cancelled
      inspectFolder: Req<{ path: string }, FolderInfo>;
      openDataFolder: Req<{ path: string }, DbState>; // remembered in settings unless it fails
      revealDataFolder: Req<{}, void>;
      getDbState: Req<{}, DbState>;
      migrate: Req<{}, { state: DbState; backup: string }>; // backs up db.sqlite then migrates
      backupDb: Req<{}, string>; // returns backup file path
      getInfo: Req<{}, AppInfo>;
      quit: Req<{}, void>;

      listProducts: Req<{ query: string }, (Product & { toReview: boolean })[]>;
      getProduct: Req<{ id: number }, { product: Product; history: StatusChange[] }>;
      nextSku: Req<{}, string>;
      createProduct: Req<{ name: string; description: string }, Product>;
      updateProduct: Req<
        { id: number; name: string; description: string; status: Status },
        Product
      >;

      getCurrency: Req<{}, string>;
      setCurrency: Req<{ currency: string }, string>;
      listEntries: Req<{}, ListEntry[]>;
      addEntry: Req<{ list: ListName; name: string; code: string }, ListEntry>; // code is cleaned
      listItems: Req<{ kind: ItemKind; query: string }, Item[]>;
      getItem: Req<{ id: number }, { item: Item; prices: Price[]; history: ItemStatusChange[] }>;
      createItem: Req<NewItem, Item>; // refused if the SKU exists
      updateItem: Req<
        { id: number; description: string; sellerSku: string; status: ItemStatus },
        Item
      >;
      addPrice: Req<{ itemId: number; date: string; amount: number }, void>;
      updatePrice: Req<{ id: number; date: string; amount: number }, void>;
      deletePrice: Req<{ id: number }, void>;

      listOperations: Req<{ query: string }, Operation[]>;
      getOperation: Req<{ id: number }, { operation: Operation; rates: Price[] }>;
      nextOperationSku: Req<{}, string>;
      createOperation: Req<
        {
          name: string;
          description: string;
          rateKind: RateKind;
          unitId: number | null;
          firstRate: { date: string; amount: number } | null;
        },
        Operation
      >;
      updateOperation: Req<{ id: number; name: string; description: string }, Operation>;
      addRate: Req<{ operationId: number; date: string; amount: number }, void>;
      updateRate: Req<{ id: number; date: string; amount: number }, void>;
      deleteRate: Req<{ id: number }, void>;

      // productId: only the versions of parts designed for that product
      listPartVersions: Req<
        { query: string; status: PartStatus | null; productId: number | null },
        PartVersion[]
      >;
      getPartVersion: Req<
        { id: number },
        { version: PartVersion; history: PartStatusChange[]; siblings: PartVersion[] }
      >;
      partSku: Req<{ productId: number; name: string }, string>; // creation preview, throws if invalid
      createPart: Req<{ productId: number; name: string; description: string }, PartVersion>;
      nextVersionSku: Req<{ fromId: number }, string>;
      newVersion: Req<{ fromId: number }, PartVersion>;
      updatePartVersion: Req<{ id: number; description: string; status: PartStatus }, PartVersion>;

      getComposition: Req<{ owner: Owner }, { lines: CompositionLine[]; cost: Cost }>;
      addLine: Req<{ owner: Owner; component: Component; quantity: number }, void>;
      updateLine: Req<{ id: number; quantity: number; versionId: number | null }, void>; // versionId: switch version
      deleteLine: Req<{ id: number }, void>;
      moveLine: Req<{ id: number; by: -1 | 1 }, void>; // -1: up, 1: down
      markReviewed: Req<{ id: number }, void>;
      usedBy: Req<{ component: Component }, UsedBy[]>;

      listDir: Req<{ sku: string; path: string }, FileEntry[]>;
      mkdir: Req<{ sku: string; path: string; name: string }, FileEntry>;
      rename: Req<{ sku: string; path: string; newName: string }, FileEntry>;
      trash: Req<{ sku: string; paths: string[] }, void>;
      copy: Req<{ sku: string; paths: string[]; dest: string }, void>; // dest = folder; name clashes get " (copy)"
      move: Req<{ sku: string; paths: string[]; dest: string }, void>;
      openPath: Req<{ sku: string; path: string }, void>; // default app
      reveal: Req<{ sku: string; path: string }, void>; // system file explorer
      getUploadUrl: Req<{}, string>; // see upload below
    };
    messages: {};
  }>;
  webview: RPCSchema<{ requests: {}; messages: {} }>;
};

/*
 * Upload (drag-in from the OS): the webview has no file paths, only File objects,
 * so it POSTs raw bytes to the main process:
 *   POST `${uploadUrl}&sku=<sku>&path=<relative file path incl. subfolders>`  body = file bytes
 * `uploadUrl` already contains the auth token. Existing files are not overwritten: a " (copy)" name is used.
 */
