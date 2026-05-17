import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { useListSeries, useUpdateSeries, useDeleteSeries } from "@workspace/api-client-react";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function CalendarView() {
  const [date, setDate] = useState<Date>(new Date());

  const dateKey = format(date, "yyyy-MM-dd");
  const { data: seriesList, isLoading } = useListSeries({ dateKey });

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border bg-card flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => d && setDate(d)}
          locale={fr}
          className="rounded-md border-none"
        />
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <h2 className="text-xl font-bold tracking-tight uppercase mb-4">
          Séries du {format(date, "d MMMM yyyy", { locale: fr })}
        </h2>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2].map(i => <div key={i} className="h-32 bg-card rounded-lg" />)}
          </div>
        ) : seriesList?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Aucune série enregistrée ce jour-là.</p>
          </div>
        ) : (
          seriesList?.map(series => (
            <SeriesCard key={series.id} series={series} />
          ))
        )}
      </div>
    </div>
  );
}

function SeriesCard({ series }: { series: any }) {
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleInclude = (pid: number, currentInclude: boolean) => {
    const newEntries = series.entries.map((e: any) =>
      e.pid === pid ? { ...e, include: !currentInclude } : e
    );

    updateSeries.mutate({
      id: series.id,
      data: { entries: newEntries }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
      }
    });
  };

  const handleDelete = () => {
    deleteSeries.mutate({ id: series.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast({ title: "Série supprimée" });
      }
    });
  };

  return (
    <div className="bg-card border border-card-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-card-border bg-card-foreground/5 flex justify-between items-center">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-lg text-primary">{series.dist}m</span>
          <span className="text-xs text-muted-foreground">Série #{series.id}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="divide-y divide-card-border">
        {series.entries.map((entry: any) => (
          <div key={entry.pid} className={`p-3 flex items-center justify-between ${!entry.include ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleInclude(entry.pid, entry.include)} className="text-muted-foreground hover:text-foreground transition-colors">
                {entry.include ? <CheckCircle className="w-5 h-5 text-primary" /> : <XCircle className="w-5 h-5" />}
              </button>
              <span className="font-medium">{entry.name}</span>
            </div>
            <span className="font-mono">{formatTime(entry.timeMs)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
