import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateParticipant } from "@/lib/firebase-api";
import { useQueryClient } from "@tanstack/react-query";
import { getListParticipantsQueryKey } from "@/lib/firebase-api";

const ONBOARDED_KEY = "ct_onboarded";

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [athleteName, setAthleteName] = useState("");
  const [, setLocation] = useLocation();
  const createParticipant = useCreateParticipant();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      setOpen(true);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDED_KEY, "1");
    setOpen(false);
  };

  const handleCreateAthlete = () => {
    const trimmed = athleteName.trim();
    if (!trimmed) {
      setStep(2);
      return;
    }
    createParticipant.mutate(
      { data: { name: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListParticipantsQueryKey() });
          setStep(2);
        },
        onError: () => {
          setStep(2);
        },
      }
    );
  };

  const handleGoToTraining = () => {
    finish();
    setLocation("/training");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) finish(); }}>
      <DialogContent className="sm:max-w-[400px]" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === 0 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Bienvenue sur ChronoTrack 👋</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3 text-sm text-muted-foreground">
              <p>
                ChronoTrack vous permet de chronométrer vos athlètes, suivre leur progression
                et organiser vos entraînements — tout en un.
              </p>
              <p>Laissez-nous vous guider pour démarrer en quelques secondes.</p>
            </div>
            <Button className="w-full font-bold" onClick={() => setStep(1)}>
              Commencer
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Créer un athlète</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Ajoutez votre premier athlète pour pouvoir l'associer à vos sessions.
              </p>
              <Input
                placeholder="Nom de l'athlète..."
                value={athleteName}
                onChange={(e) => setAthleteName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateAthlete()}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(2)}
              >
                Passer
              </Button>
              <Button
                className="flex-1 font-bold"
                onClick={handleCreateAthlete}
                disabled={createParticipant.isPending}
              >
                {createParticipant.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Tout est prêt !</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Créez votre premier entraînement et commencez à chronométrer.
              </p>
            </div>
            <Button className="w-full font-bold" onClick={handleGoToTraining}>
              Allons-y
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
