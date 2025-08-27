import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { SpinResult, Campaign } from "@shared/schema";
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

  // Fetch active campaign for progress tracking
  const { data: activeCampaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns/active"],
    retry: false,
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
        {/* Campaign Progress Display */}
        {activeCampaign && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>📊</span>
              Campaign Progress
            </h3>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium" data-testid="text-campaign-name">
                  {activeCampaign.name}
                </h4>
                <Badge 
                  variant={activeCampaign.threshold && (activeCampaign.currentSpent ?? 0) >= activeCampaign.threshold ? "default" : "secondary"}
                  data-testid="badge-threshold-status"
                >
                  {activeCampaign.threshold && (activeCampaign.currentSpent ?? 0) >= activeCampaign.threshold 
                    ? "🎯 Threshold Reached" 
                    : "🔄 Random Mode"}
                </Badge>
              </div>

              {/* Budget Progress */}
              {activeCampaign.totalAmount && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget Spent</span>
                    <span data-testid="text-budget-progress">
                      ${(activeCampaign.currentSpent ?? 0).toFixed(2)} / ${activeCampaign.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <Progress 
                    value={((activeCampaign.currentSpent ?? 0) / activeCampaign.totalAmount) * 100} 
                    className="h-2"
                    data-testid="progress-budget"
                  />
                  <div className="text-xs text-muted-foreground">
                    Remaining: ${(activeCampaign.totalAmount - (activeCampaign.currentSpent ?? 0)).toFixed(2)}
                  </div>
                </div>
              )}

              {/* Winners Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Winners Count</span>
                  <span data-testid="text-winners-progress">
                    {activeCampaign.currentWinners ?? 0} / {activeCampaign.totalWinners}
                  </span>
                </div>
                <Progress 
                  value={((activeCampaign.currentWinners ?? 0) / activeCampaign.totalWinners) * 100} 
                  className="h-2"
                  data-testid="progress-winners"
                />
                <div className="text-xs text-muted-foreground">
                  Remaining: {activeCampaign.totalWinners - (activeCampaign.currentWinners ?? 0)} winners
                </div>
              </div>

              {/* Threshold Information */}
              {activeCampaign.threshold && (
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between text-sm">
                    <span>Threshold Setting</span>
                    <span data-testid="text-threshold-amount">
                      ${activeCampaign.threshold.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(activeCampaign.currentSpent ?? 0) >= activeCampaign.threshold 
                      ? "✅ Intelligent prize distribution is now active"
                      : "⏳ Random distribution until threshold is reached"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
