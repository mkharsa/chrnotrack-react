import { useState } from "react";
import {
  useListParticipants,
  useCreateParticipant,
  useDeleteParticipant,
  useUpdateParticipant,
  useListSeries,
  getListParticipantsQueryKey,
} from "@/lib/firebase-api";
import { formatTime } from "@/lib/time";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, UserPlus, Users, Pencil, Check, X, ChevronDown, ChevronRight, TrendingDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n";

// ── Historique d'un athlète ───────────────────────────────────────────────────

function AthleteHistory({ pid }: { pid: string }) {
  const { data: allSeries, isLoading } = useListSeries();
  const t = useT();

  if (isLoading) {
    return (
      <div className="px-4 py-3 animate-pulse space-y-2 border-t border-border">
        {[1, 2].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
      </div>
    );
  }

  type Entry = { date: string; dist: string; timeMs: number };
  const entries: Entry[] = [];
  for (const series of (allSeries ?? [])) {
    for (const e of series.entries) {
      if (e.pid === pid && e.include) {
        entries.push({ date: series.dateKey, dist: series.dist, timeMs: e.timeMs });
      }
    }
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 py-4 text-xs text-muted-foreground text-center border-t border-border">
        {t.noPerformance}
      </div>
    );
  }

  const byDist = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!byDist.has(e.dist)) byDist.set(e.dist, []);
    byDist.get(e.dist)!.push(e);
  }
  const sortedDists = Array.from(byDist.keys()).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="border-t border-border bg-muted/20">
      {sortedDists.map(dist => {
        const all = byDist.get(dist)!.sort((a, b) => a.timeMs - b.timeMs);
        const best = all[0].timeMs;
        const showWorst = all.length > 5;
        const top5 = all.slice(0, 5);
        const displayed = showWorst ? [...top5, all[all.length - 1]] : top5;

        return (
          <div key={dist} className="border-b border-border last:border-b-0">
            <div className="px-4 py-2 flex items-center justify-between bg-muted/30">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">{dist}m</span>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{all.length} {all.length > 1 ? t.triesLabel_plural : t.triesLabel}</span>
                <div className="flex items-center gap-1 text-green-500 font-mono font-semibold">
                  <TrendingDown className="w-3 h-3" />
                  {formatTime(best)}
                </div>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {displayed.map((e, i) => {
                const isWorstRow = showWorst && i === displayed.length - 1;
                const isBest = e.timeMs === best;
                return (
                  <div key={i} className={`px-4 py-2 flex items-center justify-between ${isWorstRow ? "bg-red-500/5" : ""}`}>
                    <div className="flex items-center gap-2 w-16 shrink-0">
                      {isWorstRow && <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">{t.worstLabel}</span>}
                      {isBest && <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">{t.bestLabel}</span>}
                      {!isWorstRow && !isBest && <span className="text-[10px] text-muted-foreground">#{i + 1}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground flex-1">
                      {format(parseISO(e.date), "d MMM yyyy", { locale: fr })}
                    </span>
                    <span className={`font-mono text-sm font-bold tabular-nums ${isBest ? "text-green-500" : isWorstRow ? "text-red-400" : ""}`}>
                      {formatTime(e.timeMs)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page Athlètes ─────────────────────────────────────────────────────────────

export default function Athletes() {
  const { data: participants, isLoading } = useListParticipants();
  const t = useT();
  const [newName, setNewName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const createParticipant = useCreateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const updateParticipant = useUpdateParticipant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleSelectionMode = () => {
    setSelectionMode(prev => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createParticipant.mutate({ data: { name: trimmed } }, {
      onSuccess: created => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        setNewName("");
        toast({ title: t.athleteAdded(created.name) });
      },
      onError: err => toast({ title: t.error, description: String(err), variant: "destructive" }),
    });
  };

  const handleDeleteOne = (id: string, name: string) => {
    deleteParticipant.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        toast({ title: t.athleteDeleted(name) });
      },
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => deleteParticipant.mutateAsync({ id })));
    queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
    setSelectedIds(new Set());
    setSelectionMode(false);
    toast({ title: t.bulkDeleteAthletes(ids.length) });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (!participants) return;
    if (selectedIds.size === participants.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(participants.map(p => p.id)));
  };

  const startEdit = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentName);
    setExpandedId(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditValue(""); };

  const confirmEdit = (id: string, oldName: string) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === oldName) { cancelEdit(); return; }
    updateParticipant.mutate({ id, data: { name: trimmed } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        setEditingId(null);
        toast({ title: t.athleteRenamed(trimmed) });
      },
      onError: err => toast({ title: t.error, description: String(err), variant: "destructive" }),
    });
  };

  const toggleExpand = (id: string) => {
    if (selectionMode) return;
    setExpandedId(prev => prev === id ? null : id);
  };

  const allSelected = (participants?.length ?? 0) > 0 && selectedIds.size === (participants?.length ?? 0);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">{t.athletesTitle}</h2>
          <span className="text-sm text-muted-foreground">
            {participants?.length ?? 0} athlète{(participants?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Formulaire d'ajout */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder={t.athleteNamePlaceholder}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || createParticipant.isPending}>
            <UserPlus className="w-4 h-4 mr-2" />
            {t.add}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 border border-border rounded-lg">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 flex-1 max-w-[140px]" />
              </div>
            ))}
          </div>
        ) : participants?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="bg-card inline-flex p-4 rounded-full mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium">{t.noAthletesRegistered}</p>
            <p className="text-xs mt-1">{t.noAthletesHint}</p>
          </div>
        ) : (
          <div className="space-y-2 pb-20">
            {/* Barre contrôles */}
            <div className="flex items-center justify-between mb-3">
              {selectionMode ? (
                <div
                  className="flex items-center gap-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none"
                  onClick={toggleAll}
                >
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span>{t.selectAll}</span>
                </div>
              ) : <div />}

              <div className="flex items-center gap-2">
                {selectionMode && selectedIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={deleteParticipant.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {selectedIds.size}
                  </button>
                )}
                <button
                  onClick={toggleSelectionMode}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    selectionMode
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {selectionMode ? t.deselect : t.select}
                </button>
              </div>
            </div>

            {participants?.map(p => (
              <div key={p.id} className={`bg-card border rounded-xl overflow-hidden transition-colors ${
                selectedIds.has(p.id) ? "border-primary/40" : "border-border"
              }`}>
                {/* Ligne principale */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
                    selectedIds.has(p.id) ? "bg-primary/5" : "hover:bg-muted/30"
                  }`}
                  onClick={() => selectionMode ? toggleSelect(p.id) : toggleExpand(p.id)}
                >
                  {/* Checkbox (mode sélection uniquement) */}
                  {selectionMode && (
                    <div onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(p.id)}
                        onCheckedChange={() => toggleSelect(p.id)}
                        className="shrink-0"
                      />
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Nom ou champ d'édition */}
                  {editingId === p.id ? (
                    <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") confirmEdit(p.id, p.name);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="h-8 text-sm flex-1"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary" onClick={() => confirmEdit(p.id, p.name)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={cancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium flex-1">{p.name}</span>

                      {/* Actions (masquées en mode sélection) */}
                      {!selectionMode && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={e => startEdit(p.id, p.name, e)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={e => { e.stopPropagation(); handleDeleteOne(p.id, p.name); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Chevron expand (mode normal uniquement) */}
                      {!selectionMode && (
                        expandedId === p.id
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </>
                  )}
                </div>

                {/* Historique dépliant */}
                {!selectionMode && expandedId === p.id && <AthleteHistory pid={p.id} />}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
