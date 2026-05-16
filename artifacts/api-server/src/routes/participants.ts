import { Router } from "express";
import { db, participantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/participants", async (req, res) => {
  const participants = await db.select().from(participantsTable).orderBy(participantsTable.name);
  res.json(participants);
});

router.post("/participants", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [participant] = await db.insert(participantsTable).values({ name: name.trim() }).returning();
  res.status(201).json(participant);
});

router.delete("/participants/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(participantsTable).where(eq(participantsTable.id, id));
  res.status(204).send();
});

export default router;
