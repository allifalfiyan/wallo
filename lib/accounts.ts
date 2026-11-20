import type Database from "better-sqlite3";
import { getDb } from "./db";
import { dompetSchema } from "./schemas";

export type Dompet = {
  id: number;
  name: string;
  type: string;
  openingBalance: number;
};

export function tambahDompet(
  input: unknown,
  db: Database.Database = getDb()
): Dompet {
  const data = dompetSchema.parse(input);
  const hasil = db
    .prepare(
      "INSERT INTO accounts (name, type, opening_balance) VALUES (?, ?, ?)"
    )
    .run(data.name, data.type, data.openingBalance);

  return {
    id: Number(hasil.lastInsertRowid),
    name: data.name,
    type: data.type,
    openingBalance: data.openingBalance,
  };
}

export function semuaDompet(db: Database.Database = getDb()): Dompet[] {
  return db
    .prepare(
      "SELECT id, name, type, opening_balance AS openingBalance FROM accounts ORDER BY id"
    )
    .all() as Dompet[];
}

export function adaDompet(db: Database.Database = getDb()): boolean {
  return db.prepare("SELECT 1 FROM accounts LIMIT 1").get() !== undefined;
}

export type DompetSaldo = Dompet & { saldo: number };

export function saldoDompet(db: Database.Database = getDb()): DompetSaldo[] {
  return db
    .prepare(
      `SELECT a.id, a.name, a.type, a.opening_balance AS openingBalance,
              a.opening_balance + COALESCE(SUM(
                CASE t.kind
                  WHEN 'pemasukan' THEN t.amount
                  WHEN 'pengeluaran' THEN -t.amount
                END
              ), 0) AS saldo
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       GROUP BY a.id
       ORDER BY a.id`
    )
    .all() as DompetSaldo[];
}