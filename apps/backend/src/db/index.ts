import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import * as schema from "./schema.js"

const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString)
export const db = drizzle(client, { schema })

export async function initDb() {
  await migrate(db, { migrationsFolder: "src/db/migrations" })
  console.log("[db] Migrations applied")
}
