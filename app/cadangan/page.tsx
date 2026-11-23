import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { daftarBackup } from "@/lib/backup";
import { folderBackup } from "@/lib/db";
import { kartu, tautan, tombolUtama } from "@/lib/ui";
import Logo from "../Logo";
import FormPulihkan from "./FormPulihkan";

function ukuranTeks(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} KB`;
  return `${(byte / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

async function DaftarCadangan() {
  await connection(); // membaca isi folder saat ini, bukan saat build
  const daftar = daftarBackup(folderBackup());

  if (daftar.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Belum ada cadangan otomatis. Cadangan pertama dibuat saat Wallo dibuka.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-brand-100 text-sm">
      {daftar.map((b) => (
        <li key={b.nama} className="flex items-center justify-between gap-3 py-2">
          <div>
            <p className="font-medium">{b.nama}</p>
            <p className="text-slate-600">
              {b.nama.startsWith("auto-") ? "Otomatis harian" : "Sebelum pemulihan"}
            </p>
          </div>
          <span className="text-slate-600">{ukuranTeks(b.ukuran)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function HalamanCadangan() {
  return (
    <>
      <header className="border-t-4 border-brand-600 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Logo />
          <Link href="/" className={tautan}>
            ← Kembali
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Cadangan data</h1>

        <section className={kartu}>
          <h2 className="font-semibold">Unduh cadangan</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">
            Simpan filenya di tempat yang berbeda dari komputer ini, misalnya
            flashdisk atau penyimpanan awan. Cadangan di komputer yang sama tidak
            menolong kalau disknya rusak atau hilang.
          </p>
          <a href="/api/backup" download className={`${tombolUtama} inline-block`}>
            Unduh cadangan sekarang
          </a>
        </section>

        <section className={kartu}>
          <h2 className="font-semibold">Pulihkan dari cadangan</h2>
          <p className="mt-1 mb-4 rounded-lg bg-gold-400/20 px-3 py-2 text-sm text-gold-700">
            <strong>Perhatian:</strong> semua data saat ini akan diganti dengan
            isi file cadangan. Salinan data saat ini disimpan otomatis dulu, jadi
            pemulihan bisa dibatalkan dengan memulihkan salinan itu.
          </p>
          <FormPulihkan />
        </section>

        <section className={kartu}>
          <h2 className="font-semibold">Cadangan di komputer ini</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">
            Wallo menyimpan satu cadangan per hari (7 hari terakhir) dan satu
            salinan sebelum setiap pemulihan (5 terakhir), di folder{" "}
            <code>data/backups</code>. Untuk memulihkan salah satunya, pilih
            filenya lewat form di atas.
          </p>
          <Suspense fallback={<p className="text-sm text-slate-600">Memuat...</p>}>
            <DaftarCadangan />
          </Suspense>
        </section>
      </main>
    </>
  );
}