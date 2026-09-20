import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "./db.js";

async function main() {
  const directory = resolve("migrations");
  const files = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(resolve(directory, file), "utf8");
    await db.query(sql);
    console.log(`Migration applied: ${file}`);
  }

  await db.end();
}

main().catch(async (error) => {
  console.error(error);
  await db.end();
  process.exit(1);
});
