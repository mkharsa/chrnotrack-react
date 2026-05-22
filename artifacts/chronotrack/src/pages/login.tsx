import { useState } from "react";
import {
  signInWithPopup, GoogleAuthProvider, signInWithCredential,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";

// Detect Capacitor native environment (Android / iOS)
const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
  .Capacitor?.isNativePlatform?.();

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.3-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.5 19 12 24 12c3 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.5 35.5 26.9 36.5 24 36.5c-5.3 0-9.7-3.4-11.4-8l-6.5 5C9.6 40 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.7 20H24v8h11.3c-.9 2.6-2.6 4.8-4.8 6.2l6.2 5.2C40.5 36.2 44 30.5 44 24c0-1.3-.1-2.7-.3-4z"/>
    </svg>
  );
}

const AUTH_ERRORS: Record<string, string> = {
  "auth/wrong-password": "Mot de passe incorrect.",
  "auth/invalid-credential": "Email ou mot de passe incorrect.",
  "auth/user-not-found": "Aucun compte avec cet email.",
  "auth/email-already-in-use": "Cet email est déjà utilisé.",
  "auth/weak-password": "Mot de passe trop faible (6 caractères min).",
  "auth/invalid-email": "Adresse email invalide.",
  "auth/internal-error": "Erreur de connexion. Vérifiez votre réseau et réessayez.",
  "auth/network-request-failed": "Pas de connexion internet.",
  "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
  // Google native sign-in errors
  "10": "Erreur de configuration Google (SHA-1 non reconnu). Contactez le support.",
  "12500": "Connexion Google échouée. Vérifiez votre connexion et réessayez.",
  "12501": "", // user cancelled
  "12502": "Trop de tentatives Google. Réessayez dans quelques minutes.",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);


  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const lockRemaining = lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 60000) : 0;

  const handleError = (e: unknown) => {
    const code = (e as { code?: string }).code ?? "";
    const rawMsg = (e as Error).message ?? "";
    let msg: string;

    // Log complet pour debug
    console.error("[Auth error]", JSON.stringify({ code, rawMsg, full: e }));

    if (AUTH_ERRORS[code] !== undefined) {
      msg = AUTH_ERRORS[code];
    } else if (
      rawMsg.toLowerCase().includes("cancel") ||
      rawMsg.toLowerCase().includes("annul") ||
      rawMsg.toLowerCase().includes("dismissed") ||
      code === "12501"
    ) {
      msg = ""; // user cancelled, don't show error
    } else {
      // Affiche le code + message brut pour aider au diagnostic
      msg = code ? `Erreur Google [${code}] : ${rawMsg || "inconnue"}` : (rawMsg || "Une erreur est survenue. Réessayez.");
    }

    if (msg) {
      setError(msg);
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) setLockedUntil(Date.now() + LOCKOUT_MS);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (isNative) {
        // Plugin officiel Firebase pour Capacitor 7 — gère le Sign-In natif Android/iOS
        const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
        if (!result.credential?.idToken) {
          throw new Error("Connexion Google annulée.");
        }
        const credential = GoogleAuthProvider.credential(
          result.credential.idToken,
          result.credential.accessToken ?? undefined,
        );
        await signInWithCredential(auth, credential);
      } else {
        await signInWithPopup(auth, new GoogleAuthProvider());
      }
    } catch (e) { handleError(e); }
    finally { setLoading(false); }
  };

  const handleEmail = async () => {
    if (isLocked) { setError(`Trop de tentatives. Réessayez dans ${lockRemaining} min.`); return; }
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      setAttempts(0);
      setLockedUntil(null);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Un email de réinitialisation a été envoyé.");
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "signin" | "signup" | "reset") => {
    setMode(next);
    setError(null);
    setSuccess(null);
  };

  if (mode === "reset") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2 mb-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-3">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight uppercase">ChronoTrack</h1>
            <p className="text-sm text-muted-foreground">Réinitialiser le mot de passe</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Votre adresse email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !loading && email && handleReset()}
                className="pl-9"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}
            {success && (
              <p className="text-xs text-green-600 bg-green-500/10 px-3 py-2 rounded-lg">{success}</p>
            )}

            <Button className="w-full" onClick={handleReset} disabled={!email || loading}>
              {loading ? "..." : "Envoyer le lien"}
            </Button>
          </div>

          <button
            onClick={() => switchMode("signin")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2 mb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-3">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">ChronoTrack</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Connectez-vous pour accéder à vos données" : "Créez votre compte"}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="relative">
            <Input
              type={showPwd ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && email && password && handleEmail()}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {mode === "signin" && (
            <div className="text-right">
              <button
                onClick={() => switchMode("reset")}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleEmail}
            disabled={!email || !password || loading || isLocked}
          >
            {loading ? "..." : isLocked ? `Bloqué ${lockRemaining} min` : mode === "signin" ? "Se connecter" : "Créer un compte"}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary font-semibold hover:underline"
          >
            {mode === "signin" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}
