import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useGetSession, useCreateSeries, getGetSessionQueryKey } from "@workspace/api-client-react";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Square, RotateCcw, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type RepRecord = {
  timeMs: number;
  laps: number[];
};

type ParticipantState = {
  spId: number;
  pid: number;
  name: string;
  running: boolean;
  startTime: number | null;
  currentMs: number;
  currentLaps: number[];
  reps: RepRecord[];
};

export default function Chrono() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0", 10);
  const { data: session } = useGetSession(sessionId);
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [distance, setDistance] = useState("");
  const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set());
  const createSeries = useCreateSeries();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (session && participants.length === 0) {
      setParticipants(
        session.participants.map(p => ({
          spId: p.id,
          pid: p.participantId ?? p.id,
          name: p.name,
          running: false,
          startTime: null,
          currentMs: 0,
          currentLaps: [],
          reps: [],
        }))
      );
      if (session.defaultDist) setDistance(session.defaultDist);
    }
  }, [session, participants.length]);

  // Shared interval for all running athletes
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      setParticipants(prev => {
        const anyRunning = prev.some(p => p.running);
        if (!anyRunning) return prev;
        return prev.map(p =>
          p.running && p.startTime !== null
            ? { ...p, currentMs: now - p.startTime }
            : p
        );
      });
    }, 16);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleStart = useCallback((spId: number) => {
    setParticipants(prev =>
      prev.map(p =>
        p.spId === spId
          ? { ...p, running: true, startTime: Date.now(), currentMs: 0, currentLaps: [] }
          : p
      )
    );
  }, []);

  const handleLap = useCallback((spId: number) => {
    setParticipants(prev =>
      prev.map(p => {
        if (p.spId !== spId || !p.running || p.startTime === null) return p;
        const elapsed = Date.now() - p.startTime;
        return { ...p, currentLaps: [...p.currentLaps, elapsed] };
      })
    );
  }, []);

  const handleStop = useCallback((spId: number) => {
    setParticipants(prev => {
      const p = prev.find(x => x.spId === spId);
      if (!p || !p.running || p.startTime === null || !session || !distance) return prev;
      const finalMs = Date.now() - p.startTime;
      const newRep: RepRecord = { timeMs: finalMs, laps: [...p.currentLaps, finalMs] };
      const updated = prev.map(x =>
        x.spId === spId
          ? { ...x, running: false, startTime: null, currentMs: finalMs, currentLaps: [], reps: [...x.reps, newRep] }
          : x
      );

      // Save series
      createSeries.mutate({
        data: {
          dateKey: session.date,
          sessionId: session.id,
          dist: distance,
          entries: [{ pid: p.pid, name: p.name, timeMs: finalMs, include: true }]
        }
      }, {
        onSuccess: () => {
          toast({ title: `Rép ${p.reps.length + 1} — ${p.name} : ${formatTime(finalMs)}` });
        }
      });

      return updated;
    });
  }, [session, distance, createSeries, toast]);

  const handleReset = () => {
    setParticipants(prev =>
      prev.map(p => ({ ...p, running: false, startTime: null, currentMs: 0, currentLaps: [], reps: [] }))
    );
  };

  const toggleRepExpanded = (key: string) => {
    setExpandedReps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!session) return null;

  const anyRunning = participants.some(p => p.running);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950 shrink-0">
        <div>
          <h2 className="font-bold text-base text-primary">{session.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Dist :</span>
            <Input
              value={distance}
              onChange={e => setDistance(e.target.value)}
              className="h-6 w-20 text-xs bg-zinc-900 border-zinc-800 font-mono text-primary"
              placeholder="400"
              disabled={anyRunning}
            />
            <span className="text-xs text-zinc-500">m</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={handleReset}
          disabled={anyRunning}
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Athletes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-6">
        {participants.map(p => (
          <AthleteCard
            key={p.spId}
            participant={p}
            onStart={handleStart}
            onStop={handleStop}
            onLap={handleLap}
            distanceDisabled={anyRunning && !p.running}
            expandedReps={expandedReps}
            onToggleRep={toggleRepExpanded}
          />
        ))}
        {participants.length === 0 && (
          <div className="text-center py-12 text-zinc-600 text-sm">
            Aucun athlète dans cette session.
          </div>
        )}
      </div>
    </div>
  );
}

