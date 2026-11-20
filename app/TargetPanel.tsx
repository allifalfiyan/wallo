import { pesanTarget, type Setoran, type Target } from "@/lib/goals";
import { formatRupiah } from "@/lib/money";
import FormSetor from "./FormSetor";
import FormTarget from "./FormTarget";
import TombolHapus from "./TombolHapus";
import { hapusSetoranAksi, hapusTargetAksi } from "./target-actions";

// Setiap status punya label teks, jadi tidak bergantung pada warna saja
const GAYA = {
  tercapai: { bar: "bg-masuk", label: "Tercapai", badge: "bg-emerald-50 text-masuk" },
  "di jalur": { bar: "bg-brand-500", label: "Di jalur", badge: "bg-brand-50 text-brand-700" },
  tertinggal: {
    bar: "bg-gold-500",
    label: "Tertinggal",
    badge: "bg-gold-400/25 text-gold-700",
  },
  "lewat tenggat": {
    bar: "bg-keluar",
    label: "Lewat tenggat",
    badge: "bg-red-50 text-keluar",
  },
} as const;

const tanggalIndo = (t: string) => t.split("-").reverse().join("/");

type Props = {
  data: { target: Target; setoran: Setoran[] }[];
  hariIni: string;
};

export default function TargetPanel({ data, hariIni }: Props) {
  return (
    <div className="space-y-5">
      {data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-200 p-4 text-center text-sm text-slate-600">
          Belum ada target. Buat target pertamamu di bawah ini.
        </p>
      ) : (
        <ul className="space-y-4">
          {data.map(({ target: t, setoran }) => {
            const g = GAYA[t.status];
            const lebar = Math.min(t.persen, 100);
            return (
              <li key={t.id} className="rounded-xl border border-brand-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${g.badge}`}
                    >
                      {g.label}
                    </span>
                  </div>
                  <form action={hapusTargetAksi}>
                    <input type="hidden" name="id" value={t.id} />
                    <TombolHapus
                      pesan={`Hapus target ${t.name} beserta semua setorannya?`}
                    />
                  </form>
                </div>

                <div
                  role="progressbar"
                  aria-label={`Kemajuan target ${t.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={lebar}
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-50"
                >
                  <div className={`h-full rounded-full ${g.bar}`} style={{ width: `${lebar}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-slate-600">
                  {formatRupiah(t.terkumpul)} dari {formatRupiah(t.target)} · {t.persen}% ·
                  tenggat {tanggalIndo(t.deadline)}
                </p>

                <p className="mt-2 rounded-lg bg-gold-400/20 px-3 py-2 text-sm text-gold-700">
                  <strong>Wally:</strong> {pesanTarget(t)}
                </p>

                <FormSetor goalId={t.id} hariIni={hariIni} />

                {setoran.length > 0 && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-medium text-brand-700">
                      Riwayat setoran ({setoran.length})
                    </summary>
                    <ul className="mt-2 divide-y divide-brand-100">
                      {setoran.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                          <span className="text-slate-600">{tanggalIndo(s.date)}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-masuk">
                              +{formatRupiah(s.amount)}
                            </span>
                            <form action={hapusSetoranAksi}>
                              <input type="hidden" name="id" value={s.id} />
                              <TombolHapus pesan="Hapus setoran ini?" />
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Buat target baru</h3>
        <FormTarget />
      </div>
    </div>
  );
}