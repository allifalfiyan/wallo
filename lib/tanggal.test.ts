import { describe, it, expect } from "vitest";
import {
  hariIni,
  bulanValid,
  bulanDari,
  geserBulan,
  namaBulan,
  namaBulanSingkat,
  selisihBulan
} from "./tanggal";

describe("hariIni", () => {
  it("memakai tanggal lokal dan memberi nol di depan", () => {
    // 00.30 waktu lokal: kalau memakai UTC, di WIB hasilnya jadi tanggal sebelumnya
    expect(hariIni(new Date(2026, 10, 18, 0, 30))).toBe("2026-11-18");
    expect(hariIni(new Date(2026, 0, 5, 12, 0))).toBe("2026-01-05");
  });
});

describe("bulan", () => {
  it("memeriksa format bulan dan mengambilnya dari tanggal", () => {
    expect(bulanValid("2026-11")).toBe(true);
    for (const salah of ["2026-13", "2026-00", "2026-1", "November", ""]) {
      expect(bulanValid(salah)).toBe(false);
    }
    expect(bulanDari("2026-11-18")).toBe("2026-11");
  });

  it("menggeser bulan melewati batas tahun", () => {
    expect(geserBulan("2026-11", 1)).toBe("2026-12");
    expect(geserBulan("2026-12", 1)).toBe("2027-01");
    expect(geserBulan("2026-01", -1)).toBe("2025-12");
    expect(geserBulan("2026-03", -14)).toBe("2025-01");
  });

  it("menulis nama bulan dalam bahasa Indonesia", () => {
    expect(namaBulan("2026-11")).toBe("November 2026");
    expect(namaBulan("2027-01")).toBe("Januari 2027");
  });
});

describe("namaBulanSingkat", () => {
  it("menyingkat nama bulan", () => {
    expect(namaBulanSingkat("2026-01")).toBe("Jan");
    expect(namaBulanSingkat("2026-08")).toBe("Agu");
    expect(namaBulanSingkat("2026-11")).toBe("Nov");
  });
});

describe("selisihBulan", () => {
  it("menghitung selisih bulan kalender, melewati tahun, dan bisa negatif", () => {
    expect(selisihBulan("2026-11", "2026-11")).toBe(0);
    expect(selisihBulan("2026-11", "2027-03")).toBe(4);
    expect(selisihBulan("2026-12", "2027-01")).toBe(1);
    expect(selisihBulan("2027-03", "2026-11")).toBe(-4);
  });
});