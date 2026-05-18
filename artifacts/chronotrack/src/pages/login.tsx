import { useState } from "react";
import {
  signInWithPopup, GoogleAuthProvider, OAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Mail, Eye, EyeOff } from "lucide-react";

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

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
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
  "auth/popup-closed-by-user": "",
  "auth/cancelled-popup-request": "",
};

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleError = (e: unknown) => {
    const code = (e as { code?: string }).code ?? "";
    const msg = AUTH_ERRORS[code] ?? (e as Error).message;
    if (msg) setError(msg);
  };

  const handleGoogle = async () => {
    setError(null);
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (e) { handleError(e); }
  };

  const handleMicrosoft = async () => {
    setError(null);
    try { await signInWithPopup(auth, new OAuthProvider("microsoft.com")); }
    catch (e) { handleError(e); }
  };

  const handleEmail = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2 mb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-3">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">ChronoTrack</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Connectez-vous pour accéder à vos données" : "Créez votre compte"}
          </p>
        </div>

        {/* Boutons sociaux */}
        <div className="space-y-3">
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
          <button
            onClick={handleMicrosoft}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <MicrosoftIcon />
            Continuer avec Microsoft
          </button>
        </div>

        {/* Séparateur */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email / mot de passe */}
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleEmail}
            disabled={!email || !password || loading}
          >
            {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer un compte"}
          </Button>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button
            onClick={() => { setMode(m => m === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-primary font-semibold hover:underline"
          >
            {mode === "signin" ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}
