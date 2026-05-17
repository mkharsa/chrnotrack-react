import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  useListSeries, getListSeriesQueryKey,
  type Series,
} from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";
import { useQueryClient } from "@tanstack/react-query";

export default function CalendarView() {
  const [date, setDate] = useState<Date>(new Date());

  const dateKey = format(date, "yyyy-MM-dd");
  const { data: seriesList, isLoading } = useListSeries({ dateKey });
  const { data: allSeries } = useListSeries();

  const datesWithData = useMemo(() => {
    if (!allSeries) return [];
    const dateKeys = new Set(allSeries.map(s => s.dateKey));
    return Array.from(dateKeys).map(dk => {
      const [y, m, d] = dk.split("-").map(Number);
      return new Date(y, m - 1, d);
    });
  }, [allSeries]);

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Calendrier */}
      <div className="p-4 bg-card border-b border-border flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          locale={fr}
          className="rounded-md border-none [--cell-size:2.5rem]"
          modifiers={{ hasData: datesWithData }}
          components={{
            DayButton: ({ day, modifiers, className, children, ...props }) => (
              <CalendarDayButton
                day={day}
                modifiers={modifiers}
                className={modifiers.hasData ? `${className ?? ""} relative` : className}
                {...props}
              >
                {children}
                {modifiers.hasData && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </CalendarDayButton>
            ),
          }}
        />
      </div>

      {/* Résumé du jour */}
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {format(date, "EEEE d MMMM yyyy", { locale: fr })}
        </h2>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map(i => <div key={i} className="h-16 bg-card rounded-xl" />)}
          </div>
        ) : !seriesList || seriesList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune série enregistrée ce jour-là.
          </div>
        ) : (
          <DailySummary seriesList={seriesList} dateKey={dateKey} />
        )}
      </div>
    </div>
  );
}

type AthleteAvg = {
  key: string;
  pid: string;
  name: string;
  dist: string;
  avgMs: number;
  count: number;
};

function DailySummary({ seriesList, dateKey }: { seriesList: Series[]; dateKey: string }) {
  const queryClient = useQueryClient();

  const athletes = useMemo((): AthleteAvg[] => {
    const map = new Map<string, { name: string; dist: string; times: number[] }>();
    for (const series of seriesList) {
      for (const entry of series.entries) {
        if (!entry.include) continue;
        const key = `${entry.pid}::${series.dist}`;
        if (!map.has(key)) map.set(key, { name: entry.name, dist: series.dist, times: [] });
        map.get(key)!.times.push(entry.timeMs);
      }
    }
    return Array.from(map.entries()).map(([key, { name, dist, times }]) => ({
      key,
      pid: key.split("::")[0],
      name,
      dist,
      avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      count: times.length,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [seriesList]);

  if (athletes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Aucune entrée validée ce jour-là.
      </div>
    );
  }

  const distances = [...new Set(athletes.map(a => a.dist))];

  return (
    <div className="space-y-4">
      {distances.map(dist => {
        const group = athletes.filter(a => a.dist === dist);
        const sorted = [...group].sort((a, b) => a.avgMs - b.avgMs);
        return (
          <div key={dist} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <span className="font-bold text-primary text-base">{dist}m</span>
              <span className="text-xs text-muted-foreground">
                {group.length} athlète{group.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y divide-border">
              {sorted.map((a, idx) => (
                <div key={a.key} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">{idx + 1}</span>
                  <div className="flex-1">
                    <span className="font-medium">{a.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {a.count} essai{a.count > 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="font-mono font-bold tabular-nums">{formatTime(a.avgMs)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
