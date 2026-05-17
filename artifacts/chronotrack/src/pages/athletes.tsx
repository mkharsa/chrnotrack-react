import { useState } from "react";
import {
  useListParticipants,
  useCreateParticipant,
  useDeleteParticipant,
  getListParticipantsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, UserPlus, Users, Pencil, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Athletes() {
  const { data: participants, isLoading } = useListParticipants();
  const [newName, setNewName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const createParticipant = useCreateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createParticipant.mutate(
      { data: { name: trimmed } },
      {
        onSuccess: created => {
          queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
          setNewName("");
          toast({ title: `Athlète "${created.name}" ajouté` });
        },
      }
    );
  };

  const handleDeleteOne = (id: number, name: string) => {
    deleteParticipant.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
          setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
          toast({ title: `"${name}" supprimé` });
        },
      }
    );
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => deleteParticipant.mutateAsync({ id })));
    queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
    setSelectedIds(new Set());
    toast({ title: `${ids.length} athlète${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}` });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (!participants) return;
    if (selectedIds.size === participants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(participants.map(p => p.id)));
    }
  };

  const startEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  // Note: the API doesn't have a PATCH /participants/:id yet — we simulate rename
  // by deleting and recreating. For now we just show the edit UI and note it.
  // If you want true rename, add a PATCH endpoint.
  const confirmEdit = (id: number, oldName: string) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === oldName) { cancelEdit(); return; }
    // Delete old + create new
    deleteParticipant.mutate({ id }, {
      onSuccess: () => {
        createParticipant.mutate({ data: { name: trimmed } }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
            setEditingId(null);
            toast({ title: `Renommé en "${trimmed}"` });
          }
        });
      }
    });
  };

  const allSelected = (participants?.length ?? 0) > 0 && selectedIds.size === (participants?.length ?? 0);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">Athlètes</h2>
          <span className="text-sm text-muted-foreground">
            {participants?.length ?? 0} athlète{(participants?.length ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Formulaire d'ajout */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Nom de l'athlète..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || createParticipant.isPending}>
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 bg-card rounded-lg" />
            ))}
          </div>
        ) : participants?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="bg-card inline-flex p-4 rounded-full mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm font-medium">Aucun athlète enregistré.</p>
            <p className="text-xs mt-1">Ajoutez un nom ci-dessus pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-2 pb-20">
            {/* Tout sélectionner */}
            <div className="flex items-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="mr-4" />
              <span>Tout sélectionner</span>
            </div>

            {participants?.map(p => (
              <div
                key={p.id}
                className={`bg-card border rounded-lg px-4 py-3 flex items-center gap-3 transition-colors ${
                  selectedIds.has(p.id) ? "border-primary/40 bg-primary/5" : "border-card-border"
                }`}
              >
                <Checkbox
                  checked={selectedIds.has(p.id)}
                  onCheckedChange={() => toggleSelect(p.id)}
                  className="shrink-0"
                />

                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>

                {editingId === p.id ? (
                  <div className="flex-1 flex items-center gap-2">
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(p.id, p.name)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteOne(p.id, p.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barre d'action groupée */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-destructive text-destructive-foreground rounded-lg p-3 flex justify-between items-center shadow-lg animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium">
            {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-destructive-foreground/20 text-white"
            onClick={handleBulkDelete}
            disabled={deleteParticipant.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}
