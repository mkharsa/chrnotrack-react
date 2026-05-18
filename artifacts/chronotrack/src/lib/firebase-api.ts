import { useQuery, useMutation } from "@tanstack/react-query";
import {
  collection, getDocs, getDoc, addDoc, deleteDoc, updateDoc,
  doc, serverTimestamp, writeBatch, CollectionReference, DocumentReference,
} from "firebase/firestore";
import { db, auth } from "./firebase";

function uid(): string {
  const u = auth.currentUser;
  if (!u) throw new Error("Not authenticated");
  return u.uid;
}

function userCol(name: string): CollectionReference {
  return collection(db, "users", uid(), name);
}

function userDocRef(collName: string, docId: string): DocumentReference {
  return doc(db, "users", uid(), collName, docId);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Participant = { id: string; name: string };

export type Session = {
  id: string;
  name: string;
  date: string;
  participantCount: number;
  defaultDist?: string | null;
};

export type SessionParticipant = {
  id: string;
  participantId: string | null;
  name: string;
  lastDist?: string | null;
};

export type SessionDetail = Session & { participants: SessionParticipant[] };

export type SeriesEntry = {
  pid: string;
  name: string;
  timeMs: number;
  include: boolean;
};

export type Series = {
  id: string;
  dateKey: string;
  sessionId?: string | null;
  dist: string;
  entries: SeriesEntry[];
};

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const getListParticipantsQueryKey = () => ["participants"] as const;
export const getListSessionsQueryKey = () => ["sessions"] as const;
export const getGetSessionQueryKey = (id: string) => ["sessions", id] as const;
export const getListSeriesQueryKey = (params?: { dateKey?: string }) =>
  params?.dateKey ? ["series", params.dateKey] : (["series"] as const);

// ─── Participants ─────────────────────────────────────────────────────────────

export function useListParticipants() {
  return useQuery({
    queryKey: getListParticipantsQueryKey(),
    queryFn: async (): Promise<Participant[]> => {
      const snap = await getDocs(userCol("participants"));
      return snap.docs
        .map(d => ({ id: d.id, name: d.data().name as string }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useCreateParticipant() {
  return useMutation({
    mutationFn: async ({ data }: { data: { name: string } }): Promise<Participant> => {
      const ref = await addDoc(userCol("participants"), {
        name: data.name,
        createdAt: serverTimestamp(),
      });
      return { id: ref.id, name: data.name };
    },
  });
}

export function useDeleteParticipant() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      await deleteDoc(userDocRef("participants", id));
    },
  });
}

export function useUpdateParticipant() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string } }): Promise<void> => {
      await updateDoc(userDocRef("participants", id), { name: data.name });
    },
  });
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function useListSessions() {
  return useQuery({
    queryKey: getListSessionsQueryKey(),
    queryFn: async (): Promise<Session[]> => {
      const snap = await getDocs(userCol("sessions"));
      return snap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name as string,
            date: data.date as string,
            defaultDist: (data.defaultDist as string | null) ?? null,
            participantCount: ((data.participants ?? []) as SessionParticipant[]).length,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

export function useCreateSession() {
  return useMutation({
    mutationFn: async ({ data }: {
      data: { name: string; date: string; defaultDist?: string | null; participantIds?: string[] };
    }): Promise<{ id: string }> => {
      const participants: SessionParticipant[] = [];
      for (const pid of (data.participantIds ?? [])) {
        const snap = await getDoc(userDocRef("participants", pid));
        if (snap.exists()) {
          participants.push({
            id: crypto.randomUUID(),
            participantId: pid,
            name: snap.data().name as string,
            lastDist: data.defaultDist ?? null,
          });
        }
      }
      const ref = await addDoc(userCol("sessions"), {
        name: data.name,
        date: data.date,
        defaultDist: data.defaultDist ?? null,
        participants,
        createdAt: serverTimestamp(),
      });
      return { id: ref.id };
    },
  });
}

export function useGetSession(id: string) {
  return useQuery({
    queryKey: getGetSessionQueryKey(id),
    queryFn: async (): Promise<SessionDetail | null> => {
      if (!id) return null;
      const snap = await getDoc(userDocRef("sessions", id));
      if (!snap.exists()) return null;
      const data = snap.data();
      const participants = (data.participants ?? []) as SessionParticipant[];
      return {
        id: snap.id,
        name: data.name as string,
        date: data.date as string,
        defaultDist: (data.defaultDist as string | null) ?? null,
        participantCount: participants.length,
        participants,
      };
    },
    enabled: !!id,
  });
}

export function useBulkDeleteSessions() {
  return useMutation({
    mutationFn: async ({ data }: { data: { ids: string[] } }): Promise<void> => {
      const batch = writeBatch(db);
      for (const id of data.ids) {
        batch.delete(userDocRef("sessions", id));
      }
      // Delete associated series
      const seriesSnap = await getDocs(userCol("series"));
      seriesSnap.docs
        .filter(d => data.ids.includes(d.data().sessionId as string))
        .forEach(d => batch.delete(d.ref));
      await batch.commit();
    },
  });
}

export function useAddSessionParticipant() {
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: { participantId: string; name: string };
    }): Promise<SessionParticipant> => {
      const sessionRef = userDocRef("sessions", id);
      const sessionSnap = await getDoc(sessionRef);
      if (!sessionSnap.exists()) throw new Error("Session not found");
      const existing = (sessionSnap.data().participants ?? []) as SessionParticipant[];
      const sp: SessionParticipant = {
        id: crypto.randomUUID(),
        participantId: data.participantId,
        name: data.name,
        lastDist: null,
      };
      await updateDoc(sessionRef, { participants: [...existing, sp] });
      return sp;
    },
  });
}

