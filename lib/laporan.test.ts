import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { bukaDatabase } from "./db";
import { tambahTransaksi, GalatInput } from "./transactions";
import { pengeluaranPerKategori, tren } from "./laporan";

let db: Database.Database;
let akunId: number;

function idKategori(nama: string, kind: string): number {
  const baris = db
    .prepare("SELECT id FROM categories WHERE name = ? AND kind = ?")
    .get(nama, kind) as { id: number };
  return baris.id;
}

function catat(
  kind: "pemasukan" | "pengeluaran",
  kategori: string,
  amount: number,
  date: string
) {
  return tambahTransaksi(
    { accountId: akunId, categoryId: idKategori(kategori, kind), kind, amount, date },
    db
  );
}

beforeEach(() => {
  db = bukaDatabase(":memory:");
  akunId = Number(
    db.prepare("INSERT INTO accounts (name) VALUES ('Tunai')").run().lastInsertRowid
  );
});

describe("pengeluaranPerKategori", () => {
  it("menjumlahkan per kategori, terbesar dulu, hanya pengeluaran bulan itu", () => {
    catat("pengeluaran", "Makan & Minum", 10000, "2026-11-01");
    catat("pengeluaran", "Makan & Minum", 15000, "2026-11-20");
    catat("pengeluaran", "Transportasi", 40000, "2026-11-05");
    catat("pengeluaran", "Hiburan", 5000, "2026-11-30");
    catat("pemasukan", "Gaji", 9000000, "2026-11-01"); // bukan pengeluaran
    catat("pengeluaran", "Belanja", 77777, "2026-12-01"); // bulan lain

    const hasil = pengeluaranPerKategori("2026-11", db);
    expect(hasil.map((h) => [h.name, h.total])).toEqual([
      ["Transportasi", 40000],
      ["Makan & Minum", 25000],
      ["Hiburan", 5000],
    ]);
  });

  it("mengembalikan daftar kosong kalau tidak ada pengeluaran", () => {
    expect(pengeluaranPerKategori("2026-11", db)).toEqual([]);
  });
});

describe("tren", () => {
  it("mengisi bulan tanpa transaksi dengan nol, urut dari yang terlama", () => {
    catat("pemasukan", "Gaji", 5000000, "2026-11-01");
    catat("pengeluaran", "Makan & Minum", 100000, "2026-11-15");
    catat("pengeluaran", "Makan & Minum", 20000, "2026-09-10");

    expect(tren("2026-11", 3, db)).toEqual([
      { bulan: "2026-09", pemasukan: 0, pengeluaran: 20000 },
      { bulan: "2026-10", pemasukan: 0, pengeluaran: 0 },
      { bulan: "2026-11", pemasukan: 5000000, pengeluaran: 100000 },
    ]);
  });

  it("melewati batas tahun", () => {
    catat("pengeluaran", "Makan & Minum", 1000, "2025-12-31");

    const hasil = tren("2026-02", 4, db);
    expect(hasil.map((t) => t.bulan)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(hasil[1].pengeluaran).toBe(1000);
  });

  it("menolak bulan atau jumlah yang tidak masuk akal", () => {
    expect(() => tren("2026-13", 6, db)).toThrow(GalatInput);
    expect(() => tren("2026-11", 0, db)).toThrow(GalatInput);
    expect(() => tren("2026-11", 37, db)).toThrow(GalatInput);
  });
});