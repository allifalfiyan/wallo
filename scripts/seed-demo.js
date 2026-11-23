// Mengisi database DEMO dengan data contoh untuk screenshot README.
// Aman: menolak berjalan kalau bukan file database bernama "demo",
// dan menolak kalau databasenya sudah berisi transaksi.
//
// Cara pakai (PowerShell):
//   $env:WALLO_DB_PATH = "data/demo/demo.db"
//   npm run dev          (buka http://localhost:3000 sekali, lalu hentikan server)
//   node scripts/seed-demo.js
const Database = require("better-sqlite3");
const path = require("node:path");

const file = process.env.WALLO_DB_PATH;
if (!file || !path.basename(file).toLowerCase().includes("demo")) {
  console.error(
    'Berhenti: set WALLO_DB_PATH ke file bernama "demo", misalnya data/demo/demo.db'
  );
  process.exit(1);
}

const db = new Database(file, { fileMustExist: true });
db.pragma("foreign_keys = ON");

if (db.prepare("SELECT COUNT(*) AS n FROM transactions").get().n > 0) {
  console.error("Berhenti: database demo ini sudah berisi transaksi.");
  process.exit(1);
}

const dua = (n) => String(n).padStart(2, "0");
const tgl = (d) => `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;
const sekarang = new Date();
const hariIni = tgl(sekarang);

// Pengacak dengan seed tetap, supaya hasilnya selalu sama
function acak(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = acak(2026);
const antara = (a, b) => a + Math.floor(rand() * (b - a + 1));
const bulatkan = (n) => Math.round(n / 500) * 500;
const pilih = (daftar) => daftar[antara(0, daftar.length - 1)];

function idKategori(nama, kind) {
  const baris = db
    .prepare("SELECT id FROM categories WHERE name = ? AND kind = ?")
    .get(nama, kind);
  if (!baris) throw new Error(`Kategori tidak ditemukan: ${nama} (${kind})`);
  return baris.id;
}

const buatDompet = db.prepare(
  "INSERT INTO accounts (name, type, opening_balance) VALUES (?, ?, ?)"
);
const dompet = [
  Number(buatDompet.run("Tunai", "tunai", 750000).lastInsertRowid),
  Number(buatDompet.run("Rekening Bank", "bank", 2500000).lastInsertRowid),
  Number(buatDompet.run("E-Wallet", "e-wallet", 300000).lastInsertRowid),
];

const sisipTrx = db.prepare(
  "INSERT INTO transactions (account_id, category_id, kind, amount, date, note) VALUES (?, ?, ?, ?, ?, ?)"
);
function catat(kind, kategori, amount, tanggal, catatan = "") {
  if (tanggal > hariIni) return; // jangan membuat transaksi di masa depan
  sisipTrx.run(pilih(dompet), idKategori(kategori, kind), kind, amount, tanggal, catatan);
}

// [kategori, jumlah min-maks transaksi per bulan, nominal min-maks, catatan]
const POLA = [
  ["Makan & Minum", [14, 18], [15000, 65000], ["Makan siang", "Kopi", "Makan malam", "Sarapan"]],
  ["Transportasi", [6, 9], [10000, 45000], ["Ojek online", "Bensin", "Parkir"]],
  ["Tagihan", [2, 3], [150000, 450000], ["Listrik", "Internet", "Air"]],
  ["Belanja", [2, 4], [80000, 350000], ["Belanja bulanan", "Perlengkapan rumah"]],
  ["Hiburan", [1, 3], [50000, 200000], ["Nonton bioskop", "Langganan streaming"]],
  ["Kesehatan", [0, 1], [60000, 250000], ["Obat", "Cek kesehatan"]],
  ["Pendidikan", [0, 1], [100000, 400000], ["Buku", "Kursus online"]],
  ["Lainnya", [1, 2], [30000, 150000], ["Hadiah", "Donasi"]],
];

db.transaction(() => {
  for (let i = 5; i >= 0; i--) {
    const awalBulan = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    const ym = `${awalBulan.getFullYear()}-${dua(awalBulan.getMonth() + 1)}`;
    const hari = (d) => `${ym}-${dua(d)}`;

    catat("pemasukan", "Gaji", 8000000, hari(1), "Gaji bulanan");
    if (rand() < 0.5) {
      catat("pemasukan", "Usaha", bulatkan(antara(500000, 2000000)), hari(15), "Proyek sampingan");
    }

    for (const [kategori, [minN, maxN], [minJ, maxJ], catatan] of POLA) {
      const banyak = antara(minN, maxN);
      for (let k = 0; k < banyak; k++) {
        catat("pengeluaran", kategori, bulatkan(antara(minJ, maxJ)), hari(antara(1, 28)), pilih(catatan));
      }
    }
  }

  const sisipBudget = db.prepare("INSERT INTO budgets (category_id, amount) VALUES (?, ?)");
  sisipBudget.run(idKategori("Makan & Minum", "pengeluaran"), 900000);
  sisipBudget.run(idKategori("Transportasi", "pengeluaran"), 400000);
  sisipBudget.run(idKategori("Hiburan", "pengeluaran"), 250000);

  const sisipTarget = db.prepare(
    "INSERT INTO goals (name, target, start_date, deadline) VALUES (?, ?, ?, ?)"
  );
  const sisipSetoran = db.prepare(
    "INSERT INTO goal_deposits (goal_id, amount, date, note) VALUES (?, ?, ?, '')"
  );
  const bulanKe = (selisih, hari) =>
    tgl(new Date(sekarang.getFullYear(), sekarang.getMonth() + selisih, hari));

  const liburan = Number(
    sisipTarget.run("Liburan Bali", 12000000, bulanKe(-2, 1), bulanKe(7, 0)).lastInsertRowid
  );
  for (const s of [-2, -1, 0]) {
    const tanggal = bulanKe(s, 5);
    if (tanggal <= hariIni) sisipSetoran.run(liburan, 1500000, tanggal);
  }

  const laptop = Number(
    sisipTarget.run("Laptop Baru", 15000000, bulanKe(-1, 1), bulanKe(10, 0)).lastInsertRowid
  );
  sisipSetoran.run(laptop, 3000000, bulanKe(-1, 10));
})();

const n = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(
  `Selesai: ${n("accounts")} dompet, ${n("transactions")} transaksi, ` +
    `${n("budgets")} budget, ${n("goals")} target, ${n("goal_deposits")} setoran.`
);
db.close();