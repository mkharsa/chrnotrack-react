import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { participantsTable } from "./participants";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  defaultDist: text("default_dist"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionParticipantsTable = pgTable("session_participants", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id, { onDelete: "cascade" }),
  participantId: integer("participant_id").references(() => participantsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  lastDist: text("last_dist"),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true, createdAt: true });
export const insertSessionParticipantSchema = createInsertSchema(sessionParticipantsTable).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertSessionParticipant = z.infer<typeof insertSessionParticipantSchema>;
export type Session = typeof sessionsTable.$inferSelect;
export type SessionParticipant = typeof sessionParticipantsTable.$inferSelect;
