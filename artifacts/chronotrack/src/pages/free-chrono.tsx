import { useState, useRef, useCallback } from "react";
import { Flag, RotateCcw } from "lucide-react";

const R = 108;
const CIRC = 2 * Math.PI * R;

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
  const ringProgress = (elapsed % 60000) / 60000;
  const dashOffset = CIRC * (1 - ringProgress);

  const bestSplit = laps.length > 1 ? Math.min(...laps.map(l => l.split)) : null;
  const worstSplit = laps.length > 1 ? Math.max(...laps.map(l => l.split)) : null;

  const currentSplit = elapsed - lapStart;

  return (
    <div className="flex flex-col h-full bg-background select-none">

      {/* Timer zone */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10">

        {/* Ring */}
        <div className="relative flex items-center justify-center">
          <svg width="260" height="260" className="-rotate-90" aria-hidden>
            {/* Glow ring (running only) */}
            {isRunning && (
              <circle
                cx="130" cy="130" r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="14"
                strokeDasharray={`${CIRC}`}
                strokeDashoffset={dashOffset}
                className="text-primary opacity-20 blur-sm"
              />
            )}
            {/* Track */}
            <circle cx="130" cy="130" r={R} fill="none" stroke="currentColor" strokeWidth="5" className="text-border" />
            {/* Progress */}
            <circle
              cx="130" cy="130" r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${CIRC}`}
              strokeDashoffset={dashOffset}
              className={
                isRunning ? "text-primary"
                : elapsed > 0 ? "text-amber-400"
                : "text-transparent"
              }
              style={{ transition: isRunning ? "none" : "stroke 0.4s" }}
            />
            {/* Tick marks every 5s */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
              const x1 = 130 + (R - 10) * Math.cos(angle);
              const y1 = 130 + (R - 10) * Math.sin(angle);
              const x2 = 130 + (R - 16) * Math.cos(angle);
              const y2 = 130 + (R - 16) * Math.sin(angle);
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1.5" className="text-border" />;
            })}
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className={`tabular-nums leading-none transition-colors ${
              isRunning ? "text-foreground" : elapsed > 0 ? "text-amber-400" : "text-muted-foreground"
            }`}>
              <span className="text-[52px] font-extralight tracking-tight font-mono">{m}:{s}</span>
              <span className="text-[28px] font-extralight font-mono opacity-60">.{cs}</span>
            </div>
            {laps.length > 0 && isRunning && (
              <div className="text-xs text-muted-foreground font-mono tabular-nums">
                Tour {laps.length + 1} · +{fmtShort(currentSplit)}
              </div>
            )}
            {!isRunning && elapsed === 0 && (
              <div className="text-xs text-muted-foreground">Prêt</div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-8">
          {/* Lap */}
          <button
            onClick={handleLap}
            disabled={!isRunning}
            className="w-14 h-14 rounded-full border-2 border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground active:scale-95 transition-all disabled:opacity-25 disabled:pointer-events-none shadow-sm"
          >
            <Flag className="w-5 h-5" />
          </button>

          {/* Start / Stop */}
          <button
            onClick={handleStartStop}
            className={`w-[88px] h-[88px] rounded-full flex items-center justify-center font-semibold text-sm text-white active:scale-95 transition-all shadow-xl ${
              isRunning
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/40"
                : "bg-primary hover:bg-primary/90 shadow-primary/40"
            }`}
          >
            {isRunning ? "Stop" : elapsed > 0 ? "Reprendre" : "Démarrer"}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            disabled={elapsed === 0}
            className="w-14 h-14 rounded-full border-2 border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground active:scale-95 transition-all disabled:opacity-25 disabled:pointer-events-none shadow-sm"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Laps list */}
      {laps.length > 0 && (
        <div className="border-t border-border overflow-y-auto" style={{ maxHeight: "38vh" }}>
          <div className="px-5 py-2 flex justify-between text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
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
                className={`px-5 py-3 flex justify-between items-center text-sm border-t border-border/40 ${
                  isBest ? "bg-green-500/8 text-green-500"
                  : isWorst ? "bg-red-500/8 text-red-400"
                  : "text-foreground"
                }`}
              >
                <span className="w-16 font-medium">Tour {lap.index}</span>
                <span className="font-mono tabular-nums">
                  {fmtShort(lap.split)}
                  {isBest && <span className="ml-1.5 text-[10px] opacity-70">↑ meilleur</span>}
                  {isWorst && <span className="ml-1.5 text-[10px] opacity-70">↓ pire</span>}
                </span>
                <span className="font-mono tabular-nums text-muted-foreground text-xs w-16 text-right">
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
