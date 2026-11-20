import { describe, it, expect } from "vitest";
import { bukaDatabase } from "./db";
import { semuaKategori } from "./categories";

describe("semuaKategori", () => {
  it("menyediakan kategori bawaan untuk kedua jenis", () => {
    const db = bukaDatabase(":memory:");
    const daftar = semuaKategori(db);
    expect(daftar.filter((k) => k.kind === "pengeluaran")).toHaveLength(8);
    expect(daftar.filter((k) => k.kind === "pemasukan")).toHaveLength(4);
  });

  it("setiap jenis punya kategori Lainnya", () => {
    const db = bukaDatabase(":memory:");
    const daftar = semuaKategori(db);
    for (const kind of ["pemasukan", "pengeluaran"]) {
      expect(daftar.some((k) => k.kind === kind && k.name === "Lainnya")).toBe(true);
    }
  });
});