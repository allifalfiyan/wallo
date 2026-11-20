export const BATAS_RUPIAH = 1_000_000_000_000; // Rp 1 triliun

// 1500000 -> "Rp 1.500.000", -25000 -> "-Rp 25.000"
export function formatRupiah(n: number): string {
  const tanda = n < 0 ? "-" : "";
  const angka = Math.abs(Math.trunc(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${tanda}Rp ${angka}`;
}

// Membaca ketikan pengguna. Titik = pemisah ribuan (format Indonesia).
// Mengembalikan null kalau tidak valid, supaya tidak pernah menebak.
export function parseRupiah(input: string): number | null {
  const bersih = input.replace(/^\s*rp\.?\s*/i, "").trim();
  if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(bersih)) return null;

  const n = Number(bersih.replace(/\./g, ""));
  return Number.isSafeInteger(n) && n <= BATAS_RUPIAH ? n : null;
}

// 1500000 -> "1,5 jt", 250000 -> "250 rb", 2000000000 -> "2 M"
export function ringkasRupiah(n: number): string {
  const tanda = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const satuan: [number, string][] = [
    [1e9, "M"],
    [1e6, "jt"],
    [1e3, "rb"],
  ];
  for (const [batas, nama] of satuan) {
    if (abs >= batas) {
      const nilai = Math.round((abs / batas) * 10) / 10;
      return `${tanda}${String(nilai).replace(".", ",")} ${nama}`;
    }
  }
  return `${tanda}${abs}`;
}