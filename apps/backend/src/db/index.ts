import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import { fileURLToPath } from "node:url"
import * as schema from "./schema.js"

const connectionString = process.env.DATABASE_URL!
const migrationsFolder = fileURLToPath(new URL("./migrations", import.meta.url))

const client = postgres(connectionString)
export const db = drizzle(client, { schema })

async function ensureAdditiveSchemaCompatibility() {
  await client`ALTER TABLE "flows" ADD COLUMN IF NOT EXISTS "user_docs" text`
  await client`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "last_explored_commit" text`
  await client`ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "demo_url" text`
}

export async function initDb() {
  await migrate(db, { migrationsFolder })
  await ensureAdditiveSchemaCompatibility()
  console.log("[db] Migrations applied")
}

export async function closeDb() {
  await client.end()
}