// ─── Series ───────────────────────────────────────────────────────────────────

export function useListSeries(params?: { dateKey?: string }) {
  return useQuery({
    queryKey: getListSeriesQueryKey(params),
    queryFn: async (): Promise<Series[]> => {
      const snap = await getDocs(userCol("series"));
      return snap.docs
        .filter(d => {
          const data = d.data();
          return (
            data.dateKey &&
            data.dist &&
            (!params?.dateKey || data.dateKey === params.dateKey)
          );
        })
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            dateKey: data.dateKey as string,
            sessionId: (data.sessionId as string | null) ?? null,
            dist: data.dist as string,
            entries: ((data.entries ?? []) as SeriesEntry[]).filter(
              e => e && e.pid && typeof e.timeMs === "number"
            ),
          } satisfies Series;
        })
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    },
  });
}

export function useCreateSeries() {
  return useMutation({
    mutationFn: async ({ data }: {
      data: { dateKey: string; sessionId?: string | null; dist: string; entries: SeriesEntry[] };
    }): Promise<{ id: string }> => {
      const ref = await addDoc(userCol("series"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return { id: ref.id };
    },
  });
}

export function useUpdateSeries() {
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: Partial<Pick<Series, "dist" | "entries">>;
    }): Promise<void> => {
      await updateDoc(userDocRef("series", id), data);
    },
  });
}

export function useDeleteSeries() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      await deleteDoc(userDocRef("series", id));
    },
  });
}

// ─── Progression ──────────────────────────────────────────────────────────────

type ProgressionPeriod = {
  label: string;
  avgMs: number;
  count: number;
  trend: "better" | "worse" | "same" | null;
};

export type ProgressionData = {
  participantId: string;
  name: string;
  periods: ProgressionPeriod[];
};

export type ProgressionSummary = {
  participantId: string;
  name: string;
  globalAvgMs: number;
};

