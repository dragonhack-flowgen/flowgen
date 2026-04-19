import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core"

export const flowStatusEnum = pgEnum("flow_status", [
  "pending",
  "running",
  "completed",
  "failed",
])

export const settings = pgTable("settings", {
  id: integer().primaryKey().default(1),
  gitUrl: text("git_url").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const flows = pgTable("flows", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text().notNull(),
  status: flowStatusEnum().notNull().default("pending"),
  guide: text(),
  userDocs: text("user_docs"),
  error: text(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Flow = typeof flows.$inferSelect
export type NewFlow = typeof flows.$inferInsert
export type Settings = typeof settings.$inferSelect
export type FlowStatus = (typeof flowStatusEnum.enumValues)[number]
