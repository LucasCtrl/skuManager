import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { ItemKind, ItemStatus, ListName, Status } from "../../shared/rpc";

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
  cents: integer("cents").notNull(),
});

export const itemStatusHistory = sqliteTable("item_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id").notNull(),
  status: text("status").$type<ItemStatus>().notNull(),
  changedAt: text("changed_at").notNull(),
});
