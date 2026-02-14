import { Switch, Route, Redirect, useLocation } from "wouter";
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
import AboutMethod from "@/pages/about-method";
import Journal from "@/pages/journal";
import Badges from "@/pages/badges";
import Lexicon from "@/pages/lexicon";
import Intro from "@/pages/intro";
import { hasSeenIntro } from "@/pages/intro";
import { BuildFooter } from "@/components/build-footer";
import "@/lib/i18n";

function IntroRedirect() {
  const [location] = useLocation();
  if (!hasSeenIntro() && location !== "/intro") {
    return <Redirect to="/intro" />;
  }
  return null;
}

function Router() {
  return (
    <>
      <IntroRedirect />
      <Switch>
        <Route path="/intro" component={Intro} />
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/sessions" component={Sessions} />
              <Route path="/tasting/:id" component={TastingRoom} />
              <Route path="/profile" component={Profile} />
              <Route path="/friends" component={WhiskyFriends} />
              <Route path="/journal" component={Journal} />
              <Route path="/badges" component={Badges} />
              <Route path="/lexicon" component={Lexicon} />
              <Route path="/about-method" component={AboutMethod} />
              <Route path="/invite/:token" component={InviteAccept} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </>
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
