import { useState, useEffect } from "react";
import { Users, Timer, Activity, TrendingUp, Lock, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminStats, getAdminUsers } from "@/lib/admin-tracking";

const SESSION_KEY = "ct_admin_auth";
const ADMIN_PWD = "aboudi";

function fmt(ts: { seconds: number } | null | undefined): string {
  if (!ts?.seconds) return "—";
  return new Date(ts.seconds * 1000).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

type Stats = {
  userCount?: number;
  totalSessions?: number;
  totalSeries?: number;
  logins?: Record<string, number>;
};

type AdminUser = {
  uid: string;
  firstSeen?: { seconds: number };
  lastSeen?: { seconds: number };
};

function last14Days(): string[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().slice(0, 10);
  });
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  const [stats, setStats] = useState<Stats>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  const login = () => {
    if (pwd === ADMIN_PWD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setErr(false);
    } else {
      setErr(true);
      setPwd("");
    }
  };

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    Promise.all([getAdminStats(), getAdminUsers()])
      .then(([s, u]) => { setStats(s as Stats); setUsers(u as AdminUser[]); })
      .finally(() => setLoading(false));
  }, [authed]);

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
            onChange={e => { setPwd(e.target.value); setErr(false); }}
            onKeyDown={e => e.key === "Enter" && pwd && login()}
            className={err ? "border-destructive" : ""}
          />
          {err && <p className="text-xs text-destructive">Mot de passe incorrect.</p>}
          <Button className="w-full" onClick={login} disabled={!pwd}>Connexion</Button>
        </div>
      </div>
    );
  }

  const days = last14Days();
  const loginMax = Math.max(1, ...days.map(d => stats.logins?.[d] ?? 0));

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Tableau de bord admin</h1>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground animate-pulse">Chargement des données…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon={Users} label="Utilisateurs uniques" value={stats.userCount ?? 0} color="bg-blue-500/10 text-blue-500" />
            <StatCard icon={Timer} label="Sessions créées" value={stats.totalSessions ?? 0} color="bg-purple-500/10 text-purple-500" />
            <StatCard icon={Activity} label="Séries enregistrées" value={stats.totalSeries ?? 0} color="bg-emerald-500/10 text-emerald-500" />
            <StatCard icon={TrendingUp} label="Connexions (14j)" value={days.reduce((acc, d) => acc + (stats.logins?.[d] ?? 0), 0)} color="bg-orange-500/10 text-orange-500" />
          </div>

          {/* Login bar chart */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold">Connexions — 14 derniers jours</p>
            <div className="flex items-end gap-1 h-24">
              {days.map(day => {
                const count = stats.logins?.[day] ?? 0;
                const pct = Math.round((count / loginMax) * 100);
                const label = day.slice(5); // MM-DD
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                    <div
                      className="w-full rounded-t-sm bg-primary/70 transition-all"
                      style={{ height: `${Math.max(2, pct)}%` }}
                    />
                    <span className="text-[8px] text-muted-foreground rotate-0 leading-none">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Users table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Utilisateurs ({users.length})</p>
            </div>
            {users.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Aucun utilisateur encore enregistré.</p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u, i) => (
                  <div key={u.uid} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                    <span className="font-mono text-xs text-muted-foreground truncate flex-1">{u.uid}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Vu le {fmt(u.lastSeen)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
