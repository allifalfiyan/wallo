import { describe, it, expect, beforeEach } from "vitest";
import type Database from "better-sqlite3";
import { bukaDatabase } from "./db";
import { GalatInput } from "./transactions";
import {
  bulanTersisa,
  buatTarget,
  daftarSetoran,
  daftarTarget,
  hapusSetoran,
  hapusTarget,
  hitungTarget,
  setoranPerBulan,
  tambahSetoran,
  pesanTarget,
  type Target
} from "./goals";

describe("setoranPerBulan", () => {
  it("membulatkan ke atas dan aman untuk nilai tidak wajar", () => {
    expect(setoranPerBulan(1000000, 3)).toBe(333334);
    expect(setoranPerBulan(3000000, 3)).toBe(1000000);
    expect(setoranPerBulan(1, 12)).toBe(1);
    expect(setoranPerBulan(0, 5)).toBe(0);
    expect(setoranPerBulan(-1, 5)).toBe(0);
    expect(setoranPerBulan(1000, 0)).toBe(0);
  });
});

describe("bulanTersisa", () => {
  it("menghitung bulan kalender inklusif dan tidak pernah negatif", () => {
    expect(bulanTersisa("2026-11-19", "2027-03-31")).toBe(5);
    expect(bulanTersisa("2026-11-19", "2026-11-30")).toBe(1);
    expect(bulanTersisa("2026-12-31", "2026-12-01")).toBe(1);
    expect(bulanTersisa("2026-12-31", "2026-11-30")).toBe(0);
  });
});

describe("hitungTarget", () => {
  // Rp6.000.000, Nov 2026 sampai Apr 2027 = 6 bulan, jadi Rp1.000.000 per bulan
  const dasar = { target: 6000000, startDate: "2026-11-01", deadline: "2027-04-30" };
  const hitung = (terkumpul: number, hariIni: string) =>
    hitungTarget({ ...dasar, terkumpul, hariIni });

  it("bulan pertama tanpa setoran masih di jalur", () => {
    expect(hitung(0, "2026-11-19")).toEqual({
      sisa: 6000000,
      persen: 0,
      bulanTersisa: 6,
      perBulan: 1000000,
      status: "di jalur",
    });
  });

  it("tepat di batas antara di jalur dan tertinggal, setoran dibulatkan ke atas", () => {
    // Bulan ke-3: seharusnya sudah ada porsi 2 bulan = Rp2.000.000
    expect(hitung(2000000, "2027-01-10")).toMatchObject({
      status: "di jalur",
      sisa: 4000000,
      bulanTersisa: 4,
      perBulan: 1000000,
    });
    expect(hitung(1999999, "2027-01-10")).toMatchObject({
      status: "tertinggal",
      sisa: 4000001,
      perBulan: 1000001,
    });
  });

  it("tercapai, termasuk kalau melebihi target", () => {
    expect(hitung(6000000, "2027-01-10")).toMatchObject({
      status: "tercapai",
      sisa: 0,
      persen: 100,
      perBulan: 0,
    });
    expect(hitung(7200000, "2027-01-10")).toMatchObject({
      status: "tercapai",
      sisa: 0,
      persen: 120,
      perBulan: 0,
    });
  });

  it("lewat tenggat mulai sehari sesudah tenggat, bukan di hari tenggat", () => {
    expect(hitung(3000000, "2027-05-01")).toMatchObject({
      status: "lewat tenggat",
      bulanTersisa: 0,
      perBulan: 0,
      sisa: 3000000,
    });
    expect(hitung(3000000, "2027-04-30")).toMatchObject({
      status: "tertinggal",
      bulanTersisa: 1,
      perBulan: 3000000,
    });
  });

  it("tenggat di bulan ini berarti tersisa satu bulan", () => {
    expect(hitung(5000000, "2027-04-10")).toMatchObject({
      status: "di jalur",
      bulanTersisa: 1,
      sisa: 1000000,
      perBulan: 1000000,
    });
  });

  it("persen dibulatkan ke bawah, tidak pernah 100 sebelum tercapai", () => {
    expect(hitung(5999999, "2027-04-10").persen).toBe(99);
  });
});

