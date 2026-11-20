import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { bukaDatabase } from "./db";
import {
  tambahTransaksi,
  daftarTransaksi,
  hapusTransaksi,
  ringkasanBulan,
  GalatInput,
} from "./transactions";

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

describe("tambahTransaksi", () => {
  it("menyimpan dan mengembalikan nama dompet dan kategori", () => {
    const t = catat("pengeluaran", "Makan & Minum", 15000, "2026-11-18");
    expect(t.id).toBeGreaterThan(0);
    expect(t.accountName).toBe("Tunai");
    expect(t.categoryName).toBe("Makan & Minum");
    expect(t.amount).toBe(15000);
  });

  it("menolak jenis yang tidak sesuai dengan kategori", () => {
    expect(() =>
      tambahTransaksi(
        {
          accountId: akunId,
          categoryId: idKategori("Gaji", "pemasukan"),
          kind: "pengeluaran",
          amount: 1000,
          date: "2026-11-18",
        },
        db
      )
    ).toThrow(GalatInput);
  });

  it("menolak dompet atau kategori yang tidak ada", () => {
    const dasar = { kind: "pemasukan", amount: 1000, date: "2026-11-18" };
    expect(() =>
      tambahTransaksi(
        { ...dasar, accountId: 9999, categoryId: idKategori("Gaji", "pemasukan") },
        db
      )
    ).toThrow(GalatInput);
    expect(() =>
      tambahTransaksi({ ...dasar, accountId: akunId, categoryId: 9999 }, db)
    ).toThrow(GalatInput);
  });

  it("menolak data yang bentuknya salah", () => {
    expect(() =>
      tambahTransaksi(
        {
          accountId: akunId,
          categoryId: idKategori("Gaji", "pemasukan"),
          kind: "pemasukan",
          amount: 0,
          date: "2026-11-18",
        },
        db
      )
    ).toThrow();
  });
});

describe("daftarTransaksi", () => {
  it("hanya mengambil bulan yang diminta, termasuk hari batas, terbaru dulu", () => {
    catat("pengeluaran", "Makan & Minum", 1000, "2026-10-31");
    catat("pengeluaran", "Makan & Minum", 2000, "2026-11-01");
    catat("pengeluaran", "Makan & Minum", 3000, "2026-11-30");
    catat("pengeluaran", "Makan & Minum", 4000, "2026-12-01");

    const daftar = daftarTransaksi("2026-11", db);
    expect(daftar.map((t) => t.amount)).toEqual([3000, 2000]);
  });

  it("menolak format bulan yang salah", () => {
    expect(() => daftarTransaksi("2026-13", db)).toThrow(GalatInput);
    expect(() => daftarTransaksi("November", db)).toThrow(GalatInput);
  });
  
  it("menyertakan tanggal 31 pada bulan yang punya 31 hari", () => {
    catat("pengeluaran", "Makan & Minum", 1000, "2026-10-31");
    catat("pengeluaran", "Makan & Minum", 2000, "2026-10-30");
    catat("pengeluaran", "Makan & Minum", 3000, "2026-11-01");

    const daftar = daftarTransaksi("2026-10", db);
    expect(daftar.map((t) => t.amount)).toEqual([1000, 2000]);
  });
});

describe("ringkasanBulan", () => {
  it("menjumlahkan pemasukan dan pengeluaran bulan itu saja", () => {
    catat("pemasukan", "Gaji", 5000000, "2026-11-01");
    catat("pengeluaran", "Makan & Minum", 15000, "2026-11-02");
    catat("pengeluaran", "Transportasi", 35000, "2026-11-03");
    catat("pengeluaran", "Makan & Minum", 99999, "2026-12-01"); // bulan lain

    expect(ringkasanBulan("2026-11", db)).toEqual({
      pemasukan: 5000000,
      pengeluaran: 50000,
      selisih: 4950000,
    });
  });

  it("mengembalikan nol untuk bulan tanpa transaksi", () => {
    expect(ringkasanBulan("2026-11", db)).toEqual({
      pemasukan: 0,
      pengeluaran: 0,
      selisih: 0,
    });
  });
});

describe("hapusTransaksi", () => {
  it("menghapus sekali, lalu melaporkan tidak ada lagi", () => {
    const t = catat("pengeluaran", "Makan & Minum", 15000, "2026-11-18");
    expect(hapusTransaksi(t.id, db)).toBe(true);
    expect(hapusTransaksi(t.id, db)).toBe(false);
    expect(daftarTransaksi("2026-11", db)).toEqual([]);
  });
});
