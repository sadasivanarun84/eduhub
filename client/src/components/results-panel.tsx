import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { SpinResult } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ResultsPanelProps {
  currentResult: string | null;
}

export function ResultsPanel({ currentResult }: ResultsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: spinHistory = [],
    isLoading,
  } = useQuery<SpinResult[]>({
    queryKey: ["/api/spin-results"],
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/spin-results");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spin-results"] });
      toast({
        title: "History cleared",
        description: "All spin history has been cleared.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return "🥇";
      case 1: return "🥈";
      case 2: return "🥉";
      default: return "🏅";
    }
  };

  return (
    <Card className="floating-card">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Current Result Display */}
        <div>
          {!currentResult ? (
            <div className="text-center p-8 border-2 border-dashed border-border rounded-xl">
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-muted-foreground">Spin the wheel to see your result!</p>
            </div>
          ) : (
            <div className="text-center p-8 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl border-2 border-primary animate-result-pop">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-primary mb-2">Winner!</h3>
              <p className="text-xl font-semibold" data-testid="text-current-result">
                {currentResult}
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                  <span>🎯</span>
                  <span>Congratulations!</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Spin History */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📋</span>
            Spin History
          </h3>

          <div className="space-y-3 max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-4">
                Loading history...
              </div>
            ) : spinHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No spins yet. Start spinning to see your history!
              </div>
            ) : (
              spinHistory.map((result, index) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                  data-testid={`history-item-${result.id}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getMedalEmoji(index)}</span>
                    <span data-testid={`text-winner-${result.id}`}>{result.winner}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {result.timestamp
                      ? formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })
                      : "Unknown"}
                  </span>
                </div>
              ))
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => clearHistoryMutation.mutate()}
            disabled={spinHistory.length === 0 || clearHistoryMutation.isPending}
            className="w-full mt-4 text-sm border-border hover:bg-muted/50"
            data-testid="button-clear-history"
          >
            Clear History
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