describe("target di database", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = bukaDatabase(":memory:");
  });

  it("menyimpan target dan menghitung terkumpul dari setoran", () => {
    const { id } = buatTarget(
      { name: "Liburan", target: 6000000, deadline: "2027-04-30" },
      "2026-11-01",
      db
    );
    tambahSetoran({ goalId: id, amount: 1500000, date: "2026-11-10" }, db);
    tambahSetoran({ goalId: id, amount: 1000000, date: "2026-11-20" }, db);

    const [t] = daftarTarget("2026-11-25", db);
    expect(t).toMatchObject({
      id,
      name: "Liburan",
      target: 6000000,
      startDate: "2026-11-01",
      deadline: "2027-04-30",
      terkumpul: 2500000,
      sisa: 3500000,
      persen: 41,
      bulanTersisa: 6,
      perBulan: 583334,
      status: "di jalur",
    });
  });

  it("menolak target dengan input yang salah", () => {
    const dasar = { name: "Laptop", target: 1000000, deadline: "2027-01-31" };
    expect(() => buatTarget({ ...dasar, name: "   " }, "2026-11-01", db)).toThrow();
    expect(() => buatTarget({ ...dasar, target: 0 }, "2026-11-01", db)).toThrow();
    expect(() =>
      buatTarget({ ...dasar, deadline: "kapan-kapan" }, "2026-11-01", db)
    ).toThrow();
    expect(() =>
      buatTarget({ ...dasar, deadline: "2026-10-31" }, "2026-11-01", db)
    ).toThrow(GalatInput);
    expect(daftarTarget("2026-11-01", db)).toEqual([]);
  });

  it("menolak setoran untuk target yang tidak ada atau jumlah yang tidak valid", () => {
    const { id } = buatTarget(
      { name: "Laptop", target: 1000000, deadline: "2027-01-31" },
      "2026-11-01",
      db
    );
    expect(() =>
      tambahSetoran({ goalId: 9999, amount: 1000, date: "2026-11-10" }, db)
    ).toThrow(GalatInput);
    for (const amount of [0, -5, 10.5]) {
      expect(() =>
        tambahSetoran({ goalId: id, amount, date: "2026-11-10" }, db)
      ).toThrow();
    }
    expect(() =>
      tambahSetoran({ goalId: id, amount: 1000, date: "kemarin" }, db)
    ).toThrow();
  });

  it("daftar setoran terbaru dulu, dan menghapus setoran mengurangi terkumpul", () => {
    const { id } = buatTarget(
      { name: "Laptop", target: 1000000, deadline: "2027-01-31" },
      "2026-11-01",
      db
    );
    const pertama = tambahSetoran({ goalId: id, amount: 1000, date: "2026-11-01" }, db);
    tambahSetoran({ goalId: id, amount: 2000, date: "2026-11-15" }, db);

    expect(daftarSetoran(id, db).map((s) => s.amount)).toEqual([2000, 1000]);
    expect(hapusSetoran(pertama.id, db)).toBe(true);
    expect(hapusSetoran(pertama.id, db)).toBe(false);
    expect(daftarTarget("2026-11-20", db)[0].terkumpul).toBe(2000);
  });

  it("mengurutkan dari tenggat terdekat, dan menghapus target ikut menghapus setorannya", () => {
    const jauh = buatTarget(
      { name: "Rumah", target: 50000000, deadline: "2030-12-31" },
      "2026-11-01",
      db
    );
    const dekat = buatTarget(
      { name: "Laptop", target: 1000000, deadline: "2027-01-31" },
      "2026-11-01",
      db
    );
    tambahSetoran({ goalId: dekat.id, amount: 500000, date: "2026-11-05" }, db);

    expect(daftarTarget("2026-11-10", db).map((t) => t.name)).toEqual([
      "Laptop",
      "Rumah",
    ]);
    expect(hapusTarget(dekat.id, db)).toBe(true);
    expect(hapusTarget(dekat.id, db)).toBe(false);
    expect(db.prepare("SELECT COUNT(*) AS n FROM goal_deposits").get()).toEqual({
      n: 0,
    });
    expect(daftarTarget("2026-11-10", db).map((t) => t.id)).toEqual([jauh.id]);
  });
});

describe("pesanTarget", () => {
  const dasar: Target = {
    id: 1,
    name: "Liburan",
    target: 6000000,
    startDate: "2026-11-01",
    deadline: "2027-04-30",
    terkumpul: 0,
    sisa: 6000000,
    persen: 0,
    bulanTersisa: 6,
    perBulan: 1000000,
    status: "di jalur",
  };

  it("memberi selamat saat tercapai dan mengingatkan saat tenggat lewat", () => {
    expect(
      pesanTarget({ ...dasar, name: "Laptop", status: "tercapai", sisa: 0, perBulan: 0 })
    ).toBe("Laptop tercapai. Selamat!");
    expect(
      pesanTarget({
        ...dasar,
        name: "Laptop",
        status: "lewat tenggat",
        sisa: 3000000,
        perBulan: 0,
        bulanTersisa: 0,
      })
    ).toBe("Tenggat Laptop sudah lewat, masih kurang Rp 3.000.000.");
  });

  it("menyebut setoran per bulan saat di jalur atau tertinggal", () => {
    expect(pesanTarget({ ...dasar, perBulan: 583334 })).toBe(
      "Liburan di jalur. Sisihkan Rp 583.334 per bulan selama 6 bulan lagi."
    );
    expect(
      pesanTarget({ ...dasar, status: "tertinggal", perBulan: 1000001, bulanTersisa: 4 })
    ).toBe(
      "Liburan tertinggal. Agar tepat waktu, sisihkan Rp 1.000.001 per bulan selama 4 bulan lagi."
    );
  });

  it("menyebut 'bulan ini' kalau tinggal satu bulan", () => {
    expect(pesanTarget({ ...dasar, bulanTersisa: 1, perBulan: 1000000 })).toBe(
      "Liburan di jalur. Sisihkan Rp 1.000.000 bulan ini."
    );
  });
});