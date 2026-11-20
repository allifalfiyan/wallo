import { describe, it, expect } from "vitest";
import { formatRupiah, parseRupiah, ringkasRupiah } from "./money";

describe("formatRupiah", () => {
  it("memberi titik ribuan", () => {
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(999)).toBe("Rp 999");
    expect(formatRupiah(15000)).toBe("Rp 15.000");
    expect(formatRupiah(1500000)).toBe("Rp 1.500.000");
  });

  it("menangani angka negatif", () => {
    expect(formatRupiah(-25000)).toBe("-Rp 25.000");
  });
});

describe("parseRupiah", () => {
  it("menerima angka polos dan berformat", () => {
    expect(parseRupiah("15000")).toBe(15000);
    expect(parseRupiah("15.000")).toBe(15000);
    expect(parseRupiah("1.500.000")).toBe(1500000);
    expect(parseRupiah("Rp 15.000")).toBe(15000);
    expect(parseRupiah("rp15.000")).toBe(15000);
    expect(parseRupiah("0")).toBe(0);
  });

  it("menolak input yang meragukan", () => {
    expect(parseRupiah("")).toBeNull();
    expect(parseRupiah("abc")).toBeNull();
    expect(parseRupiah("15,5")).toBeNull();
    expect(parseRupiah("1.5")).toBeNull();
    expect(parseRupiah("15.00")).toBeNull();
    expect(parseRupiah("1.2345")).toBeNull();
    expect(parseRupiah("-5000")).toBeNull();
  });

  it("menolak jumlah di atas batas", () => {
    expect(parseRupiah("99.999.999.999.999.999")).toBeNull();
  });
});

describe("ringkasRupiah", () => {
  it("menyingkat ribuan, jutaan, dan miliaran", () => {
    expect(ringkasRupiah(1000)).toBe("1 rb");
    expect(ringkasRupiah(1500)).toBe("1,5 rb");
    expect(ringkasRupiah(250000)).toBe("250 rb");
    expect(ringkasRupiah(1500000)).toBe("1,5 jt");
    expect(ringkasRupiah(2000000)).toBe("2 jt");
    expect(ringkasRupiah(2000000000)).toBe("2 M");
  });

  it("menangani nol, angka kecil, dan negatif", () => {
    expect(ringkasRupiah(0)).toBe("0");
    expect(ringkasRupiah(500)).toBe("500");
    expect(ringkasRupiah(-1500000)).toBe("-1,5 jt");
  });
});