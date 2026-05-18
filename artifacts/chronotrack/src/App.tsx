import { useRef } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import Sessions from "@/pages/sessions";
import Chrono from "@/pages/chrono";
import CalendarView from "@/pages/calendar";
import Progression from "@/pages/progression";
import Athletes from "@/pages/athletes";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Clock } from "lucide-react";

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
    <Layout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/sessions" />} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/sessions/:id/chrono" component={Chrono} />
        <Route path="/athletes" component={Athletes} />
        <Route path="/calendar" component={CalendarView} />
        <Route path="/progression" component={Progression} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) queryClientRef.current = new QueryClient();
  const handleUserChange = () => {
    queryClientRef.current = new QueryClient();
  };
  return (
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
  );
}

export default App;
