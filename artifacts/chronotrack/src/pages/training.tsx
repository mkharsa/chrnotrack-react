import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Timer, Trash2, ChevronDown, ChevronUp, ExternalLink, Users, X, Archive, RotateCcw, MoreVertical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useListTraining, useCreateTrainingPlan, useUpdateTrainingPlan, useDeleteTrainingPlan,
  useCreateSession, useListParticipants, useCreateParticipant,
  useRegistry, useArchiveClub, useArchiveGroup, useUnarchiveClub, useUnarchiveGroup,
  getListTrainingQueryKey, getListSessionsQueryKey, getListParticipantsQueryKey, getRegistryQueryKey,
  type TrainingPlan, type TrainingExercise,
} from "@/lib/firebase-api";

const todayKey = new Date().toISOString().split("T")[0];

function formatDate(dateStr: string): string {
  if (dateStr === todayKey) return "Aujourd'hui";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

type DraftExercise = { id: string; name: string; needsChrono: boolean; dist: string };

function newDraft(): DraftExercise {
  return { id: crypto.randomUUID(), name: "", needsChrono: false, dist: "" };
}

// ─── Club / Group Select ──────────────────────────────────────────────────────

function ClubGroupSelect({
  value, onChange, suggestions, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder: string;
}) {
  const isCustom = value !== "" && !suggestions.includes(value);
  const [custom, setCustom] = useState(isCustom);

  useEffect(() => {
    setCustom(value !== "" && !suggestions.includes(value));
  }, [value, suggestions]);

  const selectValue = custom ? "__custom__" : (value !== "" ? value : "__none__");

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={v => {
          if (v === "__none__") { setCustom(false); onChange(""); }
          else if (v === "__custom__") { setCustom(true); onChange(""); }
          else { setCustom(false); onChange(v); }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">— Aucun —</SelectItem>
          {suggestions.map(s => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
          <SelectItem value="__custom__">✏️ Autre…</SelectItem>
        </SelectContent>
      </Select>
      {custom && (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="text-sm"
        />
      )}
    </div>
  );
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AutocompleteInput({
  value, onChange, suggestions, onArchive, placeholder, className,
}: {
  value: string; onChange: (v: string) => void;
  suggestions: string[];
  onArchive?: (name: string) => void;
  placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value);
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {filtered.map(s => (
            <div key={s} className="flex items-center group hover:bg-muted transition-colors">
              <button
                className="flex-1 text-left px-3 py-2.5 text-sm"
                onMouseDown={() => { onChange(s); setOpen(false); }}
              >
                {s}
              </button>
              {onArchive && (
                <button
                  title="Archiver (masquer des suggestions)"
                  className="px-3 py-2.5 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                  onMouseDown={e => { e.preventDefault(); onArchive(s); setOpen(false); }}
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddForm({ onClose, clubs, groups, onArchiveClub, onArchiveGroup }: {
  onClose: () => void;
  clubs: string[];
  groups: string[];
  onArchiveClub: (name: string) => void;
  onArchiveGroup: (name: string) => void;
}) {
  const qc = useQueryClient();
  const { data: participants = [] } = useListParticipants();
  const createPlan = useCreateTrainingPlan();
  const createParticipant = useCreateParticipant();

  const [date, setDate] = useState(todayKey);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [club, setClub] = useState("");
  const [group, setGroup] = useState("");
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<DraftExercise[]>([newDraft()]);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [showNewAthlete, setShowNewAthlete] = useState(false);

  const togglePid = (id: string) =>
    setSelectedPids(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) return;
    const result = await createParticipant.mutateAsync({ data: { name: newAthleteName.trim() } });
    qc.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
    setSelectedPids(prev => new Set(prev).add(result.id));
    setNewAthleteName("");
    setShowNewAthlete(false);
  };

  const updateEx = (id: string, patch: Partial<DraftExercise>) =>
    setExercises(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  const removeEx = (id: string) =>
    setExercises(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : prev);

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    const builtExercises: TrainingExercise[] = exercises
      .filter(e => e.name.trim())
      .map(e => ({
        id: e.id,
        name: e.name.trim(),
        needsChrono: e.needsChrono,
        dist: e.needsChrono && e.dist.trim() ? e.dist.trim() : null,
        sessionId: null,
      }));
    await createPlan.mutateAsync({
      data: {
        date,
        title: title.trim(),
        notes: notes.trim() || null,
        club: club.trim() || null,
        group: group.trim() || null,
        participantIds: Array.from(selectedPids),
        exercises: builtExercises,
      },
    });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    onClose();
  };

  return (
    <div className="px-4 py-4 border-b border-border bg-muted/30 space-y-4 shrink-0">
      {/* Date + Titre */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Date</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Titre de la séance</label>
          <Input placeholder="Ex: Vitesse — sprint" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
      </div>

      {/* Club + Groupe */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Club (optionnel)</label>
          <ClubGroupSelect value={club} onChange={setClub} suggestions={clubs} placeholder="Ex: CN Versailles" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Groupe (optionnel)</label>
          <ClubGroupSelect value={group} onChange={setGroup} suggestions={groups} placeholder="Ex: Seniors A" />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Notes (optionnel)</label>
        <textarea
          placeholder="Objectifs, consignes générales..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md resize-none h-16 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Athlètes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Athlètes
          </label>
          <button
            onClick={() => setShowNewAthlete(v => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" /> Nouvel athlète
          </button>
        </div>

        {showNewAthlete && (
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Nom de l'athlète"
              value={newAthleteName}
              onChange={e => setNewAthleteName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddAthlete()}
              className="flex-1 h-8 text-sm"
              autoFocus
            />
            <Button size="sm" className="h-8 px-3" onClick={handleAddAthlete} disabled={!newAthleteName.trim() || createParticipant.isPending}>
              {createParticipant.isPending ? "…" : "Ajouter"}
            </Button>
            <button onClick={() => { setShowNewAthlete(false); setNewAthleteName(""); }} className="text-muted-foreground hover:text-foreground px-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {participants.map(p => (
            <button
              key={p.id}
              onClick={() => togglePid(p.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedPids.has(p.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {p.name}
            </button>
          ))}
          {participants.length === 0 && !showNewAthlete && (
            <span className="text-xs text-muted-foreground italic">Aucun athlète — créez-en un ci-dessus</span>
          )}
        </div>
      </div>

      {/* Exercices */}
      <div>
        <label className="text-xs text-muted-foreground mb-2 block">Exercices</label>
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <div key={ex.id} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
              <Input
                placeholder="Ex: Sprint 100m"
                value={ex.name}
                onChange={e => updateEx(ex.id, { name: e.target.value })}
                className="flex-1"
              />
              <label className="flex items-center gap-1 shrink-0 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ex.needsChrono}
                  onChange={e => updateEx(ex.id, { needsChrono: e.target.checked })}
                  className="rounded"
                />
                <Timer className="w-3.5 h-3.5 text-primary" />
              </label>
              {ex.needsChrono && (
                <Input
                  placeholder="Dist."
                  value={ex.dist}
                  onChange={e => updateEx(ex.id, { dist: e.target.value })}
                  className="w-20"
                />
              )}
              <button
                onClick={() => removeEx(ex.id)}
                className="text-muted-foreground hover:text-destructive p-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setExercises(prev => [...prev, newDraft()])}
          className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter un exercice
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
        <Button size="sm" onClick={handleSave} disabled={!title.trim() || !date || createPlan.isPending}>
          {createPlan.isPending ? "…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan, participantNames, selected, onToggleSelect, allClubsSuggestions, allGroupsSuggestions,
}: {
  plan: TrainingPlan;
  participantNames: Map<string, string>;
  selected: boolean;
  onToggleSelect: () => void;
  allClubsSuggestions: string[];
  allGroupsSuggestions: string[];
}) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(plan.date === todayKey);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editClub, setEditClub] = useState(plan.club ?? "");
  const [editGroup, setEditGroup] = useState(plan.group ?? "");
  const updatePlan = useUpdateTrainingPlan();
  const deletePlan = useDeleteTrainingPlan();
  const createSession = useCreateSession();

  const chronoExercises = plan.exercises.filter(e => e.needsChrono);
  const pendingCount = chronoExercises.filter(e => !e.sessionId).length;
  const isToday = plan.date === todayKey;

  const handleInitAll = async () => {
    const updatedExercises = [...plan.exercises];
    for (let i = 0; i < updatedExercises.length; i++) {
      const ex = updatedExercises[i];
      if (!ex.needsChrono || ex.sessionId) continue;
      const result = await createSession.mutateAsync({
        data: {
          name: `${plan.title} — ${ex.name}`,
          date: plan.date,
          defaultDist: ex.dist ?? null,
          participantIds: plan.participantIds,
          club: plan.club ?? null,
          group: plan.group ?? null,
        },
      });
      updatedExercises[i] = { ...ex, sessionId: result.id };
    }
    await updatePlan.mutateAsync({ id: plan.id, data: { exercises: updatedExercises } });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
  };

  const handleDelete = () => {
    deletePlan.mutate({ id: plan.id }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
        setDeleteOpen(false);
      },
    });
  };

  const openEdit = () => {
    setEditClub(plan.club ?? "");
    setEditGroup(plan.group ?? "");
    setEditOpen(true);
  };

  useEffect(() => {
    if (editOpen) {
      setEditClub(plan.club ?? "");
      setEditGroup(plan.group ?? "");
    }
  }, [editOpen, plan.club, plan.group]);

  const handleEditSave = () => {
    updatePlan.mutate(
      { id: plan.id, data: { club: editClub.trim() || null, group: editGroup.trim() || null } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
          setEditOpen(false);
        },
      }
    );
  };

  const names = plan.participantIds
    .map(id => participantNames.get(id))
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div
        className={`rounded-xl border transition-colors ${
          selected ? "border-primary/40 bg-primary/5" : isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"
        }`}
      >
        {/* Header — checkbox + contenu cliquable + menu */}
        <div className="flex items-center px-3 py-3 gap-2">
          {/* Checkbox sélection */}
          <div onClick={e => e.stopPropagation()} className="shrink-0">
            <Checkbox
              checked={selected}
              onCheckedChange={onToggleSelect}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>

          {/* Zone cliquable = sélectionner OU expand */}
          <button
            className="flex-1 flex items-center justify-between text-left min-w-0 gap-2"
            onClick={onToggleSelect}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{plan.title}</span>
                {isToday && (
                  <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium shrink-0">
                    Aujourd'hui
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full shrink-0">
                    {pendingCount} à créer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <p className="text-xs text-muted-foreground capitalize">{formatDate(plan.date)}</p>
                {plan.club && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full">🏛 {plan.club}</span>}
                {plan.group && <span className="text-[10px] bg-violet-500/10 text-violet-600 px-1.5 py-0.5 rounded-full">👥 {plan.group}</span>}
              </div>
            </div>
          </button>

          {/* Bouton expand + menu */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setOpen(v => !v)}
            >
              {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={openEdit}>
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />
                  Modifier club/groupe
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Body */}
        {open && (
          <div className="px-4 pb-4 space-y-3 border-t border-border/50">
            {names && (
              <div className="pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{names}</span>
              </div>
            )}
            {plan.notes && (
              <p className="text-xs text-muted-foreground italic">{plan.notes}</p>
            )}
            {plan.exercises.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {plan.exercises.map((ex, i) => (
                  <div
                    key={ex.id}
                    onClick={() => ex.needsChrono && ex.sessionId && navigate(`/sessions/${ex.sessionId}/chrono`)}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                      ex.needsChrono && ex.sessionId ? "cursor-pointer hover:bg-primary/10 active:bg-primary/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                      <span className="text-sm truncate">{ex.name}</span>
                      {ex.needsChrono && (
                        <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                          <Timer className="w-3 h-3" />
                          {ex.dist ? `${ex.dist}m` : "Chrono"}
                        </span>
                      )}
                    </div>
                    {ex.needsChrono && ex.sessionId && (
                      <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
            {pendingCount > 0 && (
              <Button
                className="w-full mt-2"
                size="sm"
                onClick={handleInitAll}
                disabled={createSession.isPending || updatePlan.isPending}
              >
                <Timer className="w-3.5 h-3.5 mr-2" />
                {createSession.isPending || updatePlan.isPending
                  ? "Création en cours…"
                  : `Créer ${pendingCount > 1 ? `les ${pendingCount} sessions` : "la session"}`}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dialog modifier club/groupe */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Modifier l'entraînement</DialogTitle>
            <DialogDescription>« {plan.title} »</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Club</Label>
              <ClubGroupSelect value={editClub} onChange={setEditClub} suggestions={allClubsSuggestions} placeholder="ex: AC Bordeaux" />
            </div>
            <div className="grid gap-2">
              <Label>Groupe</Label>
              <ClubGroupSelect value={editGroup} onChange={setEditGroup} suggestions={allGroupsSuggestions} placeholder="ex: Seniors" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEditSave} disabled={updatePlan.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmation suppression */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Supprimer l'entraînement ?</DialogTitle>
            <DialogDescription>
              « {plan.title} » sera supprimé définitivement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePlan.isPending}>
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Training() {
  const { data: plans = [], isLoading } = useListTraining();
  const { data: participants = [] } = useListParticipants();
  const { data: registry } = useRegistry();
  const deletePlan = useDeleteTrainingPlan();
  const archiveClubMut = useArchiveClub();
  const archiveGroupMut = useArchiveGroup();
  const unarchiveClubMut = useUnarchiveClub();
  const unarchiveGroupMut = useUnarchiveGroup();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterClub, setFilterClub] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const archivedClubs = registry?.archivedClubs ?? [];
  const archivedGroups = registry?.archivedGroups ?? [];

  // All clubs/groups from plans, excluding archived ones for suggestions
  const allClubs = Array.from(new Set(plans.map(p => p.club).filter(Boolean) as string[]));
  const allGroups = Array.from(new Set(plans.map(p => p.group).filter(Boolean) as string[]));
  const clubs = allClubs.filter(c => !archivedClubs.includes(c));
  const groups = allGroups.filter(g => !archivedGroups.includes(g));
  const filteredPlans = plans.filter(p =>
    (!filterClub || p.club === filterClub) &&
    (!filterGroup || p.group === filterGroup)
  );

  const participantNames = new Map(participants.map(p => [p.id, p.name]));

  const handleArchiveClub = (name: string) => {
    archiveClubMut.mutate({ name }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getRegistryQueryKey() }),
    });
  };
  const handleArchiveGroup = (name: string) => {
    archiveGroupMut.mutate({ name }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getRegistryQueryKey() }),
    });
  };
  const handleUnarchiveClub = (name: string) => {
    unarchiveClubMut.mutate({ name }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getRegistryQueryKey() }),
    });
  };
  const handleUnarchiveGroup = (name: string) => {
    unarchiveGroupMut.mutate({ name }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getRegistryQueryKey() }),
    });
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleBulkDelete = async () => {
    for (const id of selected) await deletePlan.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    setSelected(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex-1 px-4 py-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-semibold text-base">Entraînement</h2>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer ({selected.size})
            </button>
          )}
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <AddForm
          onClose={() => setShowForm(false)}
          clubs={clubs}
          groups={groups}
          onArchiveClub={handleArchiveClub}
          onArchiveGroup={handleArchiveGroup}
        />
      )}

      {/* Filters */}
      {(clubs.length > 0 || groups.length > 0 || archivedClubs.length > 0 || archivedGroups.length > 0) && (
        <div className="px-4 py-2 border-b border-border bg-muted/20">
          <div className="flex flex-wrap gap-2">
            {clubs.map(c => (
              <button key={c} onClick={() => setFilterClub(filterClub === c ? null : c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${filterClub === c ? "bg-blue-500 text-white shadow-blue-500/30" : "bg-background border border-border text-muted-foreground hover:border-blue-400"}`}>
                🏛 {c}
              </button>
            ))}
            {groups.map(g => (
              <button key={g} onClick={() => setFilterGroup(filterGroup === g ? null : g)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${filterGroup === g ? "bg-violet-500 text-white shadow-violet-500/30" : "bg-background border border-border text-muted-foreground hover:border-violet-400"}`}>
                👥 {g}
              </button>
            ))}
            {(archivedClubs.length > 0 || archivedGroups.length > 0) && (
              <button
                onClick={() => setShowArchived(v => !v)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-dashed border-border text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Archive className="w-3 h-3" />
                Archivés ({archivedClubs.length + archivedGroups.length})
              </button>
            )}
          </div>

          {/* Archived items — restore panel */}
          {showArchived && (archivedClubs.length > 0 || archivedGroups.length > 0) && (
            <div className="mt-2 p-3 bg-muted/40 rounded-xl border border-dashed border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                Éléments archivés — cliquez pour restaurer
              </p>
              <div className="flex flex-wrap gap-2">
                {archivedClubs.map(c => (
                  <button key={c} onClick={() => handleUnarchiveClub(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-dashed border-blue-400/50 text-blue-400 hover:bg-blue-500/10 transition-colors">
                    <RotateCcw className="w-3 h-3" />
                    🏛 {c}
                  </button>
                ))}
                {archivedGroups.map(g => (
                  <button key={g} onClick={() => handleUnarchiveGroup(g)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-dashed border-violet-400/50 text-violet-400 hover:bg-violet-500/10 transition-colors">
                    <RotateCcw className="w-3 h-3" />
                    👥 {g}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filteredPlans.length === 0 && !showForm && (
          <div className="text-center text-muted-foreground text-sm py-16">
            <Timer className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>Aucun entraînement planifié</p>
            <p className="text-xs mt-1 opacity-70">Appuyez sur "Ajouter" pour créer votre première séance</p>
          </div>
        )}

        {filteredPlans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            participantNames={participantNames}
            selected={selected.has(plan.id)}
            onToggleSelect={() => toggleSelect(plan.id)}
            allClubsSuggestions={clubs}
            allGroupsSuggestions={groups}
          />
        ))}
      </div>
    </div>
  );
}
