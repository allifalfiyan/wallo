import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Daftar migrasi: urutan = versi skema. Jangan ubah yang sudah ada,
// tambahkan entri baru di bawahnya saat skema perlu berubah.
const MIGRASI: string[] = [
  // v1: dompet dan kategori
  `
  CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'tunai',
    opening_balance INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('pemasukan', 'pengeluaran')),
    UNIQUE (name, kind)
  );

  INSERT INTO categories (name, kind) VALUES
    ('Makan & Minum', 'pengeluaran'),
    ('Transportasi', 'pengeluaran'),
    ('Tagihan', 'pengeluaran'),
    ('Belanja', 'pengeluaran'),
    ('Hiburan', 'pengeluaran'),
    ('Kesehatan', 'pengeluaran'),
    ('Pendidikan', 'pengeluaran'),
    ('Lainnya', 'pengeluaran'),
    ('Gaji', 'pemasukan'),
    ('Usaha', 'pemasukan'),
    ('Bonus', 'pemasukan'),
    ('Lainnya', 'pemasukan');
  `,
    // v2: transaksi
  `
  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    kind TEXT NOT NULL CHECK (kind IN ('pemasukan', 'pengeluaran')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_transactions_date ON transactions (date);
  CREATE INDEX idx_transactions_account ON transactions (account_id);
  CREATE INDEX idx_transactions_category ON transactions (category_id);
  `,

    // v3: budget per kategori
  `
  CREATE TABLE budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL UNIQUE REFERENCES categories(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `,
    // v4: target tabungan
  `
  CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target INTEGER NOT NULL CHECK (target > 0),
    start_date TEXT NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    deadline TEXT NOT NULL CHECK (deadline GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK (deadline >= start_date)
  );

  CREATE TABLE goal_deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    date TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX idx_goal_deposits_goal ON goal_deposits (goal_id);
  `,
];

export function bukaDatabase(file: string): Database.Database {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const versi = db.pragma("user_version", { simple: true }) as number;
  for (let i = versi; i < MIGRASI.length; i++) {
    db.transaction(() => {
      db.exec(MIGRASI[i]);
      db.pragma(`user_version = ${i + 1}`);
    })();
  }

  return db;
}

// Satu koneksi saja, walau file ini dimuat ulang saat development
const globalForDb = globalThis as unknown as { wallo?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.wallo) {
    globalForDb.wallo = bukaDatabase(
      process.env.WALLO_DB_PATH ?? path.join(process.cwd(), "data", "wallo.db")
    );
  }
  return globalForDb.wallo;
}