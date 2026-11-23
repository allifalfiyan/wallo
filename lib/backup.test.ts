import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VERSI_SKEMA, bukaDatabase } from "./db";
import {
  buatBackup,
  cadanganHarian,
  daftarBackup,
  gantiDatabase,
  periksaBackup,
  stempelWaktu,
} from "./backup";

let folder: string;
const terbuka: Database.Database[] = [];

function buka(file: string): Database.Database {
  const db = bukaDatabase(file);
  terbuka.push(db);
  return db;
}

beforeEach(() => {
  folder = fs.mkdtempSync(path.join(os.tmpdir(), "wallo-test-"));
});

afterEach(() => {
  for (const db of terbuka.splice(0)) {
    if (db.open) db.close();
  }
  fs.rmSync(folder, { recursive: true, force: true, maxRetries: 3 });
});

describe("stempelWaktu", () => {
  it("memakai jam lokal dan nol di depan", () => {
    expect(stempelWaktu(new Date(2026, 10, 20, 14, 5, 9))).toBe("20261120-140509");
    expect(stempelWaktu(new Date(2026, 0, 5, 0, 0, 0))).toBe("20260105-000000");
  });
});

describe("buatBackup", () => {
  it("menghasilkan salinan lengkap yang bisa dibuka, walau database sedang dipakai", async () => {
    const db = buka(path.join(folder, "wallo.db"));
    db.prepare("INSERT INTO accounts (name) VALUES ('Tunai')").run();

    const tujuan = path.join(folder, "salinan", "cadangan.db");
    await buatBackup(db, tujuan);

    const salinan = buka(tujuan);
    expect(salinan.prepare("SELECT name FROM accounts").all()).toEqual([
      { name: "Tunai" },
    ]);
    expect(salinan.pragma("user_version", { simple: true })).toBe(VERSI_SKEMA);
  });
});

describe("periksaBackup", () => {
  async function cadanganSah(): Promise<string> {
    const db = buka(path.join(folder, "asal.db"));
    db.prepare("INSERT INTO accounts (name) VALUES ('Tunai')").run();
    const tujuan = path.join(folder, "sah.db");
    await buatBackup(db, tujuan);
    return tujuan;
  }

  it("menerima cadangan Wallo yang sah", async () => {
    const hasil = periksaBackup(await cadanganSah(), VERSI_SKEMA);
    expect(hasil).toEqual({ ok: true, versi: VERSI_SKEMA });
  });

  it("menolak file yang bukan database SQLite", () => {
    const file = path.join(folder, "bukan.db");
    fs.writeFileSync(file, "ini hanya teks biasa, bukan database");
    expect(periksaBackup(file, VERSI_SKEMA).ok).toBe(false);
  });

  it("menolak cadangan dari Wallo versi yang lebih baru", async () => {
    const file = await cadanganSah();
    const db = new Database(file);
    db.pragma(`user_version = ${VERSI_SKEMA + 1}`);
    db.close();

    const hasil = periksaBackup(file, VERSI_SKEMA);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.alasan).toContain("lebih baru");
  });

  it("menolak database SQLite lain yang bukan milik Wallo", () => {
    const file = path.join(folder, "lain.db");
    const db = new Database(file);
    db.exec("CREATE TABLE catatan (isi TEXT)");
    db.pragma("user_version = 1");
    db.close();

    expect(periksaBackup(file, VERSI_SKEMA).ok).toBe(false);
  });
});

