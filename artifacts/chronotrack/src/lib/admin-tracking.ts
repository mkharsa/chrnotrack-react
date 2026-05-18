import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const GLOBAL_REF = () => doc(db, "adminStats", "global");
const USER_REF = (uid: string) => doc(db, "adminUsers", uid);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function trackUserLogin(uid: string): Promise<void> {
  try {
    const userSnap = await getDoc(USER_REF(uid));
    const now = serverTimestamp();
    const key = todayKey();

    if (!userSnap.exists()) {
      await setDoc(USER_REF(uid), { firstSeen: now, lastSeen: now });
      await setDoc(GLOBAL_REF(), {
        userCount: increment(1),
        [`logins.${key}`]: increment(1),
      }, { merge: true });
    } else {
      await updateDoc(USER_REF(uid), { lastSeen: now });
      await setDoc(GLOBAL_REF(), {
        [`logins.${key}`]: increment(1),
      }, { merge: true });
    }
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

export async function getAdminStats() {
  const snap = await getDoc(GLOBAL_REF());
  return snap.exists() ? snap.data() : {};
}

export async function getAdminUsers() {
  const { collection, getDocs, orderBy, query } = await import("firebase/firestore");
  const q = query(collection(db, "adminUsers"), orderBy("lastSeen", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }));
}
