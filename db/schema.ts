import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const readinessProfiles = sqliteTable("readiness_profiles", {
  userId: text("user_id").primaryKey(),
  identityEmail: text("identity_email").notNull(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  contactEmail: text("contact_email").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const readinessProgress = sqliteTable("readiness_progress", {
  sessionId: text("session_id").primaryKey(),
  userId: text("user_id").notNull().references(() => readinessProfiles.userId, { onDelete: "cascade" }),
  payload: text("payload").notNull(),
  currentStage: integer("current_stage").notNull().default(1),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
