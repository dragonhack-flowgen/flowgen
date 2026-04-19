import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import * as schema from "./schema.js"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

const client = postgres(connectionString)
export const db = drizzle(client, { schema })

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function initDb() {
  await migrate(db, { migrationsFolder: join(__dirname, "migrations") })
  console.log("[db] Migrations applied")
}
