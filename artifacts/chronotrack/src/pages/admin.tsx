import { useState, useEffect } from "react";
import { Users, Timer, Activity, TrendingUp, Lock, BarChart2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminData, type AdminStats, type AdminUser } from "@/lib/admin-tracking";

const SESSION_KEY = "ct_admin_auth";
const ADMIN_PWD = "aboudi";

function fmtFirestore(ts: { seconds: number } | null | undefined): string {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtISO(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function last14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
}

function StatCard({ icon: Icon, label, value, color, note }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  note?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {note && <p className="text-[10px] text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState(false);

  const [stats, setStats] = useState<AdminStats>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getAdminData()
      .then(({ stats: s, users: u }) => { setStats(s); setUsers(u); })
      .catch(e => setError(e?.message ?? "Erreur de chargement. Vérifiez que la Cloud Function est déployée et que les règles Firestore sont à jour."))
      .finally(() => setLoading(false));
  };

  const login = () => {
    if (pwd === ADMIN_PWD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setPwdErr(false);
    } else {
      setPwdErr(true);
      setPwd("");
    }
  };

  useEffect(() => { if (authed) load(); }, [authed]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xs space-y-5">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Accès admin</h1>
            <p className="text-sm text-muted-foreground">Entrez le mot de passe pour continuer</p>
          </div>
          <Input
            type="password"
            placeholder="Mot de passe"
            value={pwd}
            autoFocus
            onChange={e => { setPwd(e.target.value); setPwdErr(false); }}
            onKeyDown={e => e.key === "Enter" && pwd && login()}
            className={pwdErr ? "border-destructive" : ""}
          />
          {pwdErr && <p className="text-xs text-destructive">Mot de passe incorrect.</p>}
          <Button className="w-full" onClick={login} disabled={!pwd}>Connexion</Button>
        </div>
      </div>
    );
  }

  const days = last14Days();
  const loginMax = Math.max(1, ...days.map(d => stats.logins?.[d] ?? 0));
  const totalLogins14d = days.reduce((acc, d) => acc + (stats.logins?.[d] ?? 0), 0);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">Erreur de chargement</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={Users}
              label="Utilisateurs"
              value={users.length}
              color="bg-blue-500/10 text-blue-500"
            />
            <StatCard
              icon={Timer}
              label="Sessions créées"
              value={stats.totalSessions ?? 0}
              color="bg-purple-500/10 text-purple-500"
              note="depuis le déploiement"
            />
            <StatCard
              icon={Activity}
              label="Séries enregistrées"
              value={stats.totalSeries ?? 0}
              color="bg-emerald-500/10 text-emerald-500"
              note="depuis le déploiement"
            />
            <StatCard
              icon={TrendingUp}
              label="Connexions (14j)"
              value={totalLogins14d}
              color="bg-orange-500/10 text-orange-500"
            />
          </div>

          {/* Graphique connexions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold">Connexions — 14 derniers jours</p>
            <div className="flex items-end gap-1 h-28">
              {days.map(day => {
                const count = stats.logins?.[day] ?? 0;
                const pct = Math.round((count / loginMax) * 100);
                const label = day.slice(5).replace("-", "/");
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{count || ""}</span>
                    <div
                      className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors"
                      style={{ height: `${Math.max(3, pct)}%` }}
                    />
                    <span className="text-[8px] text-muted-foreground leading-none">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tableau utilisateurs */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">Tous les utilisateurs</p>
              <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{users.length}</span>
            </div>
            {users.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aucun utilisateur. Déployez la Cloud Function pour voir tous les comptes.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u, i) => {
                  const lastActive = u.lastSignIn
                    ? fmtISO(u.lastSignIn)
                    : fmtFirestore(u.lastSeen);
                  const createdLabel = u.createdAt
                    ? fmtISO(u.createdAt)
                    : fmtFirestore(u.firstSeen);
                  return (
                    <div key={u.uid} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="text-muted-foreground w-5 text-right shrink-0 text-xs">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{u.email ?? u.uid}</p>
                        {u.email && <p className="font-mono text-[10px] text-muted-foreground truncate">{u.uid}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">Créé le {createdLabel}</p>
                        <p className="text-xs text-muted-foreground">Actif le {lastActive}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
