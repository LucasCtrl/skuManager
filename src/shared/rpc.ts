import type { RPCSchema } from "electrobun/main";

export const STATUSES = ["In development", "Active", "Retired"] as const;
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

// `path` values are always relative to the product folder, "/"-separated, "" = folder root.
export type FileEntry = { name: string; path: string; isDir: boolean; size: number; mtime: number };

type Req<P, R> = { params: P; response: R };

export type AppRPC = {
  bun: RPCSchema<{
    requests: {
      getSettings: Req<{}, Settings>;
      setSettings: Req<Partial<Omit<Settings, "dataFolder">>, Settings>;
      chooseDataFolder: Req<{}, DbState>; // opens native folder picker
      getDbState: Req<{}, DbState>;
      migrate: Req<{}, DbState>; // backs up db.sqlite then migrates
      backupDb: Req<{}, string>; // returns backup file path
      getVersions: Req<{}, { app: string; db: string | null }>;

      listProducts: Req<{ query: string; status: Status | null }, Product[]>;
      getProduct: Req<{ id: number }, { product: Product; history: StatusChange[] }>;
      createProduct: Req<{ name: string; description: string }, Product>;
      updateProduct: Req<
        { id: number; name: string; description: string; status: Status },
        Product
      >;

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
