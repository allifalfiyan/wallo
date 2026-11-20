"use client";

import { useActionState } from "react";
import { inputGaya, tombolUtama } from "@/lib/ui";
import type { StateSetoran } from "./form-types";
import { setorKeTarget } from "./target-actions";

export default function FormSetor({
  goalId,
  hariIni,
}: {
  goalId: number;
  hariIni: string;
}) {
  const [state, aksi, pending] = useActionState<StateSetoran, FormData>(
    setorKeTarget,
    { error: "", versi: 0, jumlah: "", tanggal: hariIni }
  );

  return (
    <form key={state.versi} action={aksi} className="mt-3 space-y-2">
      <input type="hidden" name="goalId" value={goalId} />
      <div className="flex flex-wrap gap-2">
        <input
          name="jumlah"
          inputMode="numeric"
          placeholder="Setor, misalnya 500.000"
          defaultValue={state.jumlah}
          aria-label="Jumlah setoran"
          className={`${inputGaya} min-w-0 flex-1`}
        />
        <input
          type="date"
          name="tanggal"
          required
          defaultValue={state.tanggal}
          aria-label="Tanggal setoran"
          className={`${inputGaya} min-w-0`}
        />
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? "..." : "Setor"}
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