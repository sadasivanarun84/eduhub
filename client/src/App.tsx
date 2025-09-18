import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import HomePage from "@/pages/home";
import SpinWheelPage from "@/pages/spin-wheel";
import { DiceRollPage } from "@/pages/dice-roll";
import { ThreeDiceRollPage } from "@/pages/three-dice-roll";
import SlotMachinePage from "@/pages/slot-machine";
import { PopQuizPage } from "@/pages/pop-quiz";
import FirebaseTest from "@/pages/firebase-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/firebase-test" component={FirebaseTest} />
      <Route path="/spinwheel" component={SpinWheelPage} />
      <Route path="/diceroll" component={DiceRollPage} />
      <Route path="/threediceroll" component={ThreeDiceRollPage} />
      <Route path="/slotmachine" component={SlotMachinePage} />
      <Route path="/popquiz" component={PopQuizPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
