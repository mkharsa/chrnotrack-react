import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useGetSession, useCreateSeries } from "@workspace/api-client-react";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Play, Square, RotateCcw, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ParticipantState = {
  id: number;
  pid: number;
  name: string;
  selected: boolean;
  laps: number[]; // relative ms per lap for current rep
  repTimes: number[]; // total ms for each rep
};

export default function Chrono() {
  const { id } = useParams();
  const sessionId = parseInt(id || "0", 10);
  const { data: session } = useGetSession(sessionId);
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [distance, setDistance] = useState("");
  
  const timerRef = useRef<number | null>(null);
  const createSeries = useCreateSeries();
  const { toast } = useToast();

  useEffect(() => {
    if (session && participants.length === 0) {
      setParticipants(session.participants.map(p => ({
        id: p.id,
        pid: p.participantId,
        name: p.name,
        selected: true,
        laps: [],
        repTimes: []
      })));
      if (session.defaultDist) {
        setDistance(session.defaultDist);
      }
    }
  }, [session, participants.length]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - (startTime || 0));
      }, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, startTime]);

  const handleStart = () => {
    if (participants.filter(p => p.selected).length === 0) return;
    setIsRunning(true);
    setStartTime(Date.now());
    setCurrentTime(0);
    // clear laps for new rep
    setParticipants(prev => prev.map(p => ({
      ...p,
      laps: p.selected ? [] : p.laps
    })));
  };

  const handleLap = (pid: number) => {
    if (!isRunning) return;
    const now = Date.now();
    const elapsed = now - (startTime || 0);
    setParticipants(prev => prev.map(p => {
      if (p.pid === pid && p.selected) {
        return { ...p, laps: [...p.laps, elapsed] };
      }
      return p;
    }));
  };

  const handleStop = () => {
    if (!isRunning) return;
    setIsRunning(false);
    
    // Assign final time to selected participants who didn't lap at the end
    const finalTime = currentTime;
    const activeParticipants = participants.filter(p => p.selected);
    
    setParticipants(prev => prev.map(p => {
      if (p.selected) {
        const finalLap = p.laps.length > 0 ? p.laps[p.laps.length - 1] : finalTime;
        return { ...p, repTimes: [...p.repTimes, finalLap] };
      }
      return p;
    }));

    setRepCount(r => r + 1);

    // Save to backend
    if (!session || !distance) return;
    
    const entries = activeParticipants.map(p => ({
      pid: p.pid,
      name: p.name,
      timeMs: p.laps.length > 0 ? p.laps[p.laps.length - 1] : finalTime,
      include: true
    }));

    createSeries.mutate({
      data: {
        dateKey: session.date,
        sessionId: session.id,
        dist: distance,
        entries
      }
    }, {
      onSuccess: () => {
        toast({ title: `Rep ${repCount + 1} saved.` });
      }
    });
  };

  const handleReset = () => {
    setIsRunning(false);
    setStartTime(null);
    setCurrentTime(0);
    setRepCount(0);
    setParticipants(prev => prev.map(p => ({ ...p, laps: [], repTimes: [] })));
  };

  const toggleSelect = (pid: number) => {
    if (isRunning) return;
    setParticipants(prev => prev.map(p => p.pid === pid ? { ...p, selected: !p.selected } : p));
  };

  if (!session) return null;

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header Info */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-950">
        <div>
          <h2 className="font-bold text-lg text-primary">{session.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Distance:</span>
            <Input 
              value={distance} 
              onChange={e => setDistance(e.target.value)} 
              className="h-6 w-20 text-xs bg-zinc-900 border-zinc-800 font-mono text-primary"
              placeholder="e.g. 400"
              disabled={isRunning}
            />
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-bold tracking-tighter text-primary tabular-nums">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max p-4">
          <div className="flex gap-4">
            {/* Athletes Column */}
            <div className="w-48 shrink-0 space-y-2">
              <div className="h-8 text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center">
                Athletes
              </div>
              {participants.map(p => (
                <div key={p.pid} className={`h-14 flex items-center px-3 rounded-md border ${p.selected ? 'border-primary/50 bg-primary/5' : 'border-zinc-800 bg-zinc-900/50'} transition-colors`}>
                  <Checkbox 
                    checked={p.selected} 
                    onCheckedChange={() => toggleSelect(p.pid)}
                    disabled={isRunning}
                    className="mr-3 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                  <span className={`font-medium ${p.selected ? 'text-white' : 'text-zinc-500'} truncate`}>{p.name}</span>
                </div>
              ))}
            </div>

            {/* Rep Columns */}
            {Array.from({ length: repCount }).map((_, i) => (
              <div key={i} className="w-24 shrink-0 space-y-2">
                <div className="h-8 text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-center bg-zinc-900/50 rounded">
                  Rep {i + 1}
                </div>
                {participants.map(p => (
                  <div key={p.pid} className="h-14 flex items-center justify-center bg-zinc-900/30 rounded-md border border-zinc-800/50">
                    {p.repTimes[i] ? (
                      <span className="font-mono text-sm text-zinc-300">{formatTime(p.repTimes[i])}</span>
                    ) : (
                      <span className="text-zinc-700">-</span>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {/* Current Running Column */}
            {isRunning && (
              <div className="w-32 shrink-0 space-y-2">
                <div className="h-8 text-xs font-bold text-primary uppercase tracking-wider flex items-center justify-center bg-primary/10 rounded animate-pulse">
                  Running
                </div>
                {participants.map(p => (
                  <div key={p.pid} className="h-14 flex items-center justify-center">
                    {p.selected ? (
                      <Button 
                        variant="outline" 
                        className="w-full h-full border-primary/30 hover:bg-primary/20 text-primary font-mono text-sm shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                        onClick={() => handleLap(p.pid)}
                      >
                        <Flag className="w-3 h-3 mr-2" />
                        {p.laps.length > 0 ? formatTime(p.laps[p.laps.length - 1]) : "LAP"}
                      </Button>
                    ) : (
                      <div className="w-full h-full bg-zinc-900/30 rounded-md border border-zinc-800/50 flex items-center justify-center text-zinc-700">
                        -
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-zinc-950 border-t border-white/10 shrink-0 pb-safe">
        <div className="flex gap-2 max-w-md mx-auto">
          {!isRunning ? (
            <>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-16 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                onClick={handleReset}
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold uppercase tracking-wider"
                onClick={handleStart}
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                Start
              </Button>
            </>
          ) : (
            <Button 
              variant="destructive" 
              size="lg" 
              className="flex-1 text-lg font-bold uppercase tracking-wider"
              onClick={handleStop}
            >
              <Square className="w-5 h-5 mr-2 fill-current" />
              Stop & Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
