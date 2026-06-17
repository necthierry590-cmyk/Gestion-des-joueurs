import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import AdminPanel from "@/pages/AdminPanel";
import VisitorsPage from "@/pages/VisitorsPage";
import SetupPage from "@/pages/SetupPage";
import RegisterPage from "@/pages/RegisterPage";
import SuperAdminPage from "@/pages/SuperAdminPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/auth");
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;
  return <Component />;
}

function RootRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Dashboard />;
  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/setup" component={SetupPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/landing" component={LandingPage} />
      <Route path="/visitors" component={VisitorsPage} />
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPanel} />}
      </Route>
      <Route path="/superadmin">
        {() => <ProtectedRoute component={SuperAdminPage} />}
      </Route>
      <Route path="/subscription">
        {() => <ProtectedRoute component={SubscriptionPage} />}
      </Route>
      <Route path="/">
        {() => <RootRoute />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
