import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "./env.js";

const dbFile = path.resolve(process.cwd(), env.dbPath);
const dbDir = path.dirname(dbFile);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbFile);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
