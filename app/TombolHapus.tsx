"use client";

export default function TombolHapus() {
  return (
    <button
      type="submit"
      className="text-sm font-medium text-keluar hover:underline"
      suppressHydrationWarning
      onClick={(e) => {
        if (!confirm("Hapus transaksi ini?")) e.preventDefault();
      }}
    >
      Hapus
    </button>
  );
}