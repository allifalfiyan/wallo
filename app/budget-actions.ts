"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { aturBudget, hapusBudget } from "@/lib/budgets";
import { parseRupiah } from "@/lib/money";
import { GalatInput } from "@/lib/transactions";
import type { StateBudget } from "./form-types";

export async function simpanBudget(
  prev: StateBudget,
  formData: FormData
): Promise<StateBudget> {
  const kategori = String(formData.get("kategori") ?? "");
  const jumlah = String(formData.get("jumlah") ?? "").trim();
  const gagal = (error: string): StateBudget => ({
    error,
    versi: prev.versi + 1,
    kategori,
    jumlah,
  });

  const amount = parseRupiah(jumlah);
  if (amount === null) return gagal("Batas tidak valid. Contoh: 1.500.000");
  if (amount === 0) return gagal("Batas harus lebih dari 0");

  try {
    aturBudget({ categoryId: Number(kategori), amount });
  } catch (e) {
    if (e instanceof GalatInput) return gagal(e.message);
    if (e instanceof ZodError) {
      return gagal("Data tidak valid. Periksa kembali isian.");
    }
    throw e;
  }

  revalidatePath("/");
  return { error: "", versi: prev.versi + 1, kategori: "", jumlah: "" };
}

export async function hapusBudgetAksi(formData: FormData) {
  const id = Number(formData.get("kategori"));
  if (Number.isInteger(id) && id > 0) hapusBudget(id);
  revalidatePath("/");
}