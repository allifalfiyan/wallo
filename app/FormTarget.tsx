"use client";

import { useActionState } from "react";
import { inputGaya, tombolUtama } from "@/lib/ui";
import type { StateTarget } from "./form-types";
import { simpanTarget } from "./target-actions";

export default function FormTarget() {
  const [state, aksi, pending] = useActionState<StateTarget, FormData>(
    simpanTarget,
    { error: "", versi: 0, nama: "", jumlah: "", tenggat: "" }
  );

  return (
    <form key={state.versi} action={aksi} className="space-y-2">
      <input
        name="nama"
        maxLength={60}
        placeholder="Nama target, misalnya Liburan"
        defaultValue={state.nama}
        className={`${inputGaya} w-full`}
      />
      <div className="flex flex-wrap gap-2">
        <input
          name="jumlah"
          inputMode="numeric"
          placeholder="Jumlah target, misalnya 6.000.000"
          defaultValue={state.jumlah}
          className={`${inputGaya} min-w-0 flex-1`}
        />
        <input
          type="date"
          name="tenggat"
          required
          defaultValue={state.tenggat}
          aria-label="Tenggat"
          className={`${inputGaya} min-w-0`}
        />
        <button type="submit" disabled={pending} className={tombolUtama}>
          {pending ? "Menyimpan..." : "Buat target"}
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