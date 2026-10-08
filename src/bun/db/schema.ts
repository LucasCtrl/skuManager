import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import type { Status } from "../../shared/rpc";

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
