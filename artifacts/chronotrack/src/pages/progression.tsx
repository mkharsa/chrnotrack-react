import { useState } from "react";
import { useGetProgression, useGetProgressionSummary, useListDistances } from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

type TooltipPayloadEntry = {
  dataKey: string;
  color: string;
  name: string;
  value: number;
};

const ATHLETE_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
];

function msToSec(ms: number) {
  return Math.round(ms / 10) / 100;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: TooltipPayloadEntry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name} :</span>
          <span className="font-mono font-bold" style={{ color: entry.color }}>
            {formatTime(Math.round(entry.value * 1000))}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Progression() {
  const [groupBy, setGroupBy] = useState<"session" | "month">("session");
  const [distance, setDistance] = useState<string>("400");

  const { data: distances } = useListDistances();
  const { data: summary } = useGetProgressionSummary();
  const { data: progression, isLoading: isProgLoading } = useGetProgression({ dist: distance, groupBy });

  // Build chart data: one row per period, one key per athlete
  const chartData = (() => {
    if (!progression || progression.length === 0) return [];
    // Collect all unique period labels in order
    const allLabels: string[] = [];
    for (const p of progression) {
      for (const period of p.periods) {
        if (!allLabels.includes(period.label)) allLabels.push(period.label);
      }
    }
    return allLabels.map(label => {
      const row: Record<string, number | string> = { label };
      for (const p of progression) {
        const period = p.periods.find(x => x.label === label);
        if (period) row[p.name] = msToSec(period.avgMs);
      }
      return row;
    });
  })();

  const hasChart = chartData.length >= 1 && progression && progression.length > 0;
  const isEvolution = chartData.length >= 2;

  // For single-period: one bar per athlete
  const barData = (() => {
    if (!progression || chartData.length !== 1) return [];
    return progression.map((p, i) => ({
      name: p.name,
      value: p.periods[0] ? msToSec(p.periods[0].avgMs) : null,
      color: ATHLETE_COLORS[i % ATHLETE_COLORS.length],
      avgMs: p.periods[0]?.avgMs ?? 0,
    })).filter(d => d.value !== null);
  })();

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-xl font-bold tracking-tight uppercase mb-4">Progression</h2>

        {/* Résumé global */}
        {summary && summary.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {summary.map(s => (
              <div key={s.participantId} className="flex justify-between items-center text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground font-mono">{formatTime(s.globalAvgMs)} moy.</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 flex-wrap">
          <Select value={distance} onValueChange={setDistance}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              {distances?.map(d => (
                <SelectItem key={d} value={d}>{d}m</SelectItem>
              ))}
              {(!distances || distances.length === 0) && (
                <SelectItem value="400">400m</SelectItem>
              )}
            </SelectContent>
          </Select>

          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as "session" | "month")} className="w-[220px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="session">Par séance</TabsTrigger>
              <TabsTrigger value="month">Par mois</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isProgLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-56 bg-card rounded-xl" />
            {[1, 2].map(i => <div key={i} className="h-32 bg-card rounded-lg" />)}
          </div>
        ) : progression?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aucune donnée pour cette distance.
          </div>
        ) : (
          <>
            {/* ── Graphique ── */}
            {hasChart && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
                  {isEvolution ? `Évolution — ${distance}m` : `Comparaison — ${distance}m`}
                </p>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Temps en secondes · plus bas = meilleur
                </p>

                {isEvolution ? (
                  /* ── Courbe d'évolution (≥2 séances) ── */
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}s`}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {progression && progression.length > 1 && (
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                          formatter={(value) => (
                            <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>
                          )}
                        />
                      )}
                      {progression?.map((p, i) => (
                        <Line
                          key={p.participantId}
                          type="monotone"
                          dataKey={p.name}
                          stroke={ATHLETE_COLORS[i % ATHLETE_COLORS.length]}
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  /* ── Barres comparatives (1 seule séance) ── */
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}s`}
                        domain={[0, "auto"]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
                              <p className="font-semibold mb-1">{d.name}</p>
                              <p className="font-mono font-bold" style={{ color: d.color }}>
                                {formatTime(d.avgMs)}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* ── Carte + graphique individuel par athlète ── */}
            {progression?.map((p, athleteIdx) => {
              const color = ATHLETE_COLORS[athleteIdx % ATHLETE_COLORS.length];
              const miniData = p.periods.map(period => ({
                label: period.label,
                value: msToSec(period.avgMs),
                avgMs: period.avgMs,
              }));
              const hasEnoughForLine = miniData.length >= 2;
              const best = p.periods.reduce<number | null>((min, period) =>
                min === null || period.avgMs < min ? period.avgMs : min, null);
              return (
                <div key={p.participantId} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* En-tête athlète */}
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: color }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-bold text-base">{p.name}</h3>
                    </div>
                    {best !== null && (
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Meilleur</div>
                        <div className="font-mono text-sm font-bold text-green-600">{formatTime(best)}</div>
                      </div>
                    )}
                  </div>

                  {/* Mini graphique individuel */}
                  {hasEnoughForLine ? (
                    <div className="px-2 pb-2">
                      <ResponsiveContainer width="100%" height={110}>
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
                                  <p className="font-mono font-bold" style={{ color }}>
                                    {formatTime(payload[0].payload.avgMs)}
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 3.5, fill: color, strokeWidth: 0 }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    /* Si 1 seule période — pas de courbe, juste le temps en grand */
                    miniData.length === 1 && (
                      <div className="px-4 pb-3 flex items-center gap-3">
                        <div className="font-mono text-3xl font-bold" style={{ color }}>
                          {formatTime(miniData[0].avgMs)}
                        </div>
                        <div className="text-xs text-muted-foreground">{miniData[0].label}</div>
                      </div>
                    )
                  )}

                  {/* Tableau des périodes */}
                  <div className="border-t border-border divide-y divide-border">
                    {p.periods.map((period, idx) => (
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
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "better" | "worse" | "same" | null | undefined }) {
  if (trend === "better") return <TrendingDown className="w-4 h-4 text-green-500" />;
  if (trend === "worse") return <TrendingUp className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}
