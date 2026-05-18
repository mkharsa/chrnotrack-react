import { useState } from "react";
import { Clock, Timer, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Login from "@/pages/login";

export default function Landing() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-10 text-center">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Clock className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">ChronoTrack</h1>
        </div>

        <p className="text-lg text-muted-foreground max-w-sm mb-10 leading-relaxed">
          Suivez, analysez et améliorez les performances de vos athlètes.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            size="lg"
            className="w-full font-bold text-base"
            onClick={() => setShowLogin(true)}
          >
            Se connecter
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full font-bold text-base"
            onClick={() => setShowLogin(true)}
          >
            Créer un compte gratuit
          </Button>
        </div>
      </div>

      {/* Feature cards */}
      <div className="px-6 pb-12">
        <div className="grid gap-4 max-w-sm mx-auto">
          <FeatureCard
            icon={<Timer className="w-5 h-5 text-primary" />}
            title="Chronomètre précis"
            description="Mesurez les temps au centième de seconde pour chaque athlète, série après série."
          />
          <FeatureCard
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
            title="Suivi de progression"
            description="Visualisez l'évolution des performances dans le temps avec des graphiques clairs."
          />
          <FeatureCard
            icon={<Users className="w-5 h-5 text-primary" />}
            title="Gestion d'équipe"
            description="Gérez vos athlètes, organisez vos sessions et planifiez vos entraînements."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
