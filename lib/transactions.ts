import type Database from "better-sqlite3";
import { getDb } from "./db";
import { transaksiSchema } from "./schemas";

export type Transaksi = {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number;
  categoryName: string;
  kind: "pemasukan" | "pengeluaran";
  amount: number;
  date: string;
  note: string;
};

// Kesalahan aturan bisnis (beda dari kesalahan bentuk data milik Zod)
export class GalatInput extends Error {}

const SELECT_TRANSAKSI = `
  SELECT t.id, t.account_id AS accountId, a.name AS accountName,
         t.category_id AS categoryId, c.name AS categoryName,
         t.kind, t.amount, t.date, t.note
  FROM transactions t
  JOIN accounts a ON a.id = t.account_id
  JOIN categories c ON c.id = t.category_id
`;

function rentangBulan(bulan: string): [string, string] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan)) {
    throw new GalatInput("Format bulan harus YYYY-MM");
  }
  // Tidak ada tanggal valid di atas 31, jadi "-31" aman sebagai batas atas
  return [`${bulan}-01`, `${bulan}-31`];
}

export function tambahTransaksi(
  input: unknown,
  db: Database.Database = getDb()
): Transaksi {
  const data = transaksiSchema.parse(input);

  const akun = db
    .prepare("SELECT id FROM accounts WHERE id = ?")
    .get(data.accountId);
  if (!akun) throw new GalatInput("Dompet tidak ditemukan");

  const kategori = db
    .prepare("SELECT kind FROM categories WHERE id = ?")
    .get(data.categoryId) as { kind: string } | undefined;
  if (!kategori) throw new GalatInput("Kategori tidak ditemukan");
  if (kategori.kind !== data.kind) {
    throw new GalatInput("Jenis transaksi tidak sesuai dengan jenis kategori");
  }

  const hasil = db
    .prepare(
      `INSERT INTO transactions (account_id, category_id, kind, amount, date, note)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.accountId,
      data.categoryId,
      data.kind,
      data.amount,
      data.date,
      data.note
    );

  return db
    .prepare(`${SELECT_TRANSAKSI} WHERE t.id = ?`)
    .get(Number(hasil.lastInsertRowid)) as Transaksi;
}

export function daftarTransaksi(
  bulan: string,
  db: Database.Database = getDb()
): Transaksi[] {
  const [awal, akhir] = rentangBulan(bulan);
  return db
    .prepare(
      `${SELECT_TRANSAKSI}
       WHERE t.date BETWEEN ? AND ?
       ORDER BY t.date DESC, t.id DESC`
    )
    .all(awal, akhir) as Transaksi[];
}

export function hapusTransaksi(
  id: number,
  db: Database.Database = getDb()
): boolean {
  return db.prepare("DELETE FROM transactions WHERE id = ?").run(id).changes > 0;
}

export function ringkasanBulan(
  bulan: string,
  db: Database.Database = getDb()
) {
  const [awal, akhir] = rentangBulan(bulan);
  const baris = db
    .prepare(
      `SELECT kind, SUM(amount) AS total FROM transactions
       WHERE date BETWEEN ? AND ? GROUP BY kind`
    )
    .all(awal, akhir) as { kind: string; total: number }[];

  const pemasukan = baris.find((b) => b.kind === "pemasukan")?.total ?? 0;
  const pengeluaran = baris.find((b) => b.kind === "pengeluaran")?.total ?? 0;
  return { pemasukan, pengeluaran, selisih: pemasukan - pengeluaran };
}