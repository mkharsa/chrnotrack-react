import { useRef, Component, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import Sessions from "@/pages/sessions";
import Chrono from "@/pages/chrono";
import CalendarView from "@/pages/calendar";
import Progression from "@/pages/progression";
import Athletes from "@/pages/athletes";
import Training from "@/pages/training";
import FreeChrono from "@/pages/free-chrono";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { AlertTriangle, Clock } from "lucide-react";

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="font-semibold text-lg">Une erreur est survenue</h2>
            <p className="text-sm text-muted-foreground">{(this.state.error as Error).message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── QueryClient factory ──────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,        // 5 min before refetch
        gcTime: 1000 * 60 * 10,          // 10 min cache retention
        refetchOnWindowFocus: false,      // mobile-friendly
        retry: (count, error) => {
          const code = (error as { code?: string })?.code ?? "";
          if (code === "permission-denied" || code === "unauthenticated") return false;
          return count < 2;
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        const msg = (error as Error).message;
        if (!msg.includes("Not authenticated")) {
          toast({ title: "Erreur de chargement", description: msg, variant: "destructive" });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
      },
    }),
  });
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Clock className="w-8 h-8 text-primary animate-pulse" />
        <span className="text-sm">Chargement…</span>
      </div>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Login />;
  return (
    <Switch>
      {/* Admin: password-gated but still behind Firebase auth */}
      <Route path="/admin" component={Admin} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={() => <Redirect to="/training" />} />
            <Route path="/sessions" component={Sessions} />
            <Route path="/sessions/:id/chrono" component={Chrono} />
            <Route path="/athletes" component={Athletes} />
            <Route path="/calendar" component={CalendarView} />
            <Route path="/progression" component={Progression} />
            <Route path="/training" component={Training} />
            <Route path="/free-chrono" component={FreeChrono} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) queryClientRef.current = makeQueryClient();
  const handleUserChange = () => { queryClientRef.current = makeQueryClient(); };

  return (
    <ErrorBoundary>
      <AuthProvider onUserChange={handleUserChange}>
        <QueryClientProvider client={queryClientRef.current}>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
