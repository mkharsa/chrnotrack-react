import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
  collection, getDocs, orderBy, query,
} from "firebase/firestore";
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
  firstSeen?: { seconds: number };
  lastSeen?: { seconds: number };
};

export async function getAdminData(): Promise<{ stats: AdminStats; users: AdminUser[] }> {
  const [statsSnap, usersSnap] = await Promise.all([
    getDoc(GLOBAL_REF()),
    getDocs(query(collection(db, "adminUsers"), orderBy("lastSeen", "desc"))),
  ]);

  const stats: AdminStats = statsSnap.exists() ? (statsSnap.data() as AdminStats) : {};
  const users: AdminUser[] = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as AdminUser));

  return { stats, users };
}
