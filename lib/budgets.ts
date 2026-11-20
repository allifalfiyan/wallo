import type Database from "better-sqlite3";
import { getDb } from "./db";
import { budgetSchema } from "./schemas";
import { bulanValid } from "./tanggal";
import { GalatInput } from "./transactions";
import { formatRupiah } from "./money";

export type StatusBudget = "aman" | "hampir" | "lewat";

export type Budget = {
  categoryId: number;
  name: string;
  batas: number;
  terpakai: number;
  sisa: number; // bisa negatif kalau sudah lewat
  persen: number; // tidak dibatasi 100, UI yang memotongnya
  status: StatusBudget;
};

// Hanya bilangan bulat: tidak ada pembulatan yang bisa menggeser batasnya
export function hitungStatus(terpakai: number, batas: number): StatusBudget {
  if (terpakai > batas) return "lewat";
  if (terpakai * 10 >= batas * 8) return "hampir";
  return "aman";
}

export function aturBudget(input: unknown, db: Database.Database = getDb()) {
  const data = budgetSchema.parse(input);

  const kategori = db
    .prepare("SELECT kind FROM categories WHERE id = ?")
    .get(data.categoryId) as { kind: string } | undefined;
  if (!kategori) throw new GalatInput("Kategori tidak ditemukan");
  if (kategori.kind !== "pengeluaran") {
    throw new GalatInput("Budget hanya untuk kategori pengeluaran");
  }

  db.prepare(
    `INSERT INTO budgets (category_id, amount) VALUES (?, ?)
     ON CONFLICT(category_id) DO UPDATE SET amount = excluded.amount`
  ).run(data.categoryId, data.amount);

  return { categoryId: data.categoryId, amount: data.amount };
}

export function hapusBudget(
  categoryId: number,
  db: Database.Database = getDb()
): boolean {
  return (
    db.prepare("DELETE FROM budgets WHERE category_id = ?").run(categoryId)
      .changes > 0
  );
}

export function statusBudget(
  bulan: string,
  db: Database.Database = getDb()
): Budget[] {
  if (!bulanValid(bulan)) throw new GalatInput("Format bulan harus YYYY-MM");

  // Syarat tanggal ada di ON (bukan WHERE), supaya budget yang belum
  // dipakai sama sekali tetap muncul dengan terpakai = 0
  const baris = db
    .prepare(
      `SELECT b.category_id AS categoryId, c.name AS name, b.amount AS batas,
              COALESCE(SUM(t.amount), 0) AS terpakai
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t
         ON t.category_id = b.category_id
        AND t.kind = 'pengeluaran'
        AND t.date BETWEEN ? AND ?
       GROUP BY b.category_id
       ORDER BY c.id`
    )
    .all(`${bulan}-01`, `${bulan}-31`) as {
    categoryId: number;
    name: string;
    batas: number;
    terpakai: number;
  }[];

  return baris.map((b) => ({
    ...b,
    sisa: b.batas - b.terpakai,
    persen: Math.round((b.terpakai * 100) / b.batas),
    status: hitungStatus(b.terpakai, b.batas),
  }));
}

// Pesan untuk Wally. null = tidak ada yang perlu disampaikan.
export function pesanBudget(b: Budget): string | null {
  if (b.status === "aman") return null;
  if (b.status === "lewat") {
    return `${b.name} melewati budget ${formatRupiah(b.terpakai - b.batas)}.`;
  }
  return `${b.name} sudah ${b.persen}% dari budget, sisa ${formatRupiah(b.sisa)}.`;
}