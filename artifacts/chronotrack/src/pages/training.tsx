import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Timer, Trash2, ChevronDown, ChevronUp, ExternalLink, Users, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListTraining, useCreateTrainingPlan, useUpdateTrainingPlan, useDeleteTrainingPlan,
  useCreateSession, useListParticipants,
  getListTrainingQueryKey, getListSessionsQueryKey,
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

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: participants = [] } = useListParticipants();
  const createPlan = useCreateTrainingPlan();

  const [date, setDate] = useState(todayKey);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPids, setSelectedPids] = useState<Set<string>>(new Set());
  const [exercises, setExercises] = useState<DraftExercise[]>([newDraft()]);

  const togglePid = (id: string) =>
    setSelectedPids(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

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
      {participants.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Athlètes
          </label>
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
          </div>
        </div>
      )}

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

function PlanCard({ plan, participantNames }: { plan: TrainingPlan; participantNames: Map<string, string> }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(plan.date === todayKey);
  const updatePlan = useUpdateTrainingPlan();
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
        },
      });
      updatedExercises[i] = { ...ex, sessionId: result.id };
    }
    await updatePlan.mutateAsync({ id: plan.id, data: { exercises: updatedExercises } });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
  };

  const names = plan.participantIds
    .map(id => participantNames.get(id))
    .filter(Boolean)
    .join(", ");

  return (
    <div className={`rounded-xl border transition-colors ${isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen(v => !v)}
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
                {pendingCount} session{pendingCount > 1 ? "s" : ""} à créer
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{formatDate(plan.date)}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50">
          {/* Athlètes */}
          {names && (
            <div className="pt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>{names}</span>
            </div>
          )}

          {/* Notes */}
          {plan.notes && (
            <p className="text-xs text-muted-foreground italic">{plan.notes}</p>
          )}

          {/* Exercices */}
          {plan.exercises.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {plan.exercises.map((ex, i) => (
                <div
                  key={ex.id}
                  onClick={() => ex.needsChrono && ex.sessionId && navigate(`/sessions/${ex.sessionId}/chrono`)}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                    ex.needsChrono && ex.sessionId
                      ? "cursor-pointer hover:bg-primary/10 active:bg-primary/20"
                      : ""
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

          {/* Action */}
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Training() {
  const { data: plans = [], isLoading } = useListTraining();
  const { data: participants = [] } = useListParticipants();
  const deletePlan = useDeleteTrainingPlan();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const participantNames = new Map(participants.map(p => [p.id, p.name]));

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleDelete = async () => {
    for (const id of selected) await deletePlan.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    setSelected(new Set());
    setSelectionMode(false);
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
          {selectionMode && selected.size > 0 && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-destructive bg-destructive/10 hover:bg-destructive/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {selected.size}
            </button>
          )}
          <button
            onClick={() => { setSelectionMode(m => !m); setSelected(new Set()); }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
          >
            {selectionMode ? "Annuler" : "Sélectionner"}
          </button>
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Form */}
      {showForm && <AddForm onClose={() => setShowForm(false)} />}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {plans.length === 0 && !showForm && (
          <div className="text-center text-muted-foreground text-sm py-16">
            <Timer className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>Aucun entraînement planifié</p>
            <p className="text-xs mt-1 opacity-70">Appuyez sur "Ajouter" pour créer votre première séance</p>
          </div>
        )}

        {plans.map(plan => (
          <div key={plan.id} className="relative">
            {selectionMode && (
              <button
                onClick={() => toggleSelect(plan.id)}
                className="absolute top-3 left-3 z-10"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selected.has(plan.id) ? "bg-primary border-primary" : "border-muted-foreground bg-background"
                }`}>
                  {selected.has(plan.id) && <span className="text-primary-foreground text-xs">✓</span>}
                </div>
              </button>
            )}
            <div className={selectionMode ? "pl-8" : ""}>
              <PlanCard plan={plan} participantNames={participantNames} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
