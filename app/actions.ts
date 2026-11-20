"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { parseRupiah } from "@/lib/money";
import {
  tambahTransaksi,
  hapusTransaksi,
  GalatInput,
} from "@/lib/transactions";
import type { StateForm } from "./form-types";

function teks(formData: FormData, nama: string): string {
  return String(formData.get(nama) ?? "");
}

export async function catatTransaksi(
  prev: StateForm,
  formData: FormData
): Promise<StateForm> {
  const isian = {
    jumlah: teks(formData, "jumlah").trim(),
    catatan: teks(formData, "catatan"),
    tanggal: teks(formData, "tanggal"),
    dompet: teks(formData, "dompet"),
    kategori: teks(formData, "kategori"),
  };
  const gagal = (error: string): StateForm => ({
    error,
    versi: prev.versi + 1,
    isian,
  });

  const amount = parseRupiah(isian.jumlah);
  if (amount === null) return gagal("Jumlah tidak valid. Contoh: 25.000");
  if (amount === 0) return gagal("Jumlah harus lebih dari 0");

  try {
    tambahTransaksi({
      accountId: Number(isian.dompet),
      categoryId: Number(isian.kategori),
      kind: formData.get("kind"),
      amount,
      date: isian.tanggal,
      note: isian.catatan,
    });
  } catch (e) {
    if (e instanceof GalatInput) return gagal(e.message);
    if (e instanceof ZodError) {
      return gagal(
        e.issues[0]?.path[0] === "date"
          ? "Tanggal tidak valid"
          : "Data tidak valid. Periksa kembali isian."
      );
    }
    throw e;
  }

  revalidatePath("/");
  // Berhasil: kosongkan jumlah dan catatan, pertahankan dompet dan tanggal
  return {
    error: "",
    versi: prev.versi + 1,
    isian: { ...isian, jumlah: "", catatan: "" },
  };
}

export async function hapusTrx(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) hapusTransaksi(id);
  revalidatePath("/");
}