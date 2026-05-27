import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useGetSession, useCreateSeries, useAddSessionParticipant, useListParticipants, useCreateParticipant, useUpdateSession, getGetSessionQueryKey } from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Square, RotateCcw, Flag, ChevronDown, ChevronUp, Timer, UserPlus, Plus, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type RepRecord = {
  timeMs: number;
  laps: number[];
};

type ParticipantState = {
  spId: string;
  pid: string;
  name: string;
  selected: boolean;
  running: boolean;
  startTime: number | null;
  currentMs: number;
  currentLaps: number[];
  reps: RepRecord[];
  // Departure interval timer — starts with each rep, keeps running after stop
  splitStartTime: number | null;
  splitMs: number;
};

export default function Chrono() {
  const { id } = useParams();
  const sessionId = id || "";
  const { data: session } = useGetSession(sessionId);
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [distance, setDistance] = useState("");
  const [expandedReps, setExpandedReps] = useState<Set<string>>(new Set());

  // General session timer
  const [globalRunning, setGlobalRunning] = useState(false);
  const [globalStartTime, setGlobalStartTime] = useState<number | null>(null);
  const [globalMs, setGlobalMs] = useState(0);

  const createSeries = useCreateSeries();
  const updateSession = useUpdateSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);
  const distSaveTimer = useRef<number | null>(null);

  // Add a new athlete to the local state (called after successful API add)
  const addAthleteToLocal = useCallback((spId: string, pid: string, name: string) => {
    setParticipants(prev => {
      if (prev.some(p => p.spId === spId)) return prev;
      return [...prev, { spId, pid, name, selected: false, running: false, startTime: null, currentMs: 0, currentLaps: [], reps: [], splitStartTime: null, splitMs: 0 }];
    });
    queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(sessionId) });
  }, [queryClient, sessionId]);

  useEffect(() => {
    if (session && participants.length === 0) {
      const saved = sessionId ? localStorage.getItem(`chrono-${sessionId}`) : null;
      const savedReps: Record<string, RepRecord[]> = saved ? (JSON.parse(saved).repsMap ?? {}) : {};
      setParticipants(
        session.participants.map(p => {
          const reps = savedReps[p.id] ?? [];
          return {
            spId: p.id,
            pid: p.participantId ?? p.id,
            name: p.name,
            selected: false,
            running: false,
            startTime: null,
            currentMs: reps.length > 0 ? reps[reps.length - 1].timeMs : 0,
            currentLaps: [],
            reps,
            splitStartTime: null,
            splitMs: 0,
          };
        })
      );
      if (session.defaultDist) setDistance(session.defaultDist);
    }
  }, [session, participants.length, sessionId]);

  // Single shared interval — ticks global timer + all running/split athletes
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const now = Date.now();
      if (globalRunning && globalStartTime !== null) {
        setGlobalMs(now - globalStartTime);
      }
      setParticipants(prev => {
        const hasActive = prev.some(p => p.running || p.splitStartTime !== null);
        if (!hasActive) return prev;
        return prev.map(p => ({
          ...p,
          currentMs: p.running && p.startTime !== null ? now - p.startTime : p.currentMs,
          splitMs: p.splitStartTime !== null ? now - p.splitStartTime : p.splitMs,
        }));
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

  // ── Save series to Firestore ──────────────────────────────────────────

  const saveSeries = useCallback((pid: string, name: string, timeMs: number, repIndex: number) => {
    if (!session || !distance) return;
    createSeries.mutate({
      data: {
        dateKey: session.date,
        sessionId: session.id,
        dist: distance,
        entries: [{ pid, name, timeMs, include: true }],
      }
    }, {
      onSuccess: () => {
        const storedLang = localStorage.getItem("ct_lang");
        const repWord = storedLang === "en" ? `Rep ${repIndex}` : `Rép ${repIndex}`;
        toast({ title: `${repWord} — ${name} : ${formatTime(timeMs)}` });
      },
    });
  }, [session, distance, createSeries, toast]);

  const saveRepsToStorage = useCallback((updated: ParticipantState[]) => {
    if (!sessionId) return;
    const repsMap: Record<string, RepRecord[]> = {};
    updated.forEach(p => { repsMap[p.spId] = p.reps; });
    localStorage.setItem(`chrono-${sessionId}`, JSON.stringify({ repsMap }));
  }, [sessionId]);

  // ── Individual athlete controls ───────────────────────────────────────

  const startOne = useCallback((spId: string) => {
    const now = Date.now();
    setParticipants(prev =>
      prev.map(p =>
        p.spId === spId
          ? { ...p, running: true, startTime: now, currentMs: 0, currentLaps: [], splitStartTime: now, splitMs: 0 }
          : p
      )
    );
  }, []);

  const lapOne = useCallback((spId: string) => {
    setParticipants(prev =>
      prev.map(p => {
        if (p.spId !== spId || !p.running || p.startTime === null) return p;
        return { ...p, currentLaps: [...p.currentLaps, Date.now() - p.startTime] };
      })
    );
  }, []);

  const stopOne = useCallback((spId: string) => {
    setParticipants(prev => {
      const p = prev.find(x => x.spId === spId);
      if (!p || !p.running || p.startTime === null) return prev;
      const finalMs = Date.now() - p.startTime;
      const newRep: RepRecord = { timeMs: finalMs, laps: [...p.currentLaps, finalMs] };
      saveSeries(p.pid, p.name, finalMs, p.reps.length + 1);
      const next = prev.map(x =>
        x.spId === spId
          ? { ...x, running: false, startTime: null, currentMs: finalMs, currentLaps: [], reps: [...x.reps, newRep] }
          : x
      );
      saveRepsToStorage(next);
      return next;
    });
  }, [saveSeries, saveRepsToStorage]);

  // ── Group controls ────────────────────────────────────────────────────

  const selectedParticipants = participants.filter(p => p.selected);
  const selectedNotRunning = selectedParticipants.filter(p => !p.running);
  const selectedRunning = selectedParticipants.filter(p => p.running);

  const startSelected = () => {
    const now = Date.now();
    setParticipants(prev =>
      prev.map(p =>
        p.selected && !p.running
          ? { ...p, running: true, startTime: now, currentMs: 0, currentLaps: [], splitStartTime: now, splitMs: 0 }
          : p
      )
    );
  };

  const stopSelected = () => {
    const now = Date.now();
    setParticipants(prev => {
      const next = prev.map(p => {
        if (!p.selected || !p.running || p.startTime === null) return p;
        const finalMs = now - p.startTime;
        const newRep: RepRecord = { timeMs: finalMs, laps: [...p.currentLaps, finalMs] };
        saveSeries(p.pid, p.name, finalMs, p.reps.length + 1);
        return { ...p, running: false, startTime: null, currentMs: finalMs, currentLaps: [], reps: [...p.reps, newRep] };
      });
      saveRepsToStorage(next);
      return next;
    });
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

  const toggleSelect = (spId: string) => {
    setParticipants(prev =>
      prev.map(p => p.spId === spId ? { ...p, selected: !p.selected } : p)
    );
  };

  const toggleSelectAll = () => {
    const allSelected = participants.every(p => p.selected);
    setParticipants(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const handleReset = () => {
    if (sessionId) localStorage.removeItem(`chrono-${sessionId}`);
    setParticipants(prev =>
      prev.map(p => ({ ...p, running: false, startTime: null, currentMs: 0, currentLaps: [], reps: [], selected: false, splitStartTime: null, splitMs: 0 }))
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
      <div className="shrink-0">
        {/* Session info bar */}
        <div className="px-4 pt-3 pb-2 border-b border-border bg-card flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-base text-primary truncate">{session.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider"><ChronoDistLabel /></span>
              <Input
                value={distance}
                onChange={e => {
                  const val = e.target.value;
                  setDistance(val);
                  // Debounce save to Firestore
                  if (distSaveTimer.current) clearTimeout(distSaveTimer.current);
                  distSaveTimer.current = window.setTimeout(() => {
                    if (sessionId && val.trim()) {
                      updateSession.mutate({ id: sessionId, data: { defaultDist: val.trim() } });
                    }
                  }, 800);
                }}
                className="h-6 w-20 text-xs font-mono text-primary"
                placeholder="400"
              />
              <span className="text-xs text-muted-foreground">m</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AddAthleteDialog sessionId={sessionId} onAdded={addAthleteToLocal} />
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              <ChronoResetLabel />
            </Button>
          </div>
        </div>

        {/* Dark sporty global timer */}
        <div className={`bg-zinc-950 border-b-2 transition-all ${
          globalRunning ? "border-green-500" : "border-zinc-800"
        }`}>
          <div className="px-4 pt-3 pb-2">
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className={`w-3.5 h-3.5 ${globalRunning ? "text-green-400" : "text-zinc-500"}`} />
                <span className={`text-[10px] uppercase tracking-widest font-bold ${globalRunning ? "text-zinc-400" : "text-zinc-600"}`}>
                  <ChronoSessionLabel />
                </span>
              </div>
              {globalRunning && (
                <div className="flex items-center gap-1.5 animate-pulse">
                  <Zap className="w-3 h-3 text-green-400 fill-green-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-400">
                    <ChronoActiveLabel />
                  </span>
                </div>
              )}
            </div>

            {/* Big timer + controls */}
            <div className="flex items-center justify-between gap-4">
              <div className={`font-mono font-black tabular-nums tracking-tight leading-none select-none ${
                globalRunning ? "text-green-400 text-5xl drop-shadow-[0_0_12px_rgba(74,222,128,0.5)]" : "text-white text-5xl"
              }`}>
                {formatTime(globalMs)}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!globalRunning ? (
                  <button
                    onClick={handleGlobalStart}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 text-black font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-500/30"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <ChronoStartLabel />
                  </button>
                ) : (
                  <button
                    onClick={handleGlobalStop}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-600/30"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <ChronoStopLabel />
                  </button>
                )}
                {globalMs > 0 && (
                  <button
                    onClick={handleGlobalReset}
                    className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Select-all row ── */}
      <SelectAllRow
        allSelected={allSelected}
        anySelected={anySelected}
        selectedCount={selectedParticipants.length}
        onToggleAll={toggleSelectAll}
      />

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
            splitMs={p.splitMs}
            hasSplit={p.splitStartTime !== null}
          />
        ))}
        {participants.length === 0 && (
          <NoAthleteMessage />
        )}
      </div>

      {/* ── Group action bar (sticky bottom) ── */}
      {anySelected && (
        <GroupActionBar
          selectedCount={selectedParticipants.length}
          selectedNotRunningCount={selectedNotRunning.length}
          selectedRunningCount={selectedRunning.length}
          onStartSelected={startSelected}
          onStopSelected={stopSelected}
          onLapSelected={lapSelected}
        />
      )}
    </div>
  );
}

// ── Small i18n helper components ─────────────────────────────────────────────

function ChronoDistLabel() { const t = useT(); return <>{t.distLabel}</>; }
function ChronoResetLabel() { const t = useT(); return <>{t.resetLabel}</>; }
function ChronoSessionLabel() { const t = useT(); return <>{t.chronoSession}</>; }
function ChronoActiveLabel() { const t = useT(); return <>{t.chronoActive}</>; }
function ChronoStartLabel() { const t = useT(); return <>{t.startLabel}</>; }
function ChronoStopLabel() { const t = useT(); return <>{t.stopLabel}</>; }

function SelectAllRow({ allSelected, anySelected, selectedCount, onToggleAll }: {
  allSelected: boolean;
  anySelected: boolean;
  selectedCount: number;
  onToggleAll: () => void;
}) {
  const t = useT();
  return (
    <div className="px-4 py-2 border-b border-border flex items-center gap-3 bg-muted/30 shrink-0">
      <Checkbox
        checked={allSelected}
        onCheckedChange={onToggleAll}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <span className="text-xs text-muted-foreground uppercase tracking-wider">
        {anySelected ? t.nSelected(selectedCount) : t.selectAll}
      </span>
    </div>
  );
}

function NoAthleteMessage() {
  const t = useT();
  return (
    <div className="text-center py-12 text-muted-foreground text-sm">
      {t.noAthleteInSession}
    </div>
  );
}

function GroupActionBar({ selectedCount, selectedNotRunningCount, selectedRunningCount, onStartSelected, onStopSelected, onLapSelected }: {
  selectedCount: number;
  selectedNotRunningCount: number;
  selectedRunningCount: number;
  onStartSelected: () => void;
  onStopSelected: () => void;
  onLapSelected: () => void;
}) {
  const t = useT();
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border p-3 flex items-center gap-2 shadow-lg">
      <span className="text-xs text-muted-foreground shrink-0 mr-1">
        {t.nAthletes(selectedCount)}
      </span>
      {selectedNotRunningCount > 0 && (
        <Button
          size="sm"
          className="flex-1 font-bold text-xs uppercase tracking-wider"
          onClick={onStartSelected}
        >
          <Play className="w-3 h-3 mr-1.5 fill-current" />
          {t.startN(selectedNotRunningCount)}
        </Button>
      )}
      {selectedRunningCount > 0 && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="text-primary border-primary/40 hover:bg-primary/10 font-mono text-xs"
            onClick={onLapSelected}
          >
            <Flag className="w-3 h-3 mr-1.5" />
            LAP
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="flex-1 font-bold text-xs uppercase tracking-wider"
            onClick={onStopSelected}
          >
            <Square className="w-3 h-3 mr-1.5 fill-current" />
            {t.stopN(selectedRunningCount)}
          </Button>
        </>
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
  splitMs,
  hasSplit,
}: {
  participant: ParticipantState;
  onStart: (spId: string) => void;
  onStop: (spId: string) => void;
  onLap: (spId: string) => void;
  onToggleSelect: (spId: string) => void;
  expandedReps: Set<string>;
  onToggleRep: (key: string) => void;
  splitMs: number;
  hasSplit: boolean;
}) {
  const t = useT();
  const avgMs =
    p.reps.length > 0
      ? Math.round(p.reps.reduce((s, r) => s + r.timeMs, 0) / p.reps.length)
      : null;

  const perfMs = p.running ? p.currentMs : p.reps.length > 0 ? p.reps[p.reps.length - 1].timeMs : 0;

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer select-none ${
        p.running
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : p.selected
          ? "border-primary/30 bg-primary/[0.03]"
          : "border-border bg-card"
      }`}
      onClick={() => onToggleSelect(p.spId)}
    >
      {/* ── Top row: avatar / name / buttons ── */}
      <div className="flex items-center gap-3 p-3 pb-2">
        <Checkbox
          checked={p.selected}
          onCheckedChange={() => onToggleSelect(p.spId)}
          onClick={e => e.stopPropagation()}
          className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
          p.running ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}>
          {p.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{p.name}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
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
              {p.reps.length > 0 ? t.repLabel(p.reps.length + 1) : t.startLabel}
            </Button>
          )}
        </div>
      </div>

      {/* ── Dual chrono row ── */}
      {hasSplit ? (
        <div className="mx-3 mb-3 grid grid-cols-2 gap-2">
          {/* Departure interval chrono */}
          <div className={`rounded-lg px-3 py-2 flex flex-col items-center border ${
            p.running
              ? "bg-blue-500/10 border-blue-500/30"
              : "bg-muted/60 border-border"
          }`}>
            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 mb-0.5">
              Départ
            </span>
            <span className={`font-mono text-lg font-black tabular-nums tracking-tight ${
              p.running ? "text-blue-400" : "text-blue-300/70"
            }`}>
              {formatTime(splitMs)}
            </span>
          </div>
          {/* Performance chrono */}
          <div className={`rounded-lg px-3 py-2 flex flex-col items-center border ${
            p.running
              ? "bg-primary/10 border-primary/30"
              : "bg-muted/60 border-border"
          }`}>
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary mb-0.5">
              Perf
            </span>
            <span className={`font-mono text-lg font-black tabular-nums tracking-tight ${
              p.running ? "text-primary" : "text-foreground"
            }`}>
              {formatTime(perfMs)}
            </span>
          </div>
        </div>
      ) : (
        /* No split yet — single timer (first start hasn't happened) */
        <div className="px-3 pb-3">
          <div className={`font-mono text-xl font-bold tabular-nums tracking-tight ${
            p.running ? "text-primary" : "text-muted-foreground"
          }`}>
            {formatTime(perfMs)}
          </div>
        </div>
      )}

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
              {t.reps(p.reps.length)}
            </span>
            {avgMs !== null && (
              <span className="text-xs font-mono text-primary font-semibold">{t.avg} : {formatTime(avgMs)}</span>
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

// ── Dialogue ajout d'athlète ──────────────────────────────────────────────

function AddAthleteDialog({
  sessionId,
  onAdded,
}: {
  sessionId: string;
  onAdded: (spId: string, pid: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set());
  const { data: allParticipants } = useListParticipants();
  const addToSession = useAddSessionParticipant();
  const createParticipant = useCreateParticipant();
  const { toast } = useToast();
  const t = useT();

  const togglePid = (pid: string) => {
    setSelectedPids(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  const handleAddExisting = async () => {
    for (const pid of selectedPids) {
      const p = allParticipants?.find(x => x.id === pid);
      if (!p) continue;
      await new Promise<void>(resolve => {
        addToSession.mutate(
          { id: sessionId, data: { participantId: pid, name: p.name } },
          {
            onSuccess: (sp) => {
              onAdded(sp.id, pid, p.name);
              toast({ title: t.athleteAddedToSession(p.name) });
              resolve();
            },
            onError: () => resolve(),
          }
        );
      });
    }
    setSelectedPids(new Set());
    setOpen(false);
  };

  const handleCreateAndAdd = () => {
    const name = newName.trim();
    if (!name) return;
    createParticipant.mutate(
      { data: { name } },
      {
        onSuccess: (created) => {
          addToSession.mutate(
            { id: sessionId, data: { participantId: created.id, name: created.name } },
            {
              onSuccess: (sp) => {
                onAdded(sp.id, created.id, created.name);
                toast({ title: t.athleteCreatedAndAdded(created.name) });
                setNewName("");
                setOpen(false);
              },
            }
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-primary/30 text-primary hover:bg-primary/10"
      >
        <UserPlus className="w-4 h-4 mr-1" />
        {t.addAthlete}
      </Button>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{t.addAthleteTitle}</DialogTitle>
        </DialogHeader>

        {/* Existing athletes */}
        {allParticipants && allParticipants.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              {t.existingAthletes}
            </Label>
            <div className="max-h-[180px] overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {allParticipants.map(p => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selectedPids.has(p.id)}
                    onCheckedChange={() => togglePid(p.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className="text-sm font-medium">{p.name}</span>
                </label>
              ))}
            </div>
            {selectedPids.size > 0 && (
              <Button
                className="w-full"
                onClick={handleAddExisting}
                disabled={addToSession.isPending}
              >
                <Plus className="w-4 h-4 mr-1" />
                {t.addNAthletes(selectedPids.size)}
              </Button>
            )}
          </div>
        )}

        {/* Separator */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t.or}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* New athlete */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t.newAthleteLabel}
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder={t.fullNamePlaceholder}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateAndAdd()}
              className="flex-1"
            />
            <Button
              onClick={handleCreateAndAdd}
              disabled={!newName.trim() || createParticipant.isPending || addToSession.isPending}
            >
              <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
