"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import {
  buatTarget,
  hapusSetoran,
  hapusTarget,
  tambahSetoran,
} from "@/lib/goals";
import { parseRupiah } from "@/lib/money";
import { hariIni } from "@/lib/tanggal";
import { GalatInput } from "@/lib/transactions";
import type { StateSetoran, StateTarget } from "./form-types";

function teks(formData: FormData, nama: string): string {
  return String(formData.get(nama) ?? "");
}

export async function simpanTarget(
  prev: StateTarget,
  formData: FormData
): Promise<StateTarget> {
  const nama = teks(formData, "nama");
  const jumlah = teks(formData, "jumlah").trim();
  const tenggat = teks(formData, "tenggat");
  const gagal = (error: string): StateTarget => ({
    error,
    versi: prev.versi + 1,
    nama,
    jumlah,
    tenggat,
  });

  const target = parseRupiah(jumlah);
  if (target === null) return gagal("Jumlah target tidak valid. Contoh: 6.000.000");
  if (target === 0) return gagal("Jumlah target harus lebih dari 0");

  try {
    buatTarget({ name: nama, target, deadline: tenggat }, hariIni());
  } catch (e) {
    if (e instanceof GalatInput) return gagal(e.message);
    if (e instanceof ZodError) {
      return gagal(e.issues[0]?.message ?? "Data tidak valid");
    }
    throw e;
  }

  revalidatePath("/");
  return { error: "", versi: prev.versi + 1, nama: "", jumlah: "", tenggat: "" };
}

export async function setorKeTarget(
  prev: StateSetoran,
  formData: FormData
): Promise<StateSetoran> {
  const jumlah = teks(formData, "jumlah").trim();
  const tanggal = teks(formData, "tanggal");
  const gagal = (error: string): StateSetoran => ({
    error,
    versi: prev.versi + 1,
    jumlah,
    tanggal,
  });

  const amount = parseRupiah(jumlah);
  if (amount === null) return gagal("Jumlah tidak valid. Contoh: 500.000");
  if (amount === 0) return gagal("Jumlah harus lebih dari 0");

  try {
    tambahSetoran({
      goalId: Number(formData.get("goalId")),
      amount,
      date: tanggal,
    });
  } catch (e) {
    if (e instanceof GalatInput) return gagal(e.message);
    if (e instanceof ZodError) {
      return gagal(e.issues[0]?.message ?? "Data tidak valid");
    }
    throw e;
  }

  revalidatePath("/");
  return { error: "", versi: prev.versi + 1, jumlah: "", tanggal };
}

export async function hapusSetoranAksi(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) hapusSetoran(id);
  revalidatePath("/");
}

export async function hapusTargetAksi(formData: FormData) {
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) hapusTarget(id);
  revalidatePath("/");
}