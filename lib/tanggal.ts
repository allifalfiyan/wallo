const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function dua(n: number): string {
  return String(n).padStart(2, "0");
}

// Tanggal menurut jam komputer pengguna, bukan UTC.
// toISOString() memakai UTC, jadi di WIB antara pukul 00.00 dan 07.00
// hasilnya masih "kemarin". Untuk pencatat keuangan itu bug yang nyata.
export function hariIni(sekarang: Date = new Date()): string {
  return `${sekarang.getFullYear()}-${dua(sekarang.getMonth() + 1)}-${dua(sekarang.getDate())}`;
}

export function bulanValid(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

export function bulanDari(tanggal: string): string {
  return tanggal.slice(0, 7);
}

export function geserBulan(bulan: string, selisih: number): string {
  const [tahun, bln] = bulan.split("-").map(Number);
  const total = tahun * 12 + (bln - 1) + selisih;
  return `${Math.floor(total / 12)}-${dua((total % 12) + 1)}`;
}

export function namaBulan(bulan: string): string {
  return `${NAMA_BULAN[Number(bulan.slice(5, 7)) - 1]} ${bulan.slice(0, 4)}`;
}

const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function namaBulanSingkat(bulan: string): string {
  return BULAN_SINGKAT[Number(bulan.slice(5, 7)) - 1];
}

// Selisih bulan kalender. selisihBulan("2026-11", "2027-03") = 4
export function selisihBulan(dari: string, ke: string): number {
  const [t1, b1] = dari.split("-").map(Number);
  const [t2, b2] = ke.split("-").map(Number);
  return (t2 - t1) * 12 + (b2 - b1);
}