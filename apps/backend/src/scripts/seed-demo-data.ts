import "dotenv/config"
import { closeDb, initDb } from "../db/index.js"
import { seedDemoData } from "../services/demo-seed.js"

try {
  await initDb()

  const result = await seedDemoData({ log: true })

  console.log(
    `[demo-seed] Demo data ready. ${result.flows.length} flows and ${result.recordings.length} recordings synced.`
  )
} finally {
  await closeDb()
}
