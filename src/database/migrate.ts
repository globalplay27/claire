import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "./db.js";

async function main() {
  const sql = await readFile(resolve("migrations/001_init.sql"), "utf8");
  await db.query(sql);
  console.log("Migration applied successfully.");
  await db.end();
}

main().catch(async (error) => {
  console.error(error);
  await db.end();
  process.exit(1);
});
