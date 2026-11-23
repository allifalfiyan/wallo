import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connection } from "next/server";
import { buatBackup, stempelWaktu } from "@/lib/backup";
import { getDb } from "@/lib/db";
import { hariIni } from "@/lib/tanggal";

export async function GET() {
  // Handler ini membaca database. Tanpa baris ini, Next.js bisa menjalankannya
  // saat build dan menyimpan hasilnya sebagai file statis, sehingga yang
  // terunduh nanti cadangan lama, bukan data terbaru.
  await connection();

  const sementara = path.join(
    os.tmpdir(),
    `wallo-unduh-${stempelWaktu()}-${process.pid}-${Date.now()}.db`
  );
  try {
    await buatBackup(getDb(), sementara);
    const isi = await fs.promises.readFile(sementara);
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="wallo-backup-${hariIni()}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    for (const akhiran of ["", "-wal", "-shm"]) {
      await fs.promises.rm(sementara + akhiran, { force: true });
    }
  }
}