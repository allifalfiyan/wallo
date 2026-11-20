import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { adaDompet, saldoDompet } from "@/lib/accounts";
import { semuaKategori } from "@/lib/categories";
import { pengeluaranPerKategori, tren } from "@/lib/laporan";
import { formatRupiah } from "@/lib/money";
import {
  bulanDari,
  bulanValid,
  geserBulan,
  hariIni,
  namaBulan,
} from "@/lib/tanggal";
import { daftarTransaksi, ringkasanBulan } from "@/lib/transactions";
import { kartu } from "@/lib/ui";
import BarKategori from "./BarKategori";
import ChartTren from "./ChartTren";
import FormTransaksi from "./FormTransaksi";
import Logo from "./Logo";
import TombolHapus from "./TombolHapus";
import { hapusTrx } from "./actions";

type Props = { searchParams: Promise<{ bulan?: string }> };

const tombolBulan =
  "rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50";

async function Beranda({ searchParams }: Props) {
  await connection();
  if (!adaDompet()) redirect("/setup");

  const { bulan: param } = await searchParams;
  const sekarang = hariIni();
  const bulanIni = bulanDari(sekarang);
  const bulan = param && bulanValid(param) ? param : bulanIni;

  const dompet = saldoDompet();
  const kategori = semuaKategori();
  const ringkasan = ringkasanBulan(bulan);
  const daftar = daftarTransaksi(bulan);
  const perKategori = pengeluaranPerKategori(bulan);
  const dataTren = tren(bulan, 6);
  const totalSaldo = dompet.reduce((jumlah, d) => jumlah + d.saldo, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <Link href={`/?bulan=${geserBulan(bulan, -1)}`} className={tombolBulan}>
          ← Sebelumnya
        </Link>
        <h1 className="text-xl font-bold">{namaBulan(bulan)}</h1>
        {bulan < bulanIni ? (
          <Link href={`/?bulan=${geserBulan(bulan, 1)}`} className={tombolBulan}>
            Berikutnya →
          </Link>
        ) : (
          <span className="w-28" />
        )}
      </div>

      <section className="grid grid-cols-3 gap-3 text-center">
        <div className={kartu}>
          <p className="text-sm text-slate-600">Pemasukan</p>
          <p className="mt-1 text-lg font-bold text-masuk sm:text-xl">
            {formatRupiah(ringkasan.pemasukan)}
          </p>
        </div>
        <div className={kartu}>
          <p className="text-sm text-slate-600">Pengeluaran</p>
          <p className="mt-1 text-lg font-bold text-keluar sm:text-xl">
            {formatRupiah(ringkasan.pengeluaran)}
          </p>
        </div>
        <div className={`${kartu} bg-brand-50`}>
          <p className="text-sm text-slate-600">Selisih</p>
          <p
            className={`mt-1 text-lg font-bold sm:text-xl ${
              ringkasan.selisih < 0 ? "text-keluar" : "text-brand-700"
            }`}
          >
            {formatRupiah(ringkasan.selisih)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className={kartu}>
            <h2 className="mb-3 font-semibold">Pemasukan dan pengeluaran</h2>
            <ChartTren data={dataTren} />
          </section>

          <section className={kartu}>
            <h2 className="mb-4 font-semibold">Pengeluaran per kategori</h2>
            <BarKategori data={perKategori} />
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Transaksi</h2>
            {daftar.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-brand-200 bg-white p-8 text-center text-slate-600">
                Belum ada transaksi bulan ini.
              </p>
            ) : (
              <ul className="divide-y divide-brand-100 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
                {daftar.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {t.categoryName}
                        {t.note && (
                          <span className="font-normal text-slate-600">
                            {" "}
                            · {t.note}
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-slate-600">
                        {t.date.split("-").reverse().join("/")} · {t.accountName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span
                        className={`font-semibold ${
                          t.kind === "pemasukan" ? "text-masuk" : "text-keluar"
                        }`}
                      >
                        {t.kind === "pemasukan" ? "+" : "-"}
                        {formatRupiah(t.amount)}
                      </span>
                      <form action={hapusTrx}>
                        <input type="hidden" name="id" value={t.id} />
                        <TombolHapus />
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="order-first space-y-6 lg:sticky lg:top-6 lg:order-none lg:self-start">
          <section className={kartu}>
            <h2 className="mb-3 font-semibold">Catat transaksi</h2>
            <FormTransaksi
              dompet={dompet.map((d) => ({ id: d.id, name: d.name }))}
              kategori={kategori}
              hariIni={sekarang}
            />
          </section>

          <section className={kartu}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Dompet</h2>
              <p className="text-sm text-slate-600">
                Total{" "}
                <strong className={totalSaldo < 0 ? "text-keluar" : ""}>
                  {formatRupiah(totalSaldo)}
                </strong>
              </p>
            </div>
            <ul className="mt-3 divide-y divide-brand-100">
              {dompet.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {d.type}
                    </span>
                  </div>
                  <span className={`font-semibold ${d.saldo < 0 ? "text-keluar" : ""}`}>
                    {formatRupiah(d.saldo)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default function Home({ searchParams }: Props) {
  return (
    <>
      <header className="border-t-4 border-brand-600 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <span className="hidden text-sm text-slate-600 sm:inline">
            Datamu tersimpan di komputer ini
          </span>
        </div>
      </header>
      <Suspense fallback={<p className="p-8">Memuat...</p>}>
        <Beranda searchParams={searchParams} />
      </Suspense>
    </>
  );
}