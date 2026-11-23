import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const MAGIC = "SQLite format 3\0";

function dua(n: number): string {
  return String(n).padStart(2, "0");
}

// 2026-11-20 14:05:09 -> "20261120-140509" (jam lokal, urut sebagai teks)
export function stempelWaktu(d: Date = new Date()): string {
  return `${d.getFullYear()}${dua(d.getMonth() + 1)}${dua(d.getDate())}-${dua(d.getHours())}${dua(d.getMinutes())}${dua(d.getSeconds())}`;
}

// Memakai API backup resmi SQLite: hasilnya salinan utuh dan konsisten
// walau database sedang dipakai (isi file WAL ikut tercakup).
export async function buatBackup(
  db: Database.Database,
  tujuan: string
): Promise<void> {
  fs.mkdirSync(path.dirname(tujuan), { recursive: true });
  await db.backup(tujuan);
}

export type HasilPeriksa =
  | { ok: true; versi: number }
  | { ok: false; alasan: string };

export function periksaBackup(file: string, versiTerbaru: number): HasilPeriksa {
  const kepala = Buffer.alloc(16);
  try {
    const fd = fs.openSync(file, "r");
    try {
      fs.readSync(fd, kepala, 0, 16, 0);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return { ok: false, alasan: "File tidak bisa dibaca" };
  }

  if (kepala.toString("latin1") !== MAGIC) {
    return {
      ok: false,
      alasan: "Ini bukan file cadangan Wallo (bukan database SQLite)",
    };
  }

  let db: Database.Database | undefined;
  try {
    db = new Database(file, { fileMustExist: true });

    if (db.pragma("integrity_check", { simple: true }) !== "ok") {
      return { ok: false, alasan: "File cadangan rusak" };
    }

    const versi = db.pragma("user_version", { simple: true }) as number;
    if (versi < 1) {
      return { ok: false, alasan: "Ini bukan file cadangan Wallo" };
    }
    if (versi > versiTerbaru) {
      return {
        ok: false,
        alasan:
          "Cadangan ini dibuat oleh Wallo versi yang lebih baru. Perbarui Wallo dulu.",
      };
    }

    const ada = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('accounts', 'categories')"
      )
      .all();
    if (ada.length < 2) {
      return { ok: false, alasan: "Ini bukan file cadangan Wallo" };
    }

    return { ok: true, versi };
  } catch {
    return { ok: false, alasan: "File cadangan tidak dapat dibuka" };
  } finally {
    db?.close();
  }
}

// Menyimpan `simpan` file terbaru berawalan `awalan`, menghapus sisanya.
// Nama berformat tanggal, jadi urutan nama = urutan waktu.
export function pangkas(folder: string, awalan: string, simpan: number): void {
  if (!fs.existsSync(folder)) return;
  const berkas = fs
    .readdirSync(folder)
    .filter((n) => n.startsWith(awalan) && n.endsWith(".db"))
    .sort()
    .reverse();
  for (const nama of berkas.slice(simpan)) {
    fs.rmSync(path.join(folder, nama), { force: true });
  }
}

// Satu cadangan otomatis per hari. Mengembalikan true kalau membuat yang baru.
export async function cadanganHarian(
  db: Database.Database,
  folder: string,
  hariIni: string,
  simpan = 7
): Promise<boolean> {
  const tujuan = path.join(folder, `auto-${hariIni}.db`);
  if (fs.existsSync(tujuan)) return false;

  // Tulis ke nama sementara lalu pindahkan, supaya cadangan setengah jadi
  // tidak pernah dianggap cadangan hari ini
  await buatBackup(db, `${tujuan}.tmp`);
  fs.renameSync(`${tujuan}.tmp`, tujuan);

  pangkas(folder, "auto-", simpan);
  return true;
}

export type BerkasBackup = { nama: string; ukuran: number };

// Terbaru dulu (berdasarkan waktu ubah file)
export function daftarBackup(folder: string): BerkasBackup[] {
  if (!fs.existsSync(folder)) return [];
  return fs
    .readdirSync(folder)
    .filter((n) => n.endsWith(".db"))
    .map((nama) => {
      const s = fs.statSync(path.join(folder, nama));
      return { nama, ukuran: s.size, diubah: s.mtimeMs };
    })
    .sort((a, b) => b.diubah - a.diubah)
    .map(({ nama, ukuran }) => ({ nama, ukuran }));
}

// Penutup koneksi database harus dilakukan pemanggil SEBELUM fungsi ini.
// Sisa file WAL dan SHM dari database lama dibuang, karena kalau dibiarkan
// bisa tercampur dengan file hasil pemulihan.
export function gantiDatabase(
  sumber: string,
  target: string,
  salin = false
): void {
  for (const akhiran of ["-wal", "-shm"]) {
    fs.rmSync(target + akhiran, { force: true });
  }
  fs.rmSync(target, { force: true });
  if (salin) fs.copyFileSync(sumber, target);
  else fs.renameSync(sumber, target);
}