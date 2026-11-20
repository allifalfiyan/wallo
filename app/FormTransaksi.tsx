"use client";

import { useActionState, useState } from "react";
import { inputGaya, tombolUtama } from "@/lib/ui";
import { catatTransaksi } from "./actions";
import type { StateForm } from "./form-types";

type Props = {
  dompet: { id: number; name: string }[];
  kategori: { id: number; name: string; kind: string }[];
  hariIni: string;
};

export default function FormTransaksi({ dompet, kategori, hariIni }: Props) {
  const [kind, setKind] = useState<"pengeluaran" | "pemasukan">("pengeluaran");
  const [state, aksi, pending] = useActionState<StateForm, FormData>(
    catatTransaksi,
    {
      error: "",
      wally: "",
      versi: 0,
      isian: {
        jumlah: "",
        catatan: "",
        tanggal: hariIni,
        dompet: String(dompet[0]?.id ?? ""),
        kategori: "",
      },
    }
  );

  const { isian } = state;
  const pilihan = kategori.filter((k) => k.kind === kind);

  return (
    <form key={state.versi} action={aksi} className="space-y-3">
      <div className="flex rounded-lg bg-brand-50 p-1">
        {(["pengeluaran", "pemasukan"] as const).map((k) => (
          <label
            key={k}
            className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-center text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-brand-500/40 ${
              kind === k ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={k}
              checked={kind === k}
              onChange={() => setKind(k)}
              className="sr-only"
            />
            {k === "pengeluaran" ? "Pengeluaran" : "Pemasukan"}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          name="jumlah"
          inputMode="numeric"
          placeholder="Jumlah, misalnya 25.000"
          defaultValue={isian.jumlah}
          className={`${inputGaya} col-span-2 w-full min-w-0`}
        />
        <select
          key={kind}
          name="kategori"
          defaultValue={isian.kategori}
          className={`${inputGaya} col-span-2 w-full min-w-0`}
        >
          {pilihan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <select
          name="dompet"
          defaultValue={isian.dompet}
          className={`${inputGaya} w-full min-w-0`}
        >
          {dompet.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="tanggal"
          required
          defaultValue={isian.tanggal}
          className={`${inputGaya} w-full min-w-0`}
        />
      </div>

      <input
        name="catatan"
        maxLength={200}
        placeholder="Catatan (opsional)"
        defaultValue={isian.catatan}
        className={`${inputGaya} w-full`}
      />

      <button type="submit" disabled={pending} className={`${tombolUtama} w-full`}>
        {pending ? "Menyimpan..." : "Catat"}
      </button>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-keluar">
          {state.error}
        </p>
      )}
      {state.wally && (
        <p
          role="status"
          className="rounded-lg bg-gold-400/20 px-3 py-2 text-sm text-gold-700"
        >
          <strong>Wally:</strong> {state.wally}
        </p>
      )}
    </form>
  );
}