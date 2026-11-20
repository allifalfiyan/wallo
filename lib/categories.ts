import type Database from "better-sqlite3";
import { getDb } from "./db";

export type Kategori = {
  id: number;
  name: string;
  kind: "pemasukan" | "pengeluaran";
};

export function semuaKategori(db: Database.Database = getDb()): Kategori[] {
  return db
    .prepare("SELECT id, name, kind FROM categories ORDER BY id")
    .all() as Kategori[];
}