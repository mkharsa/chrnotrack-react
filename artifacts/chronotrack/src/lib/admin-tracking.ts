import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
  collection, getDocs, orderBy, query,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "./firebase";

const GLOBAL_REF = () => doc(db, "adminStats", "global");
const USER_REF = (uid: string) => doc(db, "adminUsers", uid);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function trackUserLogin(uid: string): Promise<void> {
  try {
    const userSnap = await getDoc(USER_REF(uid));
    const now = serverTimestamp();
    const key = todayKey();
    if (!userSnap.exists()) {
      await setDoc(USER_REF(uid), { firstSeen: now, lastSeen: now });
    } else {
      await updateDoc(USER_REF(uid), { lastSeen: now });
    }
    await setDoc(GLOBAL_REF(), { [`logins.${key}`]: increment(1) }, { merge: true });
  } catch {
    // tracking must never break the app
  }
}

export async function trackSessionCreated(): Promise<void> {
  try {
    await setDoc(GLOBAL_REF(), { totalSessions: increment(1) }, { merge: true });
  } catch {}
}

export async function trackSeriesCreated(): Promise<void> {
  try {
    await setDoc(GLOBAL_REF(), { totalSeries: increment(1) }, { merge: true });
  } catch {}
}

export type AdminStats = {
  totalSessions?: number;
  totalSeries?: number;
  logins?: Record<string, number>;
};

export type AdminUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  provider?: string | null;
  firstSeen?: { seconds: number } | null;
  lastSeen?: { seconds: number } | null;
  createdAt?: string | null;
  lastSignIn?: string | null;
};

type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  provider: string | null;
  createdAt: string | null;
  lastSignIn: string | null;
};

export async function getAdminData(): Promise<{ stats: AdminStats; users: AdminUser[] }> {
  const fns = getFunctions(undefined, "us-central1");
  const callGetAuthUsers = httpsCallable<{ secret: string }, { users: AuthUser[] }>(
    fns, "getAuthUsers"
  );

  const [statsSnap, firestoreSnap, authResult] = await Promise.all([
    getDoc(GLOBAL_REF()),
    getDocs(query(collection(db, "adminUsers"), orderBy("lastSeen", "desc"))),
    callGetAuthUsers({ secret: "aboudi" }).catch(() => ({ data: { users: [] } })),
  ]);

  const stats: AdminStats = statsSnap.exists() ? (statsSnap.data() as AdminStats) : {};

  // Build a map of Firestore tracking data keyed by uid
  const firestoreMap = new Map(
    firestoreSnap.docs.map(d => [d.id, d.data()])
  );

  // Merge Auth users (source of truth) with Firestore tracking data
  const authUsers: AuthUser[] = authResult.data.users;

  // If Cloud Function not yet deployed, fall back to Firestore-only list
  const users: AdminUser[] = authUsers.length > 0
    ? authUsers.map(u => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        provider: u.provider,
        createdAt: u.createdAt,
        lastSignIn: u.lastSignIn,
        firstSeen: (firestoreMap.get(u.uid)?.firstSeen as { seconds: number } | undefined) ?? null,
        lastSeen: (firestoreMap.get(u.uid)?.lastSeen as { seconds: number } | undefined) ?? null,
      }))
    : firestoreSnap.docs.map(d => ({ uid: d.id, ...d.data() } as AdminUser));

  return { stats, users };
}
