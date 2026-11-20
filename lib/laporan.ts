import type Database from "better-sqlite3";
import { getDb } from "./db";
import { bulanValid, geserBulan } from "./tanggal";
import { GalatInput } from "./transactions";

export type PerKategori = { categoryId: number; name: string; total: number };
export type TitikTren = {
  bulan: string;
  pemasukan: number;
  pengeluaran: number;
};

export function pengeluaranPerKategori(
  bulan: string,
  db: Database.Database = getDb()
): PerKategori[] {
  if (!bulanValid(bulan)) throw new GalatInput("Format bulan harus YYYY-MM");

  return db
    .prepare(
      `SELECT c.id AS categoryId, c.name AS name, SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.kind = 'pengeluaran' AND t.date BETWEEN ? AND ?
       GROUP BY c.id
       ORDER BY total DESC, c.id`
    )
    .all(`${bulan}-01`, `${bulan}-31`) as PerKategori[];
}

// Mengembalikan `jumlah` bulan berakhir di `bulanAkhir`, dari yang terlama.
// Bulan tanpa transaksi tetap muncul dengan nilai 0 supaya grafiknya tidak bolong.
export function tren(
  bulanAkhir: string,
  jumlah = 6,
  db: Database.Database = getDb()
): TitikTren[] {
  if (!bulanValid(bulanAkhir)) throw new GalatInput("Format bulan harus YYYY-MM");
  if (!Number.isInteger(jumlah) || jumlah < 1 || jumlah > 36) {
    throw new GalatInput("Jumlah bulan harus 1 sampai 36");
  }

  const awal = geserBulan(bulanAkhir, -(jumlah - 1));
  const baris = db
    .prepare(
      `SELECT substr(date, 1, 7) AS bulan, kind, SUM(amount) AS total
       FROM transactions
       WHERE date BETWEEN ? AND ?
       GROUP BY bulan, kind`
    )
    .all(`${awal}-01`, `${bulanAkhir}-31`) as {
    bulan: string;
    kind: string;
    total: number;
  }[];

  const hasil: TitikTren[] = [];
  for (let i = 0; i < jumlah; i++) {
    const b = geserBulan(awal, i);
    hasil.push({
      bulan: b,
      pemasukan: baris.find((x) => x.bulan === b && x.kind === "pemasukan")?.total ?? 0,
      pengeluaran: baris.find((x) => x.bulan === b && x.kind === "pengeluaran")?.total ?? 0,
    });
  }
  return hasil;
}