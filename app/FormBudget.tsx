"use client";

import { useActionState } from "react";
import { inputGaya, tombolUtama } from "@/lib/ui";
import { simpanBudget } from "./budget-actions";
import type { StateBudget } from "./form-types";

export default function FormBudget({
  kategori,
}: {
  kategori: { id: number; name: string }[];
}) {
  const [state, aksi, pending] = useActionState<StateBudget, FormData>(
    simpanBudget,
    { error: "", versi: 0, kategori: "", jumlah: "" }
  );

  return (
    <form key={state.versi} action={aksi} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <select
          name="kategori"
          defaultValue={state.kategori}
          className={`${inputGaya} min-w-0 flex-1`}
        >
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <input
          name="jumlah"
          inputMode="numeric"
          placeholder="Batas per bulan, misalnya 1.500.000"
          defaultValue={state.jumlah}
          className={`${inputGaya} min-w-0 flex-1`}
        />
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-keluar">
          {state.error}
        </p>
      )}
    </form>
  );
}