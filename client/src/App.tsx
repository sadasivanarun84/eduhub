import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/home";
import SpinWheelPage from "@/pages/spin-wheel";
import { DiceRollPage } from "@/pages/dice-roll";
import { ThreeDiceRollPage } from "@/pages/three-dice-roll";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/spinwheel" component={SpinWheelPage} />
      <Route path="/diceroll" component={DiceRollPage} />
      <Route path="/threediceroll" component={ThreeDiceRollPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
