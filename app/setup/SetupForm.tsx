"use client";

import { useActionState } from "react";
import { inputGaya, kartu, tombolUtama } from "@/lib/ui";
import Logo from "../Logo";
import { buatDompet } from "./actions";

export default function SetupForm() {
  const [state, aksi, pending] = useActionState(buatDompet, { error: "" });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className={`${kartu} w-full max-w-md border-t-4 border-t-brand-600 p-8`}>
        <Logo />
        <h1 className="mt-4 text-xl font-bold">Selamat datang!</h1>
        <p className="mt-1 text-sm text-slate-600">
          Mulai dengan membuat dompet pertamamu. Semua datamu tersimpan di
          komputer ini.
        </p>

        <form action={aksi} className="mt-6 space-y-3">
          <input
            name="name"
            defaultValue="Tunai"
            placeholder="Nama dompet"
            className={`${inputGaya} w-full`}
          />
          <select name="type" className={`${inputGaya} w-full`}>
            <option value="tunai">Tunai</option>
            <option value="bank">Rekening bank</option>
            <option value="e-wallet">E-wallet</option>
          </select>
          <input
            name="saldo"
            inputMode="numeric"
            placeholder="Saldo awal, misalnya 500.000 (boleh kosong)"
            className={`${inputGaya} w-full`}
          />
          <button type="submit" disabled={pending} className={`${tombolUtama} w-full`}>
            {pending ? "Menyimpan..." : "Mulai"}
          </button>
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-keluar">
              {state.error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}