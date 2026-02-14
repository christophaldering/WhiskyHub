import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import TastingRoom from "@/pages/tasting-room";
import { useSessionStore } from "@/lib/store";
import { useEffect } from "react";
import "@/lib/i18n"; // Initialize i18n

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/tasting/:id" component={TastingRoom} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  // Ensure store is hydrated (zustand persist)
  const { currentSessionId } = useSessionStore();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
