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
  {
    // Raw materials and purchased parts, their managed lists, prices and status history.
    version: "0.1.0",
    sql: `
CREATE TABLE list_entries (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	list TEXT NOT NULL CHECK (list IN ('seller', 'materialType', 'partType', 'colour', 'finish', 'unit')),
	name TEXT NOT NULL,
	code TEXT NOT NULL COLLATE NOCASE,
	created_at TEXT NOT NULL,
	UNIQUE (list, code)
);
CREATE TABLE items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	kind TEXT NOT NULL CHECK (kind IN ('material', 'part')),
	sku TEXT NOT NULL UNIQUE,
	seller_id INTEGER NOT NULL REFERENCES list_entries(id),
	type_id INTEGER NOT NULL REFERENCES list_entries(id),
	colour_id INTEGER REFERENCES list_entries(id),
	finish_id INTEGER REFERENCES list_entries(id),
	size TEXT,
	specs TEXT NOT NULL DEFAULT '[]',
	unit_id INTEGER NOT NULL REFERENCES list_entries(id),
	description TEXT NOT NULL DEFAULT '',
	seller_sku TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL CHECK (status IN ('Active', 'Retired')),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);
CREATE TABLE item_prices (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item_id INTEGER NOT NULL REFERENCES items(id),
	date TEXT NOT NULL,
	cents INTEGER NOT NULL CHECK (cents >= 0)
);
CREATE INDEX item_prices_item ON item_prices(item_id);
CREATE TABLE item_status_history (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	item_id INTEGER NOT NULL REFERENCES items(id),
	status TEXT NOT NULL,
	changed_at TEXT NOT NULL
);
CREATE INDEX item_status_history_item ON item_status_history(item_id);
INSERT INTO meta (key, value) VALUES ('currency', '€');
`,
  },
];