export function useGetProgression(params: { dist: string; groupBy: "session" | "month" }) {
  return useQuery({
    queryKey: ["progression", params.dist, params.groupBy],
    queryFn: async (): Promise<ProgressionData[]> => {
      const snap = await getDocs(userCol("series"));
      const filtered = snap.docs
        .filter(d => d.data().dist === params.dist)
        .sort((a, b) => (a.data().dateKey as string).localeCompare(b.data().dateKey as string));

      const participantMap = new Map<string, { name: string; periodData: Map<string, number[]> }>();

      for (const d of filtered) {
        const data = d.data();
        const label = params.groupBy === "month"
          ? (data.dateKey as string).substring(0, 7)
          : (data.dateKey as string);

        for (const entry of ((data.entries ?? []) as SeriesEntry[])) {
          if (!entry || !entry.pid || typeof entry.timeMs !== "number") continue;
          if (!entry.include) continue;
          if (!participantMap.has(entry.pid)) {
            participantMap.set(entry.pid, { name: entry.name, periodData: new Map() });
          }
          const pData = participantMap.get(entry.pid)!;
          if (!pData.periodData.has(label)) pData.periodData.set(label, []);
          pData.periodData.get(label)!.push(entry.timeMs);
        }
      }

      const result: ProgressionData[] = [];
      for (const [pid, { name, periodData }] of participantMap) {
        const sortedLabels = Array.from(periodData.keys()).sort();
        const periods: ProgressionPeriod[] = sortedLabels.map((label, i) => {
          const times = periodData.get(label)!;
          const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          let trend: ProgressionPeriod["trend"] = null;
          if (i > 0) {
            const prevTimes = periodData.get(sortedLabels[i - 1])!;
            const prevAvg = Math.round(prevTimes.reduce((a, b) => a + b, 0) / prevTimes.length);
            trend = avgMs < prevAvg ? "better" : avgMs > prevAvg ? "worse" : "same";
          }
          return { label, avgMs, count: times.length, trend };
        });
        result.push({ participantId: pid, name, periods });
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useGetProgressionSummary() {
  return useQuery({
    queryKey: ["progression", "summary"],
    queryFn: async (): Promise<ProgressionSummary[]> => {
      const snap = await getDocs(userCol("series"));
      const participantMap = new Map<string, { name: string; times: number[] }>();

      for (const d of snap.docs) {
        for (const entry of ((d.data().entries ?? []) as SeriesEntry[])) {
          if (!entry.include) continue;
          if (!participantMap.has(entry.pid)) {
            participantMap.set(entry.pid, { name: entry.name, times: [] });
          }
          participantMap.get(entry.pid)!.times.push(entry.timeMs);
        }
      }

      return Array.from(participantMap.entries())
        .map(([pid, { name, times }]) => ({
          participantId: pid,
          name,
          globalAvgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useListDistances() {
  return useQuery({
    queryKey: ["distances"],
    queryFn: async (): Promise<string[]> => {
      const snap = await getDocs(userCol("series"));
      const dists = new Set<string>();
      snap.docs.forEach(d => {
        const dist = d.data().dist as string | undefined;
        if (dist) dists.add(dist);
      });
      return Array.from(dists).sort((a, b) => Number(a) - Number(b));
    },
  });
}

// ─── Training ─────────────────────────────────────────────────────────────────

export type TrainingExercise = {
  id: string;
  name: string;
  needsChrono: boolean;
  dist?: string | null;
  sessionId?: string | null;
};

export type TrainingPlan = {
  id: string;
  date: string;
  title: string;
  notes?: string | null;
  participantIds: string[];
  exercises: TrainingExercise[];
};

export const getListTrainingQueryKey = () => ["training"] as const;

export function useListTraining() {
  return useQuery({
    queryKey: getListTrainingQueryKey(),
    queryFn: async (): Promise<TrainingPlan[]> => {
      const snap = await getDocs(userCol("training"));
      return snap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            date: data.date as string,
            title: data.title as string,
            notes: (data.notes as string | null) ?? null,
            participantIds: (data.participantIds as string[]) ?? [],
            exercises: (data.exercises as TrainingExercise[]) ?? [],
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}

export function useCreateTrainingPlan() {
  return useMutation({
    mutationFn: async ({ data }: {
      data: Omit<TrainingPlan, "id">;
    }): Promise<{ id: string }> => {
      const ref = await addDoc(userCol("training"), {
        ...data,
        createdAt: serverTimestamp(),
      });
      return { id: ref.id };
    },
  });
}

export function useUpdateTrainingPlan() {
  return useMutation({
    mutationFn: async ({ id, data }: {
      id: string;
      data: Partial<Omit<TrainingPlan, "id">>;
    }): Promise<void> => {
      await updateDoc(userDocRef("training", id), data);
    },
  });
}

export function useDeleteTrainingPlan() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }): Promise<void> => {
      await deleteDoc(userDocRef("training", id));
    },
  });
}
