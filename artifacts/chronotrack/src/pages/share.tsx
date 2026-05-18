import { useParams } from "wouter";
import { useGetPublicShare } from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";
import { Clock, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function msToSec(ms: number) {
  return Math.round(ms / 10) / 100;
}

function TrendIcon({ trend }: { trend: "better" | "worse" | "same" | null | undefined }) {
  if (trend === "better") return <TrendingDown className="w-4 h-4 text-green-500" />;
  if (trend === "worse") return <TrendingUp className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

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

  // Check expiration
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
            Ce lien de partage a expiré le {expiresAt.toLocaleDateString("fr-FR")}.
          </p>
        </div>
      </div>
    );
  }

  const miniData = data.periods.map((p) => ({
    label: p.label,
    value: msToSec(p.avgMs),
    avgMs: p.avgMs,
  }));
  const hasEnoughForLine = miniData.length >= 2;
  const best = data.periods.reduce<number | null>(
    (min, p) => (min === null || p.avgMs < min ? p.avgMs : min),
    null
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight">ChronoTrack</h1>
          <p className="text-xs text-muted-foreground">Progression partagée</p>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Athlete card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-base">
                {data.athleteName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-base">{data.athleteName}</h2>
                <p className="text-xs text-muted-foreground">{data.dist}m</p>
              </div>
            </div>
            {best !== null && (
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Meilleur</div>
                <div className="font-mono text-sm font-bold text-green-600">{formatTime(best)}</div>
              </div>
            )}
          </div>

          {/* Chart */}
          {hasEnoughForLine && (
            <div className="px-2 pb-2">
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={miniData} margin={{ top: 6, right: 12, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}s`}
                    domain={["auto", "auto"]}
                    width={36}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-card border border-border rounded-lg shadow-lg p-2 text-xs">
                          <p className="text-muted-foreground mb-0.5">{label}</p>
                          <p className="font-mono font-bold text-primary">
                            {formatTime(payload[0].payload.avgMs)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!hasEnoughForLine && miniData.length === 1 && (
            <div className="px-4 pb-3 flex items-center gap-3">
              <div className="font-mono text-3xl font-bold text-primary">
                {formatTime(miniData[0].avgMs)}
              </div>
              <div className="text-xs text-muted-foreground">{miniData[0].label}</div>
            </div>
          )}

          {/* Periods table */}
          <div className="border-t border-border divide-y divide-border">
            {data.periods.map((period, idx) => (
              <div key={idx} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div className="flex-1">
                  <div className="font-medium text-sm">{period.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {period.count} essai{period.count > 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{formatTime(period.avgMs)}</span>
                  <TrendIcon trend={period.trend} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          Partagé via ChronoTrack ·{" "}
          {expiresAt && (
            <>Expire le {expiresAt.toLocaleDateString("fr-FR")}</>
          )}
        </p>
      </div>
    </div>
  );
}
