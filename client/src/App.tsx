import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import HomePage from "@/pages/home";
import { PopQuizPage } from "@/pages/pop-quiz";
import { PeriodicTablePage } from "@/pages/periodic-table";
import ClassroomPage from "@/pages/classroom";
import FirebaseTest from "@/pages/firebase-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/firebase-test" component={FirebaseTest} />
      <Route path="/popquiz" component={PopQuizPage} />
      <Route path="/periodic-table" component={PeriodicTablePage} />
      <Route path="/classroom/:id" component={ClassroomPage} />
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
