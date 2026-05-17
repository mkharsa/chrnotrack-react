import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useGetSession, useCreateSeries } from "@workspace/api-client-react";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Square, RotateCcw, Flag, ChevronDown, ChevronUp, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type RepRecord = {
  timeMs: number;
  laps: number[];
};

type ParticipantState = {
  spId: number;
  pid: number;
  name: string;
  selected: boolean;
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

  // General session timer
  const [globalRunning, setGlobalRunning] = useState(false);
  const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
  const [globalMs, setGlobalMs] = useState(0);

  const createSeries = useCreateSeries();
  const { toast } = useToast();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (session && participants.length === 0) {
      setParticipants(
        session.participants.map(p => ({
          spId: p.id,
          pid: p.participantId ?? p.id,
          name: p.name,
          selected: false,
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

  // Single shared interval — ticks global timer + all running athletes
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      if (globalRunning && globalStartTime !== null) {
        setGlobalMs(now - globalStartTime);
      }
      setParticipants(prev => {
        if (!prev.some(p => p.running)) return prev;
        return prev.map(p =>
          p.running && p.startTime !== null ? { ...p, currentMs: now - p.startTime } : p
        );
      });
    }, 16);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [globalRunning, globalStartTime]);

  // ── Global timer controls ─────────────────────────────────────────────

  const handleGlobalStart = () => {
    setGlobalRunning(true);
    setGlobalStartTime(Date.now());
    setGlobalMs(0);
  };

  const handleGlobalStop = () => {
    setGlobalRunning(false);
  };

  const handleGlobalReset = () => {
    setGlobalRunning(false);
    setGlobalStartTime(null);
    setGlobalMs(0);
  };

  // ── Save series to API + Firebase ─────────────────────────────────────

  const saveSeries = useCallback((pid: number, name: string, timeMs: number, repIndex: number) => {
    if (!session || !distance) return;
    createSeries.mutate({
      data: {
        dateKey: session.date,
        sessionId: session.id,
        dist: distance,
        entries: [{ pid, name, timeMs, include: true }]
      }
    }, {
      onSuccess: () => toast({ title: `Rép ${repIndex} — ${name} : ${formatTime(timeMs)}` })
    });
    addDoc(collection(db, "series"), {
      dateKey: session.date,
      sessionId: session.id,
      dist: distance,
      pid,
      name,
      timeMs,
      include: true,
      repIndex,
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }, [session, distance, createSeries, toast]);

  // ── Individual athlete controls ───────────────────────────────────────

  const startOne = useCallback((spId: number) => {
    setParticipants(prev =>
      prev.map(p =>
        p.spId === spId
          ? { ...p, running: true, startTime: Date.now(), currentMs: 0, currentLaps: [] }
          : p
      )
    );
  }, []);

  const lapOne = useCallback((spId: number) => {
    setParticipants(prev =>
      prev.map(p => {
        if (p.spId !== spId || !p.running || p.startTime === null) return p;
        return { ...p, currentLaps: [...p.currentLaps, Date.now() - p.startTime] };
      })
    );
  }, []);

  const stopOne = useCallback((spId: number) => {
    setParticipants(prev => {
      const p = prev.find(x => x.spId === spId);
      if (!p || !p.running || p.startTime === null) return prev;
      const finalMs = Date.now() - p.startTime;
      const newRep: RepRecord = { timeMs: finalMs, laps: [...p.currentLaps, finalMs] };
      saveSeries(p.pid, p.name, finalMs, p.reps.length + 1);
      return prev.map(x =>
        x.spId === spId
          ? { ...x, running: false, startTime: null, currentMs: finalMs, currentLaps: [], reps: [...x.reps, newRep] }
          : x
      );
    });
  }, [saveSeries]);

  // ── Group controls ────────────────────────────────────────────────────

  const selectedParticipants = participants.filter(p => p.selected);
  const selectedNotRunning = selectedParticipants.filter(p => !p.running);
  const selectedRunning = selectedParticipants.filter(p => p.running);

  const startSelected = () => {
    const now = Date.now();
    setParticipants(prev =>
      prev.map(p =>
        p.selected && !p.running
          ? { ...p, running: true, startTime: now, currentMs: 0, currentLaps: [] }
          : p
      )
    );
  };

  const stopSelected = () => {
    const now = Date.now();
    setParticipants(prev =>
      prev.map(p => {
        if (!p.selected || !p.running || p.startTime === null) return p;
        const finalMs = now - p.startTime;
        const newRep: RepRecord = { timeMs: finalMs, laps: [...p.currentLaps, finalMs] };
        saveSeries(p.pid, p.name, finalMs, p.reps.length + 1);
        return { ...p, running: false, startTime: null, currentMs: finalMs, currentLaps: [], reps: [...p.reps, newRep] };
      })
    );
  };

  const lapSelected = () => {
    const now = Date.now();
    setParticipants(prev =>
      prev.map(p => {
        if (!p.selected || !p.running || p.startTime === null) return p;
        return { ...p, currentLaps: [...p.currentLaps, now - p.startTime] };
      })
    );
  };

  const toggleSelect = (spId: number) => {
    setParticipants(prev =>
      prev.map(p => p.spId === spId ? { ...p, selected: !p.selected } : p)
    );
  };

  const toggleSelectAll = () => {
    const allSelected = participants.every(p => p.selected);
    setParticipants(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const handleReset = () => {
    setParticipants(prev =>
      prev.map(p => ({ ...p, running: false, startTime: null, currentMs: 0, currentLaps: [], reps: [], selected: false }))
    );
    handleGlobalReset();
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

  const anySelected = selectedParticipants.length > 0;
  const allSelected = participants.length > 0 && participants.every(p => p.selected);

  return (
    <div className="flex flex-col bg-background text-foreground min-h-full">
      {/* ── Session header + global timer ── */}
      <div className="p-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-base text-primary">{session.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Dist :</span>
              <Input
                value={distance}
                onChange={e => setDistance(e.target.value)}
                className="h-6 w-20 text-xs font-mono text-primary"
                placeholder="400"
              />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        {/* Global session timer */}
        <div className={`rounded-xl border p-3 flex items-center gap-4 transition-all ${
          globalRunning
            ? "border-amber-400/50 bg-amber-50 shadow-sm"
            : "border-border bg-muted/40"
        }`}>
          <div className="flex items-center gap-2 shrink-0">
            <Timer className={`w-4 h-4 ${globalRunning ? "text-amber-600" : "text-muted-foreground"}`} />
            <span className={`text-xs uppercase tracking-wider font-medium ${globalRunning ? "text-amber-700" : "text-muted-foreground"}`}>
              Chrono session
            </span>
          </div>
          <div className={`font-mono text-2xl font-bold tabular-nums tracking-tight flex-1 ${
            globalRunning ? "text-amber-700" : "text-muted-foreground"
          }`}>
            {formatTime(globalMs)}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!globalRunning ? (
              <Button
                size="sm"
                className="bg-amber-500 text-white hover:bg-amber-600 h-8 px-3 font-bold text-xs uppercase"
                onClick={handleGlobalStart}
              >
                <Play className="w-3 h-3 mr-1 fill-current" />
                Start
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-50 h-8 px-3 font-bold text-xs uppercase"
                onClick={handleGlobalStop}
              >
                <Square className="w-3 h-3 mr-1 fill-current" />
                Stop
              </Button>
            )}
            {globalMs > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleGlobalReset}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Select-all row ── */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-3 bg-muted/30 shrink-0">
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleSelectAll}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {anySelected
            ? `${selectedParticipants.length} sélectionné${selectedParticipants.length > 1 ? "s" : ""}`
            : "Tout sélectionner"}
        </span>
      </div>

      {/* ── Athletes list ── */}
      <div className="p-4 space-y-3 pb-6">
        {participants.map(p => (
          <AthleteCard
            key={p.spId}
            participant={p}
            onStart={startOne}
            onStop={stopOne}
            onLap={lapOne}
            onToggleSelect={toggleSelect}
            expandedReps={expandedReps}
            onToggleRep={toggleRepExpanded}
          />
        ))}
        {participants.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aucun athlète dans cette session.
          </div>
        )}
      </div>

      {/* ── Group action bar (sticky bottom) ── */}
      {anySelected && (
        <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-3 flex items-center gap-2 shadow-lg">
          <span className="text-xs text-muted-foreground shrink-0 mr-1">
            {selectedParticipants.length} athlète{selectedParticipants.length > 1 ? "s" : ""}
          </span>
          {selectedNotRunning.length > 0 && (
            <Button
              size="sm"
              className="flex-1 font-bold text-xs uppercase tracking-wider"
              onClick={startSelected}
            >
              <Play className="w-3 h-3 mr-1.5 fill-current" />
              Démarrer ({selectedNotRunning.length})
            </Button>
          )}
          {selectedRunning.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-primary border-primary/40 hover:bg-primary/10 font-mono text-xs"
                onClick={lapSelected}
              >
                <Flag className="w-3 h-3 mr-1.5" />
                LAP
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 font-bold text-xs uppercase tracking-wider"
                onClick={stopSelected}
              >
                <Square className="w-3 h-3 mr-1.5 fill-current" />
                Arrêter ({selectedRunning.length})
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AthleteCard({
  participant: p,
  onStart,
  onStop,
  onLap,
  onToggleSelect,
  expandedReps,
  onToggleRep,
}: {
  participant: ParticipantState;
  onStart: (spId: number) => void;
  onStop: (spId: number) => void;
  onLap: (spId: number) => void;
  onToggleSelect: (spId: number) => void;
  expandedReps: Set<string>;
  onToggleRep: (key: string) => void;
}) {
  const avgMs =
    p.reps.length > 0
      ? Math.round(p.reps.reduce((s, r) => s + r.timeMs, 0) / p.reps.length)
      : null;

  return (
    <div className={`rounded-xl border transition-all ${
      p.running
        ? "border-primary/40 bg-primary/5 shadow-sm"
        : p.selected
        ? "border-primary/30 bg-primary/[0.03]"
        : "border-border bg-card"
    }`}>
      <div className="flex items-center gap-3 p-3">
        <Checkbox
          checked={p.selected}
          onCheckedChange={() => onToggleSelect(p.spId)}
          className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
          p.running ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}>
          {p.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{p.name}</div>
          <div className={`font-mono text-xl font-bold tabular-nums tracking-tight ${
            p.running ? "text-primary" : "text-muted-foreground"
          }`}>
            {formatTime(p.running ? p.currentMs : p.reps.length > 0 ? p.reps[p.reps.length - 1].timeMs : 0)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.running ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10 h-9 px-3 font-mono text-xs"
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
              className="h-9 px-4 font-bold text-xs uppercase tracking-wider"
              onClick={() => onStart(p.spId)}
            >
              <Play className="w-3 h-3 mr-1 fill-current" />
              {p.reps.length > 0 ? `Rép ${p.reps.length + 1}` : "Start"}
            </Button>
          )}
        </div>
      </div>

      {/* Live laps */}
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
        <div className="border-t border-border px-3 pb-3 pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {p.reps.length} rép{p.reps.length > 1 ? "s" : ""}
            </span>
            {avgMs !== null && (
              <span className="text-xs font-mono text-primary font-semibold">Moy : {formatTime(avgMs)}</span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {p.reps.map((rep, i) => {
              const key = `${p.spId}-${i}`;
              const expanded = expandedReps.has(key);
              return (
                <div key={i} className="shrink-0 min-w-[80px] bg-muted border border-border rounded-lg overflow-hidden">
                  <button
                    className="w-full px-3 py-2 flex flex-col items-center"
                    onClick={() => rep.laps.length > 1 && onToggleRep(key)}
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Rép {i + 1}</span>
                    <span className="font-mono text-sm font-bold text-foreground">{formatTime(rep.timeMs)}</span>
                    {rep.laps.length > 1 && (
                      <span className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                        {rep.laps.length} laps
                        {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                      </span>
                    )}
                  </button>
                  {expanded && rep.laps.length > 1 && (
                    <div className="px-2 pb-2 space-y-1 border-t border-border pt-1">
                      {rep.laps.map((lapMs, li) => {
                        const dur = li === 0 ? lapMs : lapMs - rep.laps[li - 1];
                        return (
                          <div key={li} className="text-[10px] font-mono text-muted-foreground flex justify-between">
                            <span>L{li + 1}</span>
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
