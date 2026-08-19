import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./db";

async function main() {
  try {
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("[Database] Migrations applied successfully");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[Database] Migration failed", error);
  process.exitCode = 1;
});
