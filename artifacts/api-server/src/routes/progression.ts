import { Router } from "express";
import { db, seriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { SeriesEntry } from "@workspace/db";

const router = Router();

function formatLabel(dateKey: string, groupBy: string): string {
  if (groupBy === "month") {
    return dateKey.substring(0, 7);
  }
  return dateKey;
}

router.get("/progression", async (req, res) => {
  const { dist, groupBy = "session" } = req.query as { dist?: string; groupBy?: string };

  let query = db.select().from(seriesTable).orderBy(seriesTable.dateKey);
  const allSeries = dist
    ? await db.select().from(seriesTable).where(eq(seriesTable.dist, dist)).orderBy(seriesTable.dateKey)
    : await query;

  const participantMap = new Map<number, { name: string; dist: string; periods: Map<string, { totalMs: number; count: number }> }[]>();

  for (const series of allSeries) {
    const entries = series.entries as SeriesEntry[];
    const label = formatLabel(series.dateKey, groupBy as string);
    const distVal = series.dist;

    for (const entry of entries) {
      if (!entry.include) continue;
      if (!participantMap.has(entry.pid)) {
        participantMap.set(entry.pid, []);
      }
      const distList = participantMap.get(entry.pid)!;
      let distEntry = distList.find(d => d.dist === distVal);
      if (!distEntry) {
        distEntry = { name: entry.name, dist: distVal, periods: new Map() };
        distList.push(distEntry);
      }
      if (!distEntry.periods.has(label)) {
        distEntry.periods.set(label, { totalMs: 0, count: 0 });
      }
      const period = distEntry.periods.get(label)!;
      period.totalMs += entry.timeMs;
      period.count += 1;
    }
  }

  const result = [];
  for (const [pid, distList] of participantMap) {
    for (const distEntry of distList) {
      const periods = Array.from(distEntry.periods.entries()).map(([label, data], idx, arr) => {
        const avgMs = Math.round(data.totalMs / data.count);
        let trend: string | null = null;
        if (idx > 0) {
          const prevData = arr[idx - 1][1];
          const prevAvg = Math.round(prevData.totalMs / prevData.count);
          trend = avgMs < prevAvg ? "better" : avgMs > prevAvg ? "worse" : "same";
        }
        return { label, avgMs, count: data.count, trend };
      });
      result.push({
        participantId: pid,
        name: distEntry.name,
        dist: distEntry.dist,
        periods,
      });
    }
  }

  res.json(result);
});

router.get("/progression/summary", async (req, res) => {
  const allSeries = await db.select().from(seriesTable).orderBy(seriesTable.dateKey);

  const participantMap = new Map<number, { name: string; distMap: Map<string, { totalMs: number; count: number }>; totalMs: number; totalCount: number }>();

  for (const series of allSeries) {
    const entries = series.entries as SeriesEntry[];
    for (const entry of entries) {
      if (!entry.include) continue;
      if (!participantMap.has(entry.pid)) {
        participantMap.set(entry.pid, { name: entry.name, distMap: new Map(), totalMs: 0, totalCount: 0 });
      }
      const p = participantMap.get(entry.pid)!;
      p.totalMs += entry.timeMs;
      p.totalCount += 1;
      if (!p.distMap.has(series.dist)) {
        p.distMap.set(series.dist, { totalMs: 0, count: 0 });
      }
      const d = p.distMap.get(series.dist)!;
      d.totalMs += entry.timeMs;
      d.count += 1;
    }
  }

  const result = Array.from(participantMap.entries()).map(([pid, p]) => ({
    participantId: pid,
    name: p.name,
    globalAvgMs: p.totalCount > 0 ? Math.round(p.totalMs / p.totalCount) : 0,
    totalEntries: p.totalCount,
    distBreakdown: Array.from(p.distMap.entries()).map(([dist, d]) => ({
      dist,
      avgMs: Math.round(d.totalMs / d.count),
      count: d.count,
    })),
  }));

  res.json(result);
});

router.get("/progression/distances", async (req, res) => {
  const rows = await db
    .selectDistinct({ dist: seriesTable.dist })
    .from(seriesTable)
    .orderBy(seriesTable.dist);
  res.json(rows.map(r => r.dist));
});

export default router;
