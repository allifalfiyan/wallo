import { z } from "zod";
import { BATAS_RUPIAH } from "./money";

// "2026-02-30" lolos bentuknya tapi bukan tanggal nyata, jadi dicek ulang
function tanggalValid(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export const transaksiSchema = z.object({
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive(),
  kind: z.enum(["pemasukan", "pengeluaran"]),
  amount: z.number().int().positive().max(BATAS_RUPIAH),
  date: z.string().refine(tanggalValid, "Tanggal tidak valid"),
  note: z.string().trim().max(200).default(""),
});

export type TransaksiInput = z.infer<typeof transaksiSchema>;

export const JENIS_DOMPET = ["tunai", "bank", "e-wallet"] as const;

export const dompetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama dompet wajib diisi")
    .max(50, "Nama dompet maksimal 50 karakter"),
  type: z.enum(JENIS_DOMPET),
  openingBalance: z
    .number()
    .int()
    .min(0, "Saldo awal tidak boleh negatif")
    .max(BATAS_RUPIAH),
});

export type DompetInput = z.infer<typeof dompetSchema>;