describe("cadanganHarian", () => {
  it("membuat satu cadangan per hari, tidak menggandakan", async () => {
    const db = buka(path.join(folder, "wallo.db"));
    const dir = path.join(folder, "backups");

    expect(await cadanganHarian(db, dir, "2026-11-20")).toBe(true);
    expect(await cadanganHarian(db, dir, "2026-11-20")).toBe(false);
    expect(fs.readdirSync(dir)).toEqual(["auto-2026-11-20.db"]);
  });

  it("memangkas cadangan otomatis yang lama tanpa menyentuh file lain", async () => {
    const db = buka(path.join(folder, "wallo.db"));
    const dir = path.join(folder, "backups");
    fs.mkdirSync(dir, { recursive: true });
    for (let h = 1; h <= 10; h++) {
      const nama = `auto-2026-11-${String(h).padStart(2, "0")}.db`;
      fs.writeFileSync(path.join(dir, nama), "x");
    }
    fs.writeFileSync(path.join(dir, "sebelum-restore-20261101-000000.db"), "x");

    await cadanganHarian(db, dir, "2026-11-20", 3);

    expect(fs.readdirSync(dir).sort()).toEqual([
      "auto-2026-11-09.db",
      "auto-2026-11-10.db",
      "auto-2026-11-20.db",
      "sebelum-restore-20261101-000000.db",
    ]);
  });
});

describe("daftarBackup", () => {
  it("menampilkan file .db saja, yang terbaru dulu, dan kosong kalau folder belum ada", () => {
    expect(daftarBackup(path.join(folder, "tidak-ada"))).toEqual([]);

    const dir = path.join(folder, "backups");
    fs.mkdirSync(dir);
    const lama = path.join(dir, "auto-2026-11-01.db");
    const baru = path.join(dir, "auto-2026-11-02.db");
    fs.writeFileSync(lama, "abc");
    fs.writeFileSync(baru, "abcdef");
    fs.writeFileSync(path.join(dir, "setengah.db.tmp"), "x");
    fs.utimesSync(lama, new Date(2026, 10, 1), new Date(2026, 10, 1));
    fs.utimesSync(baru, new Date(2026, 10, 2), new Date(2026, 10, 2));

    expect(daftarBackup(dir).map((b) => [b.nama, b.ukuran])).toEqual([
      ["auto-2026-11-02.db", 6],
      ["auto-2026-11-01.db", 3],
    ]);
  });
});

describe("gantiDatabase", () => {
  function siapkan() {
    const target = path.join(folder, "wallo.db");
    fs.writeFileSync(target, "lama");
    fs.writeFileSync(target + "-wal", "sisa wal");
    fs.writeFileSync(target + "-shm", "sisa shm");
    const sumber = path.join(folder, "baru.db");
    fs.writeFileSync(sumber, "baru");
    return { target, sumber };
  }

  it("mengganti isi, membuang sisa WAL dan SHM, dan memindahkan sumbernya", () => {
    const { target, sumber } = siapkan();
    gantiDatabase(sumber, target);

    expect(fs.readFileSync(target, "utf8")).toBe("baru");
    expect(fs.existsSync(target + "-wal")).toBe(false);
    expect(fs.existsSync(target + "-shm")).toBe(false);
    expect(fs.existsSync(sumber)).toBe(false);
  });

  it("dengan salin = true, file sumbernya tetap ada", () => {
    const { target, sumber } = siapkan();
    gantiDatabase(sumber, target, true);

    expect(fs.readFileSync(target, "utf8")).toBe("baru");
    expect(fs.existsSync(sumber)).toBe(true);
  });
});

describe("siklus cadangan dan pemulihan", () => {
  it("memulihkan data persis seperti saat dicadangkan", async () => {
    const lokasi = path.join(folder, "wallo.db");
    const db = buka(lokasi);
    db.prepare("INSERT INTO accounts (name) VALUES ('Tunai')").run();

    const cadangan = path.join(folder, "backups", "cadangan.db");
    await buatBackup(db, cadangan);

    // Data berubah setelah dicadangkan
    db.prepare("INSERT INTO accounts (name) VALUES ('Bank')").run();
    db.close();

    expect(periksaBackup(cadangan, VERSI_SKEMA).ok).toBe(true);
    gantiDatabase(cadangan, lokasi, true);

    const pulih = buka(lokasi);
    expect(pulih.prepare("SELECT name FROM accounts ORDER BY id").all()).toEqual([
      { name: "Tunai" },
    ]);
  });
});