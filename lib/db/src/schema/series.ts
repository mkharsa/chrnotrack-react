import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";

export const seriesEntrySchema = z.object({
  pid: z.number(),
  name: z.string(),
  timeMs: z.number(),
  include: z.boolean(),
});

export type SeriesEntry = z.infer<typeof seriesEntrySchema>;

export const seriesTable = pgTable("series", {
  id: serial("id").primaryKey(),
  dateKey: text("date_key").notNull(),
  sessionId: integer("session_id").references(() => sessionsTable.id, { onDelete: "set null" }),
  dist: text("dist").notNull(),
  entries: jsonb("entries").notNull().$type<SeriesEntry[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSeriesSchema = createInsertSchema(seriesTable).omit({ id: true, createdAt: true });
export type InsertSeries = z.infer<typeof insertSeriesSchema>;
export type Series = typeof seriesTable.$inferSelect;
