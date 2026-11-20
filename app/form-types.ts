export type Isian = {
  jumlah: string;
  catatan: string;
  tanggal: string;
  dompet: string;
  kategori: string;
};

export type StateForm = {
  error: string;
  wally: string;
  versi: number;
  isian: Isian;
};

export type StateBudget = {
  error: string;
  versi: number;
  kategori: string;
  jumlah: string;
};

export type StateTarget = {
  error: string;
  versi: number;
  nama: string;
  jumlah: string;
  tenggat: string;
};

export type StateSetoran = {
  error: string;
  versi: number;
  jumlah: string;
  tanggal: string;
};