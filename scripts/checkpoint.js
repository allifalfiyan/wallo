const Database = require("better-sqlite3");

const db = new Database("data/wallo.db", { fileMustExist: true });
console.log(db.pragma("wal_checkpoint(TRUNCATE)"));
db.close();