import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Sessions from "@/pages/sessions";
import Chrono from "@/pages/chrono";
import CalendarView from "@/pages/calendar";
import Progression from "@/pages/progression";
import Athletes from "@/pages/athletes";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
