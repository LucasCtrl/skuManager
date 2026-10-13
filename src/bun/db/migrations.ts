// Schema changes, applied in order. A migration runs when its `version` is newer than the db version.
// Keep in sync with schema.ts. Never edit a released migration: add a new one.
export const migrations: { version: string; sql: string }[] = [
  {
    version: "0.0.1",
    sql: `
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE products (
	id INTEGER PRIMARY KEY,
	sku TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL CHECK (status IN ('In development', 'Active', 'Retired')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE TABLE status_history (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	product_id INTEGER NOT NULL REFERENCES products(id),
	status TEXT NOT NULL,
	changed_at TEXT NOT NULL
);
CREATE INDEX status_history_product ON status_history(product_id);
`,
  },
  {
    // Adds the 'Research' status. SQLite cannot alter a CHECK, so the table is rebuilt.
    // Migrations run with foreign keys off (see runMigrations), so status_history is untouched.
    version: "0.0.2",
    sql: `
CREATE TABLE products_new (
	id INTEGER PRIMARY KEY,
	sku TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL CHECK (status IN ('In development', 'Active', 'Retired', 'Research')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
INSERT INTO products_new SELECT id, sku, name, description, status, created_at, updated_at FROM products;
DROP TABLE products;
ALTER TABLE products_new RENAME TO products;
`,
  },
];
