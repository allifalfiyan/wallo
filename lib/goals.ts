import type Database from "better-sqlite3";
import { getDb } from "./db";
import { setoranSchema, targetSchema } from "./schemas";
import { bulanDari, selisihBulan } from "./tanggal";
import { GalatInput } from "./transactions";
import { formatRupiah } from "./money";

export type StatusTarget =
  | "tercapai"
  | "di jalur"
  | "tertinggal"
  | "lewat tenggat";

export type Target = {
  id: number;
  name: string;
  target: number;
  startDate: string;
  deadline: string;
  terkumpul: number;
  sisa: number;
  persen: number;
  bulanTersisa: number;
  perBulan: number;
  status: StatusTarget;
};

export type Setoran = { id: number; amount: number; date: string; note: string };

// Bulan kalender dari bulan ini sampai bulan tenggat, inklusif.
// Tenggat di bulan ini = 1. Tenggat di bulan yang sudah lewat = 0.
export function bulanTersisa(hariIni: string, tenggat: string): number {
  const n = selisihBulan(bulanDari(hariIni), bulanDari(tenggat)) + 1;
  return Math.max(n, 0);
}

// Pembulatan ke atas dengan bilangan bulat: ceil(sisa / bulan)
export function setoranPerBulan(sisa: number, bulan: number): number {
  if (sisa <= 0 || bulan <= 0) return 0;
  return Math.floor((sisa + bulan - 1) / bulan);
}

export function hitungTarget(i: {
  target: number;
  terkumpul: number;
  startDate: string;
  deadline: string;
  hariIni: string;
}) {
  const sisa = Math.max(i.target - i.terkumpul, 0);
  const persen = Math.floor((i.terkumpul * 100) / i.target);
  const lewat = i.hariIni > i.deadline;
  const tersisa = lewat ? 0 : bulanTersisa(i.hariIni, i.deadline);

  const total =
    selisihBulan(bulanDari(i.startDate), bulanDari(i.deadline)) + 1;
  const berjalan = Math.min(
    Math.max(selisihBulan(bulanDari(i.startDate), bulanDari(i.hariIni)) + 1, 1),
    total
  );

  let status: StatusTarget;
  if (i.terkumpul >= i.target) status = "tercapai";
  else if (lewat) status = "lewat tenggat";
  else if (i.terkumpul * total >= i.target * (berjalan - 1)) status = "di jalur";
  else status = "tertinggal";

  return {
    sisa,
    persen,
    bulanTersisa: tersisa,
    perBulan:
      status === "tercapai" || lewat ? 0 : setoranPerBulan(sisa, tersisa),
    status,
  };
}

export function buatTarget(
  input: unknown,
  hariIni: string,
  db: Database.Database = getDb()
): { id: number } {
  const data = targetSchema.parse(input);
  if (data.deadline < hariIni) {
    throw new GalatInput("Tenggat tidak boleh sebelum hari ini");
  }

  const hasil = db
    .prepare(
      "INSERT INTO goals (name, target, start_date, deadline) VALUES (?, ?, ?, ?)"
    )
    .run(data.name, data.target, hariIni, data.deadline);
  return { id: Number(hasil.lastInsertRowid) };
}

export function tambahSetoran(
  input: unknown,
  db: Database.Database = getDb()
): { id: number } {
  const data = setoranSchema.parse(input);

  const target = db.prepare("SELECT id FROM goals WHERE id = ?").get(data.goalId);
  if (!target) throw new GalatInput("Target tidak ditemukan");

  const hasil = db
    .prepare(
      "INSERT INTO goal_deposits (goal_id, amount, date, note) VALUES (?, ?, ?, ?)"
    )
    .run(data.goalId, data.amount, data.date, data.note);
  return { id: Number(hasil.lastInsertRowid) };
}

export function hapusSetoran(
  id: number,
  db: Database.Database = getDb()
): boolean {
  return db.prepare("DELETE FROM goal_deposits WHERE id = ?").run(id).changes > 0;
}

export function hapusTarget(
  id: number,
  db: Database.Database = getDb()
): boolean {
  return db.prepare("DELETE FROM goals WHERE id = ?").run(id).changes > 0;
}

export function daftarSetoran(
  goalId: number,
  db: Database.Database = getDb()
): Setoran[] {
  return db
    .prepare(
      `SELECT id, amount, date, note FROM goal_deposits
       WHERE goal_id = ? ORDER BY date DESC, id DESC`
    )
    .all(goalId) as Setoran[];
}

// Tenggat terdekat dulu
export function daftarTarget(
  hariIni: string,
  db: Database.Database = getDb()
): Target[] {
  const baris = db
    .prepare(
      `SELECT g.id, g.name, g.target, g.start_date AS startDate, g.deadline,
              COALESCE(SUM(d.amount), 0) AS terkumpul
       FROM goals g
       LEFT JOIN goal_deposits d ON d.goal_id = g.id
       GROUP BY g.id
       ORDER BY g.deadline, g.id`
    )
    .all() as {
    id: number;
    name: string;
    target: number;
    startDate: string;
    deadline: string;
    terkumpul: number;
  }[];

  return baris.map((b) => ({ ...b, ...hitungTarget({ ...b, hariIni }) }));
}

// Pesan untuk Wally, selalu ada isinya (beda dengan pesan budget yang bisa diam)
export function pesanTarget(t: Target): string {
  if (t.status === "tercapai") return `${t.name} tercapai. Selamat!`;
  if (t.status === "lewat tenggat") {
    return `Tenggat ${t.name} sudah lewat, masih kurang ${formatRupiah(t.sisa)}.`;
  }

  const rencana =
    t.bulanTersisa === 1
      ? `${formatRupiah(t.perBulan)} bulan ini`
      : `${formatRupiah(t.perBulan)} per bulan selama ${t.bulanTersisa} bulan lagi`;

  return t.status === "tertinggal"
    ? `${t.name} tertinggal. Agar tepat waktu, sisihkan ${rencana}.`
    : `${t.name} di jalur. Sisihkan ${rencana}.`;
}