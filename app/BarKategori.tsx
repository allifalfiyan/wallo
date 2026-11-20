import type { PerKategori } from "@/lib/laporan";
import { formatRupiah } from "@/lib/money";

export default function BarKategori({ data }: { data: PerKategori[] }) {
  const total = data.reduce((jumlah, d) => jumlah + d.total, 0);
  if (total === 0) {
    return (
      <p className="py-6 text-center text-slate-600">
        Belum ada pengeluaran bulan ini.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {data.map((d) => {
        const persen = (d.total / total) * 100;
        return (
          <li key={d.categoryId}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{d.name}</span>
              <span className="text-slate-600">
                {formatRupiah(d.total)} ·{" "}
                {persen < 1 ? "<1%" : `${Math.round(persen)}%`}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-50"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${persen}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}