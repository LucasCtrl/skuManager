import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type {
  ItemKind,
  ItemStatus,
  ListName,
  PartStatus,
  RateKind,
  Status,
} from "../../shared/rpc";

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey(), // the 5-digit SKU number
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").$type<Status>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const statusHistory = sqliteTable("status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  status: text("status").$type<Status>().notNull(),
  changedAt: text("changed_at").notNull(),
});

// ---------- raw materials and purchased parts ----------

export const listEntries = sqliteTable("list_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  list: text("list").$type<ListName>().notNull(),
  name: text("name").notNull(),
  code: text("code").notNull(), // unique per list, case-insensitive
  createdAt: text("created_at").notNull(),
});

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").$type<ItemKind>().notNull(),
  sku: text("sku").notNull().unique(),
  sellerId: integer("seller_id").notNull(),
  typeId: integer("type_id").notNull(),
  colourId: integer("colour_id"),
  finishId: integer("finish_id"),
  size: text("size"),
  specs: text("specs").notNull().default("[]"), // JSON array of codes
  unitId: integer("unit_id").notNull(),
  description: text("description").notNull().default(""),
  sellerSku: text("seller_sku").notNull().default(""),
  status: text("status").$type<ItemStatus>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const itemPrices = sqliteTable("item_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  date: text("date").notNull(),
  amount: integer("amount").notNull(), // ten-thousandths of the currency
});

export const itemStatusHistory = sqliteTable("item_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  status: text("status").$type<ItemStatus>().notNull(),
  changedAt: text("changed_at").notNull(),
});

// ---------- operations ----------

export const operations = sqliteTable("operations", {
  id: integer("id").primaryKey(), // the 5-digit SKU number
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  rateKind: text("rate_kind").$type<RateKind>().notNull(),
  unitId: integer("unit_id"), // per quantity only
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const operationRates = sqliteTable("operation_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  operationId: integer("operation_id").notNull(),
  date: text("date").notNull(),
  amount: integer("amount").notNull(), // ten-thousandths of the currency
});

// ---------- manufactured parts and compositions ----------

export const manufacturedParts = sqliteTable("manufactured_parts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull(), // origin product
  name: text("name").notNull(),
  code: text("code").notNull(), // [partName], unique per product ignoring case
  createdAt: text("created_at").notNull(),
});

export const partVersions = sqliteTable("part_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  partId: integer("part_id").notNull(),
  version: integer("version").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description").notNull().default(""),
  status: text("status").$type<PartStatus>().notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const partStatusHistory = sqliteTable("part_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  versionId: integer("version_id").notNull(),
  status: text("status").$type<PartStatus>().notNull(),
  changedAt: text("changed_at").notNull(),
});

// Owner: product_id or version_id. Component: item_id, operation_id or part_version_id.
export const compositionLines = sqliteTable("composition_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id"),
  versionId: integer("version_id"),
  itemId: integer("item_id"),
  operationId: integer("operation_id"),
  partVersionId: integer("part_version_id"),
  quantity: integer("quantity").notNull(), // see CompositionLine in shared/rpc.ts
  toReview: integer("to_review", { mode: "boolean" }).notNull().default(false),
});
