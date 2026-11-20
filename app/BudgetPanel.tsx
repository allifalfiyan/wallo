import type { Budget } from "@/lib/budgets";
import { formatRupiah } from "@/lib/money";
import FormBudget from "./FormBudget";
import TombolHapus from "./TombolHapus";
import { hapusBudgetAksi } from "./budget-actions";

// Status selalu punya label teks, jadi tidak bergantung pada warna saja
const GAYA = {
  aman: { bar: "bg-brand-500", label: "Aman", badge: "bg-brand-50 text-brand-700" },
  hampir: {
    bar: "bg-gold-500",
    label: "Hampir habis",
    badge: "bg-gold-400/25 text-gold-700",
  },
  lewat: { bar: "bg-keluar", label: "Melebihi budget", badge: "bg-red-50 text-keluar" },
} as const;

type Props = {
  data: Budget[];
  kategori: { id: number; name: string }[];
};

export default function BudgetPanel({ data, kategori }: Props) {
  return (
    <div className="space-y-5">
      {data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-200 p-4 text-center text-sm text-slate-600">
          Belum ada budget. Atur batas pengeluaran pertamamu di bawah ini.
        </p>
      ) : (
        <ul className="space-y-4">
          {data.map((b) => {
            const g = GAYA[b.status];
            const lebar = Math.min(b.persen, 100);
            return (
              <li key={b.categoryId}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{b.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${g.badge}`}
                    >
                      {g.label}
                    </span>
                  </div>
                  <form action={hapusBudgetAksi}>
                    <input type="hidden" name="kategori" value={b.categoryId} />
                    <TombolHapus pesan={`Hapus budget ${b.name}?`} />
                  </form>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Pemakaian budget ${b.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={lebar}
                  className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-50"
                >
                  <div
                    className={`h-full rounded-full ${g.bar}`}
                    style={{ width: `${lebar}%` }}
                  />
                </div>
                <p className="mt-1.5 text-sm text-slate-600">
                  {formatRupiah(b.terpakai)} dari {formatRupiah(b.batas)} ·{" "}
                  {b.sisa >= 0
                    ? `sisa ${formatRupiah(b.sisa)}`
                    : `melebihi ${formatRupiah(-b.sisa)}`}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Atur budget</h3>
        <FormBudget kategori={kategori} />
        <p className="mt-2 text-xs text-slate-600">
          Kategori yang sudah punya budget akan diperbarui.
        </p>
      </div>
    </div>
  );
}