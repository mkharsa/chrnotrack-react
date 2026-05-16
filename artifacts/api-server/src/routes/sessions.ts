import { Router } from "express";
import { db, sessionsTable, sessionParticipantsTable, participantsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

const router = Router();

router.get("/sessions", async (req, res) => {
  const sessions = await db.select().from(sessionsTable).orderBy(sessionsTable.date);
  const counts = await db
    .select({ sessionId: sessionParticipantsTable.sessionId, count: sql<number>`count(*)::int` })
    .from(sessionParticipantsTable)
    .groupBy(sessionParticipantsTable.sessionId);
  const countMap = Object.fromEntries(counts.map((c) => [c.sessionId, c.count]));
  const result = sessions.map((s) => ({
    ...s,
    defaultDist: s.defaultDist ?? null,
    participantCount: countMap[s.id] ?? 0,
  }));
  res.json(result);
});

router.post("/sessions", async (req, res) => {
  const { name, date, defaultDist, participantIds } = req.body;
  if (!name || !date) { res.status(400).json({ error: "name and date are required" }); return; }
  const [session] = await db.insert(sessionsTable).values({ name, date, defaultDist: defaultDist ?? null }).returning();
  if (participantIds && Array.isArray(participantIds) && participantIds.length > 0) {
    const pList = await db.select().from(participantsTable).where(inArray(participantsTable.id, participantIds));
    if (pList.length > 0) {
      await db.insert(sessionParticipantsTable).values(
        pList.map((p) => ({ sessionId: session.id, participantId: p.id, name: p.name }))
      );
    }
  }
  res.status(201).json({ ...session, defaultDist: session.defaultDist ?? null, participantCount: participantIds?.length ?? 0 });
});

router.get("/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(404).json({ error: "not found" }); return; }
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "not found" }); return; }
  const participants = await db.select().from(sessionParticipantsTable).where(eq(sessionParticipantsTable.sessionId, id));
  res.json({ ...session, defaultDist: session.defaultDist ?? null, participants: participants.map(p => ({ ...p, lastDist: p.lastDist ?? null, participantId: p.participantId ?? null })) });
});

router.delete("/sessions/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(sessionsTable).where(eq(sessionsTable.id, id));
  res.status(204).send();
});

router.post("/sessions/bulk-delete", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: "ids required" }); return; }
  const result = await db.delete(sessionsTable).where(inArray(sessionsTable.id, ids)).returning();
  res.json({ deleted: result.length });
});

router.post("/sessions/:id/participants", async (req, res) => {
  const sessionId = parseInt(req.params.id);
  if (isNaN(sessionId)) { res.status(400).json({ error: "invalid id" }); return; }
  const { participantId, name } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [sp] = await db.insert(sessionParticipantsTable).values({
    sessionId,
    participantId: participantId ?? null,
    name,
  }).returning();
  res.status(201).json({ ...sp, lastDist: sp.lastDist ?? null, participantId: sp.participantId ?? null });
});

router.patch("/sessions/:id/participants/:pid", async (req, res) => {
  const pid = parseInt(req.params.pid);
  if (isNaN(pid)) { res.status(400).json({ error: "invalid pid" }); return; }
  const { lastDist } = req.body;
  const [sp] = await db.update(sessionParticipantsTable)
    .set({ lastDist: lastDist ?? null })
    .where(eq(sessionParticipantsTable.id, pid))
    .returning();
  if (!sp) { res.status(404).json({ error: "not found" }); return; }
  res.json({ ...sp, lastDist: sp.lastDist ?? null, participantId: sp.participantId ?? null });
});

export default router;