function AthleteCard({
  participant: p,
  onStart,
  onStop,
  onLap,
  distanceDisabled,
  expandedReps,
  onToggleRep,
}: {
  participant: ParticipantState;
  onStart: (spId: number) => void;
  onStop: (spId: number) => void;
  onLap: (spId: number) => void;
  distanceDisabled: boolean;
  expandedReps: Set<string>;
  onToggleRep: (key: string) => void;
}) {
  const avgMs = p.reps.length > 0
    ? Math.round(p.reps.reduce((s, r) => s + r.timeMs, 0) / p.reps.length)
    : null;

  return (
    <div className={`rounded-xl border transition-all ${p.running ? 'border-primary/60 bg-primary/5 shadow-[0_0_20px_rgba(34,197,94,0.08)]' : 'border-zinc-800 bg-zinc-900/70'}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${p.running ? 'bg-primary text-black' : 'bg-zinc-800 text-zinc-400'}`}>
          {p.name.charAt(0).toUpperCase()}
        </div>

        {/* Name + timer */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{p.name}</div>
          <div className={`font-mono text-xl font-bold tabular-nums tracking-tight ${p.running ? 'text-primary' : 'text-zinc-500'}`}>
            {formatTime(p.running ? p.currentMs : (p.reps.length > 0 ? p.reps[p.reps.length - 1].timeMs : 0))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {p.running ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/20 h-9 px-3 font-mono text-xs"
                onClick={() => onLap(p.spId)}
              >
                <Flag className="w-3 h-3 mr-1" />
                LAP
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 px-3 font-bold text-xs uppercase tracking-wider"
                onClick={() => onStop(p.spId)}
              >
                <Square className="w-3 h-3 mr-1 fill-current" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="bg-primary text-black hover:bg-primary/90 h-9 px-4 font-bold text-xs uppercase tracking-wider"
              onClick={() => onStart(p.spId)}
            >
              <Play className="w-3 h-3 mr-1 fill-current" />
              {p.reps.length > 0 ? `Rép ${p.reps.length + 1}` : 'Start'}
            </Button>
          )}
        </div>
      </div>

      {/* Live laps during current rep */}
      {p.running && p.currentLaps.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {p.currentLaps.map((ms, i) => {
            const lapDuration = i === 0 ? ms : ms - p.currentLaps[i - 1];
            return (
              <span key={i} className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5">
                L{i + 1} {formatTime(lapDuration)} @ {formatTime(ms)}
              </span>
            );
          })}
        </div>
      )}

      {/* Completed reps */}
      {p.reps.length > 0 && (
        <div className="border-t border-zinc-800/60 px-3 pb-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              {p.reps.length} rép{p.reps.length > 1 ? "s" : ""}
            </span>
            {avgMs !== null && (
              <span className="text-xs font-mono text-green-400 font-semibold">
                Moy : {formatTime(avgMs)}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {p.reps.map((rep, i) => {
              const key = `${p.spId}-${i}`;
              const expanded = expandedReps.has(key);
              return (
                <div
                  key={i}
                  className="shrink-0 min-w-[80px] bg-zinc-800/60 border border-zinc-700/50 rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full px-3 py-2 flex flex-col items-center"
                    onClick={() => rep.laps.length > 1 && onToggleRep(key)}
                  >
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Rép {i + 1}</span>
                    <span className="font-mono text-sm font-bold text-zinc-200">{formatTime(rep.timeMs)}</span>
                    {rep.laps.length > 1 && (
                      <span className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-0.5">
                        {rep.laps.length} laps
                        {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </span>
                    )}
                  </button>
                  {expanded && rep.laps.length > 1 && (
                    <div className="px-2 pb-2 space-y-1 border-t border-zinc-700/40 pt-1">
                      {rep.laps.map((lapMs, li) => {
                        const dur = li === 0 ? lapMs : lapMs - rep.laps[li - 1];
                        return (
                          <div key={li} className="text-[10px] font-mono text-zinc-400 flex justify-between">
                            <span className="text-zinc-600">L{li + 1}</span>
                            <span>{formatTime(dur)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
