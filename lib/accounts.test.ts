import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { bukaDatabase } from "./db";
import { tambahDompet, semuaDompet, adaDompet, saldoDompet } from "./accounts";
import { tambahTransaksi } from "./transactions";

let db: Database.Database;

beforeEach(() => {
  db = bukaDatabase(":memory:");
});

describe("dompet", () => {
  it("awalnya belum ada dompet", () => {
    expect(adaDompet(db)).toBe(false);
    expect(semuaDompet(db)).toEqual([]);
  });

  it("menyimpan dompet dan merapikan spasi pada nama", () => {
    const d = tambahDompet(
      { name: "  Tunai  ", type: "tunai", openingBalance: 500000 },
      db
    );
    expect(d.name).toBe("Tunai");
    expect(adaDompet(db)).toBe(true);
    expect(semuaDompet(db)).toEqual([d]);
  });

  it("menolak nama kosong, jenis ngawur, dan saldo negatif", () => {
    const salah = [
      { name: "   ", type: "tunai", openingBalance: 0 },
      { name: "X", type: "emas", openingBalance: 0 },
      { name: "X", type: "bank", openingBalance: -1 },
    ];
    for (const input of salah) {
      expect(() => tambahDompet(input, db)).toThrow();
    }
    expect(adaDompet(db)).toBe(false);
  });
});

describe("saldoDompet", () => {
  function idKategori(nama: string, kind: string): number {
    const baris = db
      .prepare("SELECT id FROM categories WHERE name = ? AND kind = ?")
      .get(nama, kind) as { id: number };
    return baris.id;
  }

  const catat = (
    accountId: number,
    kind: "pemasukan" | "pengeluaran",
    kategori: string,
    amount: number
  ) =>
    tambahTransaksi(
      {
        accountId,
        categoryId: idKategori(kategori, kind),
        kind,
        amount,
        date: "2026-11-18",
      },
      db
    );

  it("sama dengan saldo awal kalau belum ada transaksi", () => {
    const d = tambahDompet(
      { name: "Tunai", type: "tunai", openingBalance: 100000 },
      db
    );
    expect(saldoDompet(db)).toEqual([{ ...d, saldo: 100000 }]);
  });

  it("menambah pemasukan dan mengurangi pengeluaran, per dompet", () => {
    const tunai = tambahDompet(
      { name: "Tunai", type: "tunai", openingBalance: 100000 },
      db
    );
    const bank = tambahDompet(
      { name: "Bank", type: "bank", openingBalance: 0 },
      db
    );

    catat(tunai.id, "pemasukan", "Gaji", 50000);
    catat(tunai.id, "pengeluaran", "Makan & Minum", 20000);
    catat(bank.id, "pemasukan", "Bonus", 7000);

    expect(saldoDompet(db).map((d) => d.saldo)).toEqual([130000, 7000]);
  });
});