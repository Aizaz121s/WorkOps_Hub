import { db } from "../config/database.js";
import { migrate } from "./schema.js";
import { seed } from "./seed.js";

migrate(db);
seed(db);
console.log("Database migrated and seeded successfully.");
