import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Timer, FileText, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListTraining, useCreateTrainingEntry, useUpdateTrainingEntry,
  useDeleteTrainingEntry, useCreateSession,
  getListTrainingQueryKey, getListSessionsQueryKey,
  type TrainingEntry,
} from "@/lib/firebase-api";

const todayKey = new Date().toISOString().split("T")[0];

function formatDate(dateStr: string): string {
  if (dateStr === todayKey) return "Aujourd'hui";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function Training() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: entries = [], isLoading } = useListTraining();
  const createEntry = useCreateTrainingEntry();
  const updateEntry = useUpdateTrainingEntry();
  const deleteEntry = useDeleteTrainingEntry();
  const createSession = useCreateSession();

  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(todayKey);
  const [formTitle, setFormTitle] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formNeedsChrono, setFormNeedsChrono] = useState(false);
  const [formDist, setFormDist] = useState("");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const resetForm = () => {
    setFormDate(todayKey);
    setFormTitle("");
    setFormNotes("");
    setFormNeedsChrono(false);
    setFormDist("");
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formDate) return;
    await createEntry.mutateAsync({
      data: {
        date: formDate,
        title: formTitle.trim(),
        notes: formNotes.trim() || null,
        needsChrono: formNeedsChrono,
        dist: formNeedsChrono && formDist.trim() ? formDist.trim() : null,
        sessionId: null,
      },
    });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    resetForm();
    setShowForm(false);
  };

  const handleStartSession = async (entry: TrainingEntry) => {
    const result = await createSession.mutateAsync({
      data: {
        name: entry.title,
        date: entry.date,
        defaultDist: entry.dist ?? null,
      },
    });
    await updateEntry.mutateAsync({ id: entry.id, data: { sessionId: result.id } });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    qc.invalidateQueries({ queryKey: getListSessionsQueryKey() });
    navigate(`/sessions/${result.id}`);
  };

  const handleDelete = async () => {
    for (const id of selected) await deleteEntry.mutateAsync({ id });
    qc.invalidateQueries({ queryKey: getListTrainingQueryKey() });
    setSelected(new Set());
    setSelectionMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Chargement…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-semibold text-base">Programme</h2>
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
          <Button size="sm" onClick={() => { setShowForm(v => !v); if (showForm) resetForm(); }}>
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-4 border-b border-border bg-muted/30 space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Titre</label>
              <Input placeholder="Ex: Sprint 100m" value={formTitle} onChange={e => setFormTitle(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              placeholder="Description de la séance..."
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md resize-none h-20 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formNeedsChrono}
                onChange={e => setFormNeedsChrono(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-primary" />
                Nécessite un chronomètre
              </span>
            </label>
            {formNeedsChrono && (
              <Input
                placeholder="Distance (ex: 100)"
                value={formDist}
                onChange={e => setFormDist(e.target.value)}
                className="w-36"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!formTitle.trim() || !formDate || createEntry.isPending}>
              {createEntry.isPending ? "…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {entries.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-16">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>Aucun entraînement planifié</p>
            <p className="text-xs mt-1 opacity-70">Appuyez sur "Ajouter" pour commencer</p>
          </div>
        )}

        {entries.map(entry => {
          const isToday = entry.date === todayKey;
          const isSelected = selected.has(entry.id);

          return (
            <div
              key={entry.id}
              onClick={() => selectionMode && toggleSelect(entry.id)}
              className={[
                "rounded-xl border p-4 space-y-2 transition-colors",
                isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                selectionMode ? "cursor-pointer" : "",
                isSelected ? "ring-2 ring-primary" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(entry.id)}
                      onClick={e => e.stopPropagation()}
                      className="shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{entry.title}</span>
                      {entry.needsChrono && (
                        <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                          <Timer className="w-3 h-3" />
                          {entry.dist ? `${entry.dist}m` : "Chrono"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{formatDate(entry.date)}</p>
                  </div>
                </div>
                {isToday && (
                  <span className="shrink-0 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                    Aujourd'hui
                  </span>
                )}
              </div>

              {entry.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2">{entry.notes}</p>
              )}

              {!selectionMode && entry.needsChrono && (
                <div className="pt-1">
                  {entry.sessionId ? (
                    <button
                      onClick={() => navigate(`/sessions/${entry.sessionId}`)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Voir la session
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleStartSession(entry)}
                      disabled={createSession.isPending || updateEntry.isPending}
                    >
                      <Timer className="w-3.5 h-3.5 mr-1.5" />
                      {isToday ? "Démarrer la session d'aujourd'hui" : "Initialiser la session"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
