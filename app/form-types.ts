export type Isian = {
  jumlah: string;
  catatan: string;
  tanggal: string;
  dompet: string;
  kategori: string;
};

export type StateForm = {
  error: string;
  wally: string; // pesan peringatan budget, kosong kalau tidak ada
  versi: number;
  isian: Isian;
};

export type StateBudget = {
  error: string;
  versi: number;
  kategori: string;
  jumlah: string;
};