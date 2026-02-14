import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import TastingRoom from "@/pages/tasting-room";
import Profile from "@/pages/profile";
import WhiskyFriends from "@/pages/whisky-friends";
import Sessions from "@/pages/sessions";
import InviteAccept from "@/pages/invite-accept";
import { BuildFooter } from "@/components/build-footer";
import "@/lib/i18n";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/tasting/:id" component={TastingRoom} />
        <Route path="/profile" component={Profile} />
        <Route path="/friends" component={WhiskyFriends} />
        <Route path="/invite/:token" component={InviteAccept} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <BuildFooter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
