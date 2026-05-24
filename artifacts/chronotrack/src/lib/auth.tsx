import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth } from "./firebase";
import { trackUserLogin } from "./admin-tracking";

const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
  .Capacitor?.isNativePlatform?.();

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children, onUserChange }: { children: React.ReactNode; onUserChange?: (uid: string | null) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
      onUserChange?.(u?.uid ?? null);
      if (u) trackUserLogin(u.uid);
    });
  }, []);

  const signOut = async () => {
    // Sur Android/iOS : déconnecte aussi la session native Firebase + Google
    if (isNative) await FirebaseAuthentication.signOut().catch(() => {});
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
