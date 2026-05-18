import { useParams } from "wouter";
import { useGetPublicShare } from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";
import { Clock } from "lucide-react";

export default function ShareView() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const { data, isLoading, error } = useGetPublicShare(token);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Clock className="w-8 h-8 text-primary animate-pulse" />
          <span className="text-sm">Chargement…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="font-bold text-lg">Lien invalide ou expiré</h2>
          <p className="text-sm text-muted-foreground">
            Ce lien de partage n'existe pas ou a expiré (durée de validité : 30 jours).
          </p>
        </div>
      </div>
    );
  }

  const expiresAt = data.expiresAt?.toDate?.();
  if (expiresAt && expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="font-bold text-lg">Lien expiré</h2>
          <p className="text-sm text-muted-foreground">
            Ce lien a expiré le {expiresAt.toLocaleDateString("fr-FR")}.
          </p>
        </div>
      </div>
    );
  }

  // Multi-distance share (new format)
  const distances = data.distances ?? (
    data.dist ? [{ dist: data.dist, times: (data.periods ?? []).map(p => ({ date: p.label, timeMs: p.avgMs, include: true })) }] : []
  );

  const totalTimes = distances.reduce((s, d) => s + d.times.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight">ChronoTrack</h1>
          <p className="text-xs text-muted-foreground">Performances partagées</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Athlete header */}
        <div className="flex items-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            {data.athleteName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-xl">{data.athleteName}</h2>
            <p className="text-sm text-muted-foreground">
              {distances.length} épreuve{distances.length > 1 ? "s" : ""} · {totalTimes} temps enregistré{totalTimes > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* One section per distance */}
        {distances.map(({ dist, times }) => {
          if (times.length === 0) return null;
          const best = Math.min(...times.map(t => t.timeMs));
          const worst = Math.max(...times.map(t => t.timeMs));
          const avg = Math.round(times.reduce((s, t) => s + t.timeMs, 0) / times.length);

          return (
            <div key={dist} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Distance header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="font-bold text-base">{dist} m</span>
                <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                  {times.length} temps
                </span>
              </div>

              {/* Times list */}
              <div className="divide-y divide-border">
                {times.map((t, i) => {
                  const isBest = t.timeMs === best;
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}</span>
                        <span className="text-xs text-muted-foreground">{t.date}</span>
                        {!t.include && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">exclu</span>
                        )}
                      </div>
                      <span className={`font-mono font-bold text-sm ${isBest ? "text-green-600" : ""}`}>
                        {isBest && <span className="text-[10px] mr-1">🏆</span>}
                        {formatTime(t.timeMs)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="border-t border-border px-4 py-3 grid grid-cols-3 gap-2 bg-muted/30">
                {[
                  { label: "Meilleur", value: formatTime(best), color: "text-green-600" },
                  { label: "Moyen", value: formatTime(avg), color: "" },
                  { label: "Pire", value: formatTime(worst), color: "text-red-500" },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                    <div className={`font-mono font-bold text-sm ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-center text-xs text-muted-foreground pb-4">
          Partagé via ChronoTrack
          {expiresAt && ` · Expire le ${expiresAt.toLocaleDateString("fr-FR")}`}
        </p>
      </div>
    </div>
  );
}
