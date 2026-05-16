import { useState } from "react";
import { useGetProgression, useGetProgressionSummary, useListDistances } from "@workspace/api-client-react";
import { formatTime } from "@/lib/time";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function Progression() {
  const [groupBy, setGroupBy] = useState<'session'|'month'>('session');
  const [distance, setDistance] = useState<string>("400");
  
  const { data: distances } = useListDistances();
  const { data: summary, isLoading: isSummaryLoading } = useGetProgressionSummary();
  const { data: progression, isLoading: isProgLoading } = useGetProgression({ dist: distance, groupBy });

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-xl font-bold tracking-tight uppercase mb-4">Progression</h2>
        
        {/* Global Summary */}
        <div className="mb-6 space-y-2">
          {summary?.map(s => (
            <div key={s.participantId} className="flex justify-between items-center text-sm">
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground font-mono">{formatTime(s.globalAvgMs)} avg</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
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

          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as any)} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="session">Session</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isProgLoading ? (
          <div className="animate-pulse space-y-4">
             {[1, 2].map(i => <div key={i} className="h-40 bg-card rounded-lg" />)}
          </div>
        ) : progression?.map(p => (
          <div key={p.participantId} className="bg-card border border-card-border rounded-lg overflow-hidden">
            <div className="p-3 border-b border-card-border bg-card-foreground/5">
              <h3 className="font-bold text-primary">{p.name}</h3>
            </div>
            <div className="divide-y divide-card-border">
              {p.periods.map((period, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{period.label}</div>
                    <div className="text-xs text-muted-foreground">{period.count} trials</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base">{formatTime(period.avgMs)}</span>
                    <TrendIcon trend={period.trend} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'better' | 'worse' | 'same' | null | undefined }) {
  if (trend === 'better') return <TrendingDown className="w-4 h-4 text-green-500" />;
  if (trend === 'worse') return <TrendingUp className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-zinc-500" />;
}
