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

export type Price = { id: number; date: string; cents: number }; // date = YYYY-MM-DD

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
  firstPrice: { date: string; cents: number } | null;
};

export type ItemStatusChange = { status: ItemStatus; changedAt: string };

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

      listProducts: Req<{ query: string; status: Status | null }, Product[]>;
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
      addPrice: Req<{ itemId: number; date: string; cents: number }, void>;
      updatePrice: Req<{ id: number; date: string; cents: number }, void>;
      deletePrice: Req<{ id: number }, void>;

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
