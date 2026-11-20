"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TitikTren } from "@/lib/laporan";
import { formatRupiah, ringkasRupiah } from "@/lib/money";
import { namaBulanSingkat } from "@/lib/tanggal";
import { WARNA } from "@/lib/warna";

export default function ChartTren({ data }: { data: TitikTren[] }) {
  const kosong = data.every((d) => d.pemasukan === 0 && d.pengeluaran === 0);
  if (kosong) {
    return (
      <p className="py-10 text-center text-slate-600">
        Belum ada transaksi dalam 6 bulan ini.
      </p>
    );
  }

  const titik = data.map((d) => ({ ...d, label: namaBulanSingkat(d.bulan) }));
  const tickGaya = { fill: WARNA.teks, fontSize: 12 };

  return (
    <div
      role="img"
      aria-label="Grafik batang pemasukan dan pengeluaran per bulan"
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={titik} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={WARNA.garis} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tickGaya} />
          <YAxis
            width={56}
            tickLine={false}
            axisLine={false}
            tick={tickGaya}
            tickFormatter={(v) => ringkasRupiah(Number(v))}
          />
          <Tooltip
            cursor={{ fill: WARNA.latarHover }}
            formatter={(v) => formatRupiah(Number(v))}
          />
          <Legend />
          <Bar dataKey="pemasukan" name="Pemasukan" fill={WARNA.masuk} radius={[4, 4, 0, 0]} />
          <Bar dataKey="pengeluaran" name="Pengeluaran" fill={WARNA.keluar} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}