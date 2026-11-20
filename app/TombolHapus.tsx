"use client";

export default function TombolHapus({
  pesan = "Hapus transaksi ini?",
}: {
  pesan?: string;
}) {
  return (
    <button
      type="submit"
      className="text-sm font-medium text-keluar hover:underline"
      onClick={(e) => {
        if (!confirm(pesan)) e.preventDefault();
      }}
    >
      Hapus
    </button>
  );
}