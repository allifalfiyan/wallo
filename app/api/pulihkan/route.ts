import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  buatBackup,
  gantiDatabase,
  pangkas,
  periksaBackup,
  stempelWaktu,
} from "@/lib/backup";
import { VERSI_SKEMA, folderBackup, getDb, lokasiDb, tutupDb } from "@/lib/db";

const BATAS_UKURAN = 200 * 1024 * 1024; // 200 MB

function galat(pesan: string, status: number) {
  return NextResponse.json({ error: pesan }, { status });
}

// Permintaan hanya boleh datang dari halaman Wallo sendiri. Tanpa ini, situs
// lain yang sedang terbuka di browsermu bisa diam-diam mengirim file ke
// localhost:3000 dan menimpa datamu (serangan "CSRF ke localhost").
function asalSama(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!asalSama(request)) return galat("Permintaan ditolak", 403);

  let berkas: FormDataEntryValue | null;
  try {
    berkas = (await request.formData()).get("berkas");
  } catch {
    return galat("Permintaan tidak valid", 400);
  }
  if (!(berkas instanceof File)) {
    return galat("Pilih file cadangan terlebih dahulu", 400);
  }
  if (berkas.size === 0 || berkas.size > BATAS_UKURAN) {
    return galat("Ukuran file tidak valid", 400);
  }

  // 1. Simpan sementara, lalu periksa sebelum menyentuh data yang ada
  const lokasi = lokasiDb();
  fs.mkdirSync(path.dirname(lokasi), { recursive: true });
  const sementara = path.join(path.dirname(lokasi), `pulihkan-${Date.now()}.tmp`);
  fs.writeFileSync(sementara, Buffer.from(await berkas.arrayBuffer()));

  const periksa = periksaBackup(sementara, VERSI_SKEMA);
  if (!periksa.ok) {
    fs.rmSync(sementara, { force: true });
    return galat(periksa.alasan, 400);
  }

  // 2. Jaring pengaman: salin keadaan sekarang sebelum diganti
  const pengaman = path.join(
    folderBackup(),
    `sebelum-restore-${stempelWaktu()}.db`
  );
  await buatBackup(getDb(), pengaman);

  // 3. Ganti database. Kalau gagal, kembalikan yang lama.
  try {
    tutupDb();
    gantiDatabase(sementara, lokasi);
    getDb(); // dibuka ulang: cadangan versi lama otomatis dimigrasi
  } catch {
    try {
      tutupDb();
      gantiDatabase(pengaman, lokasi, true);
      getDb();
    } catch {
      return galat(
        `Pemulihan gagal dan data lama tidak dapat dibuka otomatis. Salinan data lama ada di: ${pengaman}`,
        500
      );
    }
    return galat("Pemulihan gagal. Data sebelumnya sudah dikembalikan.", 500);
  }

  pangkas(folderBackup(), "sebelum-restore-", 5);
  revalidatePath("/");
  return NextResponse.json({ ok: true, versi: periksa.versi });
}