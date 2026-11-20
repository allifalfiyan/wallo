import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { bukaDatabase } from "./db";
import { tambahTransaksi, GalatInput } from "./transactions";
import { aturBudget, hapusBudget, hitungStatus, statusBudget, pesanBudget } from "./budgets";

let db: Database.Database;
let akunId: number;

function idKategori(nama: string, kind: string): number {
  const baris = db
    .prepare("SELECT id FROM categories WHERE name = ? AND kind = ?")
    .get(nama, kind) as { id: number };
  return baris.id;
}

function belanja(kategori: string, amount: number, date: string) {
  return tambahTransaksi(
    {
      accountId: akunId,
      categoryId: idKategori(kategori, "pengeluaran"),
      kind: "pengeluaran",
      amount,
      date,
    },
    db
  );
}

beforeEach(() => {
  db = bukaDatabase(":memory:");
  akunId = Number(
    db.prepare("INSERT INTO accounts (name) VALUES ('Tunai')").run().lastInsertRowid
  );
});

describe("hitungStatus", () => {
  it("memakai batas 80% dan 100% dengan tepat", () => {
    expect(hitungStatus(0, 100000)).toBe("aman");
    expect(hitungStatus(79999, 100000)).toBe("aman");
    expect(hitungStatus(80000, 100000)).toBe("hampir");
    expect(hitungStatus(100000, 100000)).toBe("hampir"); // pas di batas belum lewat
    expect(hitungStatus(100001, 100000)).toBe("lewat");
  });
});

describe("aturBudget", () => {
  it("menyimpan, lalu menimpa budget yang sama tanpa menggandakan baris", () => {
    const makan = idKategori("Makan & Minum", "pengeluaran");
    aturBudget({ categoryId: makan, amount: 1000000 }, db);
    aturBudget({ categoryId: makan, amount: 1500000 }, db);

    const baris = db.prepare("SELECT amount FROM budgets").all();
    expect(baris).toEqual([{ amount: 1500000 }]);
  });

  it("menolak kategori pemasukan dan kategori yang tidak ada", () => {
    expect(() =>
      aturBudget({ categoryId: idKategori("Gaji", "pemasukan"), amount: 1000 }, db)
    ).toThrow(GalatInput);
    expect(() => aturBudget({ categoryId: 9999, amount: 1000 }, db)).toThrow(
      GalatInput
    );
  });

  it("menolak batas nol atau negatif", () => {
    const makan = idKategori("Makan & Minum", "pengeluaran");
    for (const amount of [0, -1000]) {
      expect(() => aturBudget({ categoryId: makan, amount }, db)).toThrow();
    }
  });
});

describe("statusBudget", () => {
  it("menghitung pemakaian bulan itu saja dan hanya pengeluaran", () => {
    const makan = idKategori("Makan & Minum", "pengeluaran");
    aturBudget({ categoryId: makan, amount: 100000 }, db);

    belanja("Makan & Minum", 50000, "2026-11-01");
    belanja("Makan & Minum", 35000, "2026-11-30");
    belanja("Makan & Minum", 99999, "2026-10-31"); // bulan lain
    belanja("Transportasi", 77777, "2026-11-05"); // kategori lain

    const [b] = statusBudget("2026-11", db);
    expect(b).toMatchObject({
      name: "Makan & Minum",
      batas: 100000,
      terpakai: 85000,
      sisa: 15000,
      persen: 85,
      status: "hampir",
    });
  });

  it("tetap menampilkan budget yang belum terpakai, dan hapus bekerja sekali", () => {
    const hiburan = idKategori("Hiburan", "pengeluaran");
    aturBudget({ categoryId: hiburan, amount: 200000 }, db);

    expect(statusBudget("2026-11", db)).toEqual([
      {
        categoryId: hiburan,
        name: "Hiburan",
        batas: 200000,
        terpakai: 0,
        sisa: 200000,
        persen: 0,
        status: "aman",
      },
    ]);

    expect(hapusBudget(hiburan, db)).toBe(true);
    expect(hapusBudget(hiburan, db)).toBe(false);
    expect(statusBudget("2026-11", db)).toEqual([]);
  });
});


describe("pesanBudget", () => {
  const dasar = { categoryId: 1, name: "Makan & Minum", batas: 100000 };

  it("diam saat masih aman", () => {
    expect(
      pesanBudget({ ...dasar, terpakai: 10000, sisa: 90000, persen: 10, status: "aman" })
    ).toBeNull();
  });

  it("memberi tahu persen dan sisa saat hampir habis", () => {
    expect(
      pesanBudget({ ...dasar, terpakai: 85000, sisa: 15000, persen: 85, status: "hampir" })
    ).toBe("Makan & Minum sudah 85% dari budget, sisa Rp 15.000.");
  });

  it("memberi tahu kelebihan saat melewati batas", () => {
    expect(
      pesanBudget({ ...dasar, terpakai: 120000, sisa: -20000, persen: 120, status: "lewat" })
    ).toBe("Makan & Minum melewati budget Rp 20.000.");
  });
});
