const Database = require("better-sqlite3");

const db = new Database("data/wallo.db", {
  readonly: true,
  fileMustExist: true,
});

console.log("versi skema:", db.pragma("user_version", { simple: true }));

const tabel = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  )
  .all();

for (const { name } of tabel) {
  const n = db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get().n;
  console.log(name.padEnd(14), n, "baris");
}