import { describe, it, expect } from "vitest";
import { transaksiSchema } from "./schemas";

const dasar = {
  accountId: 1,
  categoryId: 1,
  kind: "pengeluaran",
  amount: 15000,
  date: "2026-11-18",
};

describe("transaksiSchema", () => {
  it("menerima data benar dan mengisi catatan kosong", () => {
    const r = transaksiSchema.safeParse(dasar);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBe("");
  });

  it("menolak jumlah nol, negatif, atau pecahan", () => {
    for (const amount of [0, -500, 1500.5]) {
      expect(transaksiSchema.safeParse({ ...dasar, amount }).success).toBe(false);
    }
  });

  it("menolak tanggal yang tidak nyata", () => {
    for (const date of ["kemarin", "2026-02-30", "2026-13-01"]) {
      expect(transaksiSchema.safeParse({ ...dasar, date }).success).toBe(false);
    }
  });

  it("menolak jenis yang tidak dikenal", () => {
    expect(transaksiSchema.safeParse({ ...dasar, kind: "hutang" }).success).toBe(false);
  });
});