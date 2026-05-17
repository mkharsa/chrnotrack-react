import { useState } from "react";
import { useListSessions, useBulkDeleteSessions, getListSessionsQueryKey, useCreateSession, useListParticipants, useCreateParticipant, getListParticipantsQueryKey } from "@workspace/api-client-react";
import {
  format, isToday, isThisWeek, isThisMonth, parseISO,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, Calendar as CalendarIcon, ChevronRight, UserPlus, List, ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { parseDistance } from "@/lib/time";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Session = {
  id: number;
  name: string;
  date: string;
  participantCount: number;
  defaultDist?: string | null;
};

type ViewMode = "list" | "calendar";

// ── Groupement des sessions pour la vue liste ───────────────────────────────

function groupSessions(sessions: Session[]) {
  const today: Session[] = [];
  const week: Session[] = [];
  const month: Session[] = [];
  const older: Session[] = [];

  for (const s of sessions) {
    const d = parseISO(s.date);
    if (isToday(d)) today.push(s);
    else if (isThisWeek(d, { locale: fr })) week.push(s);
    else if (isThisMonth(d)) month.push(s);
    else older.push(s);
  }

  return [
    { label: "Aujourd'hui", sessions: today },
    { label: "Cette semaine", sessions: week },
    { label: "Ce mois", sessions: month },
    { label: "Antérieur", sessions: older },
  ].filter(g => g.sessions.length > 0);
}

// ── Carte session ─────────────────────────────────────────────────────────

function SessionCard({
  session,
  selected,
  onToggle,
  onClick,
}: {
  session: Session;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className={`group flex items-center bg-card border rounded-xl p-4 cursor-pointer transition-all ${
        selected
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/20 hover:bg-muted/30"
      }`}
      onClick={onClick}
    >
      <div className="mr-3 shrink-0" onClick={e => { e.stopPropagation(); onToggle(); }}>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-bold text-base truncate">{session.name}</h3>
          <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">
            {format(parseISO(session.date), "d MMM yyyy", { locale: fr })}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{session.participantCount} athlète{session.participantCount !== 1 ? "s" : ""}</span>
          </div>
          {session.defaultDist && (
            <span className="font-mono text-primary font-medium">{session.defaultDist}m</span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-muted-foreground ml-3 shrink-0 group-hover:text-primary transition-colors" />
    </div>
  );
}

// ── Vue liste ─────────────────────────────────────────────────────────────

function ListView({
  sessions,
  selectedIds,
  onToggle,
  onToggleAll,
  onNavigate,
}: {
  sessions: Session[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onNavigate: (id: number) => void;
}) {
  const groups = groupSessions(sessions);
  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length;

  return (
    <div className="space-y-5 pb-6">
      <div
        className="flex items-center gap-3 px-1 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none"
        onClick={onToggleAll}
      >
        <Checkbox
          checked={allSelected}
          onCheckedChange={onToggleAll}
          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <span>Tout sélectionner</span>
      </div>

      {groups.map(group => (
        <div key={group.label}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{group.sessions.length}</span>
          </div>
          <div className="space-y-2">
            {group.sessions.map(s => (
              <SessionCard
                key={s.id}
                session={s}
                selected={selectedIds.has(s.id)}
                onToggle={() => onToggle(s.id)}
                onClick={() => onNavigate(s.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Vue calendrier ────────────────────────────────────────────────────────

function SessionsCalendarView({
  sessions,
  onNavigate,
}: {
  sessions: Session[];
  onNavigate: (id: number) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: fr });
  const calEnd = endOfWeek(monthEnd, { locale: fr });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const sessionsByDate = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = s.date;
    if (!sessionsByDate.has(key)) sessionsByDate.set(key, []);
    sessionsByDate.get(key)!.push(s);
  }

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const selectedDaySessions = selectedDay
    ? sessions.filter(s => isSameDay(parseISO(s.date), selectedDay))
    : [];

  return (
    <div className="space-y-4 pb-6">
      {/* Navigation mois */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDay(null); }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-sm capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDay(null); }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Jours de semaine */}
        <div className="grid grid-cols-7 border-b border-border">
          {dayNames.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-2 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grille des jours */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const daySessions = sessionsByDate.get(key) ?? [];
            const inMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const hasSession = daySessions.length > 0;
            const isCurrentDay = isToday(day);

            return (
              <button
                key={i}
                className={`relative flex flex-col items-center justify-center py-2.5 text-sm transition-colors min-h-[52px] ${
                  !inMonth ? "opacity-30" : ""
                } ${
                  isSelected
                    ? "bg-primary/10"
                    : hasSession
                    ? "hover:bg-primary/5 cursor-pointer"
                    : "cursor-default"
                }`}
                onClick={() => {
                  if (!inMonth) return;
                  setSelectedDay(isSelected ? null : day);
                }}
                disabled={!inMonth}
              >
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isCurrentDay
                    ? "bg-primary text-primary-foreground font-bold"
                    : isSelected
                    ? "bg-primary/20 text-primary font-semibold"
                    : "text-foreground"
                }`}>
                  {format(day, "d")}
                </span>
                {hasSession && (
                  <div className="flex gap-0.5 mt-1">
                    {daySessions.slice(0, 3).map((_, si) => (
                      <span
                        key={si}
                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary" : "bg-primary/60"}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions du jour sélectionné */}
      {selectedDay && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {format(selectedDay, "EEEE d MMMM", { locale: fr })}
            </span>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{selectedDaySessions.length} session{selectedDaySessions.length > 1 ? "s" : ""}</span>
          </div>
          {selectedDaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune session ce jour-là.</p>
          ) : (
            <div className="space-y-2">
              {selectedDaySessions.map(s => (
                <SessionCard
                  key={s.id}
                  session={s}
                  selected={false}
                  onToggle={() => {}}
                  onClick={() => onNavigate(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Résumé du mois */}
      {!selectedDay && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">
            Ce mois — {format(currentMonth, "MMMM", { locale: fr })}
          </p>
          {(() => {
            const monthSessions = sessions.filter(s => {
              const d = parseISO(s.date);
              return isSameMonth(d, currentMonth);
            });
            if (monthSessions.length === 0)
              return <p className="text-sm text-muted-foreground">Aucune session ce mois.</p>;
            return (
              <div className="space-y-2">
                {monthSessions.map(s => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    selected={false}
                    onToggle={() => {}}
                    onClick={() => onNavigate(s.id)}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Page principale Sessions ──────────────────────────────────────────────

export default function Sessions() {
  const { data: sessions, isLoading } = useListSessions();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const bulkDelete = useBulkDeleteSessions();
  const { toast } = useToast();

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (sessions && selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else if (sessions) {
      setSelectedIds(new Set(sessions.map(s => s.id)));
    }
  };

  const handleDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDelete.mutate({ data: { ids: Array.from(selectedIds) } }, {
      onSuccess: () => {
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        toast({ title: `${selectedIds.size} session${selectedIds.size > 1 ? "s" : ""} supprimée${selectedIds.size > 1 ? "s" : ""}` });
      }
    });
  };

  const navigateTo = (id: number) => setLocation(`/sessions/${id}/chrono`);

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-card shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold tracking-tight uppercase">Sessions</h2>
          <CreateSessionDialog />
        </div>

        {/* Toggle vue */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setViewMode("list")}
          >
            <List className="w-3.5 h-3.5" />
            Liste
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setViewMode("calendar")}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendrier
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card rounded-xl" />)}
          </div>
        ) : sessions?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="bg-card inline-flex p-4 rounded-full mb-4 border border-border">
              <CalendarIcon className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Aucune session</p>
            <p className="text-xs text-muted-foreground">Créez votre première session d'entraînement.</p>
          </div>
        ) : viewMode === "list" ? (
          <ListView
            sessions={sessions ?? []}
            selectedIds={selectedIds}
            onToggle={toggleSelect}
            onToggleAll={toggleAll}
            onNavigate={navigateTo}
          />
        ) : (
          <SessionsCalendarView
            sessions={sessions ?? []}
            onNavigate={navigateTo}
          />
        )}
      </div>

      {/* Barre de suppression */}
      {selectedIds.size > 0 && viewMode === "list" && (
        <div className="shrink-0 bg-destructive/95 text-destructive-foreground px-4 py-3 flex justify-between items-center shadow-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-white/20 text-white font-semibold"
            onClick={handleDelete}
            disabled={bulkDelete.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Dialogue de création ──────────────────────────────────────────────────

function CreateSessionDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data: participants } = useListParticipants();
  const [selectedParticipants, setSelectedParticipants] = useState<Set<number>>(new Set());
  const [newAthleteeName, setNewAthleteName] = useState("");
  const createSession = useCreateSession();
  const createParticipant = useCreateParticipant();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!name || !date) return;
    const defaultDist = parseDistance(name);
    createSession.mutate({
      data: { name, date, defaultDist, participantIds: Array.from(selectedParticipants) }
    }, {
      onSuccess: (res) => {
        setOpen(false);
        setName("");
        setSelectedParticipants(new Set());
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        setLocation(`/sessions/${res.id}/chrono`);
      }
    });
  };

  const handleAddAthlete = () => {
    const trimmed = newAthleteeName.trim();
    if (!trimmed) return;
    createParticipant.mutate({ data: { name: trimmed } }, {
      onSuccess: (created) => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        setNewAthleteName("");
        setSelectedParticipants(prev => new Set([...prev, created.id]));
        toast({ title: `Athlète "${created.name}" ajouté` });
      }
    });
  };

  const toggleP = (id: number) => {
    setSelectedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="font-bold">
          <Plus className="w-4 h-4 mr-1" />
          NOUVELLE SESSION
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer une session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nom de la session (ex : 10x400m)</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="10x400m" className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2 mt-2">
            <Label>Athlètes</Label>
            <div className="max-h-[160px] overflow-y-auto space-y-2 border border-border rounded-md p-2">
              {participants?.map(p => (
                <div key={p.id} className="flex items-center space-x-2">
                  <Checkbox id={`p-${p.id}`} checked={selectedParticipants.has(p.id)} onCheckedChange={() => toggleP(p.id)} />
                  <Label htmlFor={`p-${p.id}`} className="flex-1 cursor-pointer font-normal">{p.name}</Label>
                </div>
              ))}
              {participants?.length === 0 && (
                <div className="text-sm text-muted-foreground p-2">Aucun athlète. Ajoutez-en ci-dessous.</div>
              )}
            </div>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Nouveau nom d'athlète..."
                value={newAthleteeName}
                onChange={e => setNewAthleteName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddAthlete()}
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddAthlete}
                disabled={!newAthleteeName.trim() || createParticipant.isPending}
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleCreate} disabled={!name || !date || createSession.isPending}>
            Créer et démarrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
