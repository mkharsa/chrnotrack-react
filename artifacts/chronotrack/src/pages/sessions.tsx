import { useState } from "react";
import { useListSessions, useBulkDeleteSessions, getListSessionsQueryKey, useCreateSession, useListParticipants, useCreateParticipant, getListParticipantsQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Users, Calendar as CalendarIcon, ChevronRight, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { parseDistance } from "@/lib/time";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Sessions() {
  const { data: sessions, isLoading } = useListSessions();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const bulkDelete = useBulkDeleteSessions();
  const { toast } = useToast();

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
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
        toast({ title: "Sessions supprimées" });
      }
    });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">Toutes les sessions</h2>
          <CreateSessionDialog />
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-lg" />)}
          </div>
        ) : sessions?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="bg-card inline-flex p-4 rounded-full mb-4">
              <CalendarIcon className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm">Aucune session pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-20">
            <div className="flex items-center px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Checkbox
                checked={sessions && sessions.length > 0 && selectedIds.size === sessions.length}
                onCheckedChange={toggleAll}
                className="mr-4"
              />
              <span>Tout sélectionner</span>
            </div>

            {sessions?.map(session => (
              <div
                key={session.id}
                className="group bg-card hover:bg-accent/10 border border-card-border hover:border-accent/30 rounded-lg p-4 flex items-center transition-colors cursor-pointer"
                onClick={() => setLocation(`/sessions/${session.id}/chrono`)}
              >
                <div className="mr-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(session.id)}
                    onCheckedChange={() => toggleSelect(session.id)}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="font-bold text-base truncate">{session.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono ml-2 shrink-0">
                      {format(new Date(session.date), "d MMM yyyy", { locale: fr })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{session.participantCount} athlète{session.participantCount !== 1 ? "s" : ""}</span>
                    </div>
                    {session.defaultDist && (
                      <div className="flex items-center gap-1 text-primary">
                        <span className="font-mono">{session.defaultDist}m</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4 text-muted-foreground">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-destructive text-destructive-foreground rounded-lg p-3 flex justify-between items-center shadow-lg animate-in slide-in-from-bottom-5">
          <span className="text-sm font-medium">{selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}</span>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-destructive-foreground/20 text-white"
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
      data: {
        name,
        date,
        defaultDist,
        participantIds: Array.from(selectedParticipants)
      }
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
    const next = new Set(selectedParticipants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedParticipants(next);
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
