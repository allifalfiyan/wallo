"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Pesan = { jenis: "ok" | "galat"; teks: string } | null;

export default function FormPulihkan() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);

  async function pulihkan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const berkas = input.current?.files?.[0];
    if (!berkas) {
      setPesan({ jenis: "galat", teks: "Pilih file cadangan terlebih dahulu." });
      return;
    }
    if (
      !confirm(
        "Pulihkan dari cadangan ini?\n\nSemua data saat ini akan DIGANTI. Salinan data saat ini disimpan otomatis terlebih dahulu."
      )
    ) {
      return;
    }

    setPending(true);
    setPesan(null);
    try {
      const data = new FormData();
      data.append("berkas", berkas);
      const res = await fetch("/api/pulihkan", { method: "POST", body: data });
      const hasil = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPesan({ jenis: "galat", teks: hasil.error ?? "Pemulihan gagal." });
        return;
      }
      setPesan({ jenis: "ok", teks: "Data berhasil dipulihkan." });
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setPesan({ jenis: "galat", teks: "Tidak dapat terhubung ke Wallo." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={pulihkan} className="space-y-3">
      <input
        ref={input}
        type="file"
        accept=".db,.sqlite,.sqlite3,application/vnd.sqlite3"
        aria-label="File cadangan"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-red-300 px-4 py-2 font-semibold text-keluar transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Memulihkan..." : "Pulihkan dari file ini"}
      </button>
      {pesan && (
        <p
          role={pesan.jenis === "galat" ? "alert" : "status"}
          className={`rounded-lg px-3 py-2 text-sm ${
            pesan.jenis === "galat"
              ? "bg-red-50 text-keluar"
              : "bg-emerald-50 text-masuk"
          }`}
        >
          {pesan.teks}
        </p>
      )}
    </form>
  );
}