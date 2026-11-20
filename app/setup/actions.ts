"use server";

import { redirect } from "next/navigation";
import { parseRupiah } from "@/lib/money";
import { dompetSchema } from "@/lib/schemas";
import { tambahDompet } from "@/lib/accounts";

export async function buatDompet(
  _sebelumnya: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const saldoTeks = String(formData.get("saldo") ?? "").trim();
  const saldo = saldoTeks === "" ? 0 : parseRupiah(saldoTeks);
  if (saldo === null) {
    return { error: "Saldo awal tidak valid. Contoh: 500.000" };
  }

  const hasil = dompetSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    openingBalance: saldo,
  });
  if (!hasil.success) {
    return { error: hasil.error.issues[0].message };
  }

  tambahDompet(hasil.data);
  redirect("/");
}