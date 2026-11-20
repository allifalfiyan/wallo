export type Isian = {
  jumlah: string;
  catatan: string;
  tanggal: string;
  dompet: string;
  kategori: string;
};

export type StateForm = {
  error: string;
  versi: number;
  isian: Isian;
};