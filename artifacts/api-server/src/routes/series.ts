import { Router } from "express";
import { db, seriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/series", async (req, res) => {
  const { dateKey } = req.query;
  let query = db.select().from(seriesTable);
  if (dateKey && typeof dateKey === "string") {
    const result = await db.select().from(seriesTable).where(eq(seriesTable.dateKey, dateKey)).orderBy(seriesTable.createdAt);
    res.json(result.map(s => ({ ...s, sessionId: s.sessionId ?? null })));
    return;
  }
  const result = await query.orderBy(seriesTable.dateKey);
  res.json(result.map(s => ({ ...s, sessionId: s.sessionId ?? null })));
});

router.post("/series", async (req, res) => {
  const { dateKey, sessionId, dist, entries } = req.body;
  if (!dateKey || !dist || !Array.isArray(entries)) {
    res.status(400).json({ error: "dateKey, dist, and entries are required" });
    return;
  }
  const [series] = await db.insert(seriesTable).values({
    dateKey,
    sessionId: sessionId ?? null,
    dist,
    entries,
  }).returning();
  res.status(201).json({ ...series, sessionId: series.sessionId ?? null });
});

router.patch("/series/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { dist, entries } = req.body;
  const updateData: Record<string, unknown> = {};
  if (dist !== undefined) updateData.dist = dist;
  if (entries !== undefined) updateData.entries = entries;
  const [series] = await db.update(seriesTable).set(updateData).where(eq(seriesTable.id, id)).returning();
  if (!series) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...series, sessionId: series.sessionId ?? null });
});

router.delete("/series/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(seriesTable).where(eq(seriesTable.id, id));
  res.status(204).send();
});

router.get("/series/by-date", async (req, res) => {
  const rows = await db
    .select({ dateKey: seriesTable.dateKey, count: sql<number>`count(*)::int` })
    .from(seriesTable)
    .groupBy(seriesTable.dateKey)
    .orderBy(seriesTable.dateKey);
  res.json(rows);
});

export default router;
