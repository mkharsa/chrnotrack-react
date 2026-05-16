import { useState } from "react";
import { useListParticipants, useCreateParticipant, useDeleteParticipant, getListParticipantsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, UserPlus, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Athletes() {
  const { data: participants, isLoading } = useListParticipants();
  const [newName, setNewName] = useState("");
  const createParticipant = useCreateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createParticipant.mutate({ data: { name: trimmed } }, {
      onSuccess: (created) => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        setNewName("");
        toast({ title: `Athlète "${created.name}" ajouté` });
      }
    });
  };

  const handleDelete = (id: number, name: string) => {
    deleteParticipant.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
        toast({ title: `"${name}" supprimé` });
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
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
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || createParticipant.isPending}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Liste */}
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-card rounded-lg" />)}
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
          <div className="space-y-2">
            {participants?.map(p => (
              <div
                key={p.id}
                className="bg-card border border-card-border rounded-lg px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{p.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(p.id, p.name)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
