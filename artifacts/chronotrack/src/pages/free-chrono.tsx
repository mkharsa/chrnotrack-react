import { useState, useRef, useCallback } from "react";
import { Flag, RotateCcw, Play, Square, Zap } from "lucide-react";

function pad(n: number) { return String(n).padStart(2, "0"); }

function fmt(ms: number) {
  return {
    m: pad(Math.floor(ms / 60000)),
    s: pad(Math.floor(ms / 1000) % 60),
    cs: pad(Math.floor(ms / 10) % 100),
  };
}

function fmtShort(ms: number) {
  const cs = pad(Math.floor(ms / 10) % 100);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return m > 0 ? `${pad(m)}:${pad(s)}.${cs}` : `${pad(s)}.${cs}`;
}

type Lap = { index: number; split: number; total: number };

export default function FreeChrono() {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [lapStart, setLapStart] = useState(0);

  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const baseRef = useRef<number>(0);
  const lapStartRef = useRef<number>(0);

  const tick = useCallback(() => {
    setElapsed(baseRef.current + Date.now() - startTimeRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleStartStop = () => {
    if (isRunning) {
      cancelAnimationFrame(rafRef.current);
      baseRef.current = baseRef.current + Date.now() - startTimeRef.current;
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    cancelAnimationFrame(rafRef.current);
    setIsRunning(false);
    setElapsed(0);
    setLaps([]);
    baseRef.current = 0;
    lapStartRef.current = 0;
    setLapStart(0);
  };

  const handleLap = () => {
    if (!isRunning) return;
    const split = elapsed - lapStartRef.current;
    setLaps(prev => [{ index: prev.length + 1, split, total: elapsed }, ...prev]);
    lapStartRef.current = elapsed;
    setLapStart(elapsed);
  };

  const { m, s, cs } = fmt(elapsed);
  const bestSplit = laps.length > 1 ? Math.min(...laps.map(l => l.split)) : null;
  const worstSplit = laps.length > 1 ? Math.max(...laps.map(l => l.split)) : null;
  const currentSplit = elapsed - lapStart;

  return (
    <div className="flex flex-col h-full bg-zinc-950 select-none text-white">

      {/* Timer zone */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">

        {/* Status badge */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest transition-all ${
          isRunning
            ? "border-green-500/50 bg-green-500/10 text-green-400 animate-pulse"
            : elapsed > 0
            ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
            : "border-zinc-700 bg-zinc-900 text-zinc-500"
        }`}>
          <Zap className="w-3 h-3 fill-current" />
          {isRunning ? "Chrono actif" : elapsed > 0 ? "En pause" : "Prêt"}
        </div>

        {/* Main time display */}
        <div className="text-center">
          <div className={`tabular-nums leading-none font-mono font-black transition-colors ${
            isRunning
              ? "text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.6)]"
              : elapsed > 0
              ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
              : "text-zinc-600"
          }`}>
            <span className="text-[72px] tracking-tight">{m}:{s}</span>
            <span className="text-[40px] opacity-70">.{cs}</span>
          </div>

          {/* Split indicator */}
          {laps.length > 0 && isRunning && (
            <div className="mt-3 text-sm text-zinc-400 font-mono tabular-nums">
              Tour {laps.length + 1} · <span className="text-green-400">+{fmtShort(currentSplit)}</span>
            </div>
          )}
        </div>

        {/* Lap count */}
        {laps.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <Flag className="w-3 h-3" />
            {laps.length} tour{laps.length > 1 ? "s" : ""}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-6">
          {/* Lap */}
          <button
            onClick={handleLap}
            disabled={!isRunning}
            className="w-16 h-16 rounded-full border-2 border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <Flag className="w-5 h-5" />
          </button>

          {/* Start / Stop */}
          <button
            onClick={handleStartStop}
            className={`w-24 h-24 rounded-full flex items-center justify-center font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-2xl ${
              isRunning
                ? "bg-red-600 hover:bg-red-500 shadow-red-600/40 text-white"
                : "bg-green-500 hover:bg-green-400 shadow-green-500/40 text-black"
            }`}
          >
            {isRunning ? (
              <div className="flex flex-col items-center gap-1">
                <Square className="w-5 h-5 fill-current" />
                <span className="text-[10px]">Stop</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Play className="w-5 h-5 fill-current" />
                <span className="text-[10px]">{elapsed > 0 ? "Suite" : "Start"}</span>
              </div>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            disabled={elapsed === 0}
            className="w-16 h-16 rounded-full border-2 border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 active:scale-95 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Laps list */}
      {laps.length > 0 && (
        <div className="border-t border-zinc-800 overflow-y-auto bg-zinc-950" style={{ maxHeight: "35vh" }}>
          <div className="px-5 py-2 flex justify-between text-[11px] text-zinc-600 font-medium uppercase tracking-wider border-b border-zinc-900">
            <span>Tour</span>
            <span>Split</span>
            <span>Total</span>
          </div>
          {laps.map(lap => {
            const isBest = bestSplit !== null && lap.split === bestSplit;
            const isWorst = worstSplit !== null && lap.split === worstSplit;
            return (
              <div
                key={lap.index}
                className={`px-5 py-3 flex justify-between items-center text-sm border-b border-zinc-900/60 ${
                  isBest ? "text-green-400"
                  : isWorst ? "text-red-400"
                  : "text-zinc-300"
                }`}
              >
                <span className="w-16 font-medium text-zinc-500">T{lap.index}</span>
                <span className="font-mono tabular-nums font-bold">
                  {fmtShort(lap.split)}
                  {isBest && <span className="ml-1.5 text-[10px] opacity-70">↑ meilleur</span>}
                  {isWorst && <span className="ml-1.5 text-[10px] opacity-70">↓ pire</span>}
                </span>
                <span className="font-mono tabular-nums text-zinc-600 text-xs w-16 text-right">
                  {fmtShort(lap.total)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
