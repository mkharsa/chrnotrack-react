import { Link, useLocation } from "wouter";
import { Activity, Calendar as CalendarIcon, Clock, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg tracking-tight uppercase">ChronoTrack</h1>
          <Badge variant="outline" className="ml-2 bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase tracking-widest text-[10px]">
            v2.0.4
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      <nav className="shrink-0 border-t border-border bg-card pb-safe">
        <div className="flex h-16">
          <NavItem href="/sessions" icon={<Activity />} label="Sessions" active={location === "/" || location.startsWith("/sessions")} />
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
    <Link href={href} className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
      <div className={`p-1 rounded-full ${active ? "bg-primary/10" : ""}`}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
}
