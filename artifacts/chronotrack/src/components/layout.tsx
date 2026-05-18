import { Link, useLocation } from "wouter";
import { Activity, Calendar as CalendarIcon, Clock, Dumbbell, LogOut, Timer, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  const initials = user?.displayName
    ? user.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0].toUpperCase() ?? "?";

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg tracking-tight uppercase">ChronoTrack</h1>
          <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-widest text-[10px]">
            {import.meta.env.VITE_APP_VERSION || "v2.0.4"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
            {user?.photoURL
              ? <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
              : initials}
          </div>
          <button
            onClick={() => signOut()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      <nav className="shrink-0 border-t border-border bg-card pb-safe">
        <div className="flex h-14">
          <NavItem href="/training" icon={<Dumbbell />} label="Entraînement" active={location.startsWith("/training")} />
          <NavItem href="/sessions" icon={<Activity />} label="Sessions" active={location === "/" || location.startsWith("/sessions")} />
          <NavItem href="/free-chrono" icon={<Timer />} label="Chrono" active={location.startsWith("/free-chrono")} />
          <NavItem href="/athletes" icon={<Users />} label="Athlètes" active={location.startsWith("/athletes")} />
          <NavItem href="/calendar" icon={<CalendarIcon />} label="Calendrier" active={location.startsWith("/calendar")} />
          <NavItem href="/progression" icon={<TrendingUp />} label="Progression" active={location.startsWith("/progression")} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
      <div className={`p-1 rounded-full [&>svg]:w-4 [&>svg]:h-4 ${active ? "bg-primary/10" : ""}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </Link>
  );
}
