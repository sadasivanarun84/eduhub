import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, History, Settings, Dice6, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThreeDiceRoll } from "@/components/three-dice-roll";
import { ThreeDiceFaceConfig } from "@/components/three-dice-face-config";
import type { ThreeDiceCampaign, ThreeDiceFace, ThreeDiceResult } from "@shared/schema";

export function ThreeDiceRollPage() {
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [hasProcessedReset, setHasProcessedReset] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if reset was requested via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const shouldReset = urlParams.get('reset') === 'true';

  const { data: activeCampaign, isLoading: campaignLoading } = useQuery<ThreeDiceCampaign>({
    queryKey: ["/api/three-dice/campaigns/active"],
  });

  const { data: faces = [], isLoading: facesLoading } = useQuery<ThreeDiceFace[]>({
    queryKey: [`/api/three-dice/faces?campaignId=${activeCampaign?.id}`],
    enabled: !!activeCampaign?.id,
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery<ThreeDiceResult[]>({
    queryKey: [`/api/three-dice/results?campaignId=${activeCampaign?.id}`],
    enabled: !!activeCampaign?.id,
  });

  // Reset mutation
  // Add ESC key support to close configuration panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && configPanelOpen) {
        setConfigPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [configPanelOpen]);

  const resetMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await fetch(`/api/three-dice/campaigns/${campaignId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to reset campaign");
      return response.json();
    },
    onSuccess: () => {
      // Clear all cache and invalidate queries for fresh data
      queryClient.clear();
      setTimeout(() => {
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/three-dice/campaigns/active"], refetchType: 'active' }),
          queryClient.invalidateQueries({ queryKey: [`/api/three-dice/results?campaignId=${activeCampaign?.id}`], refetchType: 'active' }),
          queryClient.invalidateQueries({ queryKey: [`/api/three-dice/faces?campaignId=${activeCampaign?.id}`], refetchType: 'active' })
        ]).then(() => {
          toast({
            title: "Game Reset!",
            description: "A fresh Three Dice Roll game has started. Roll counts and total rolls reset to 100.",
          });
        });
      }, 100);
    },
    onError: () => {
      toast({
        title: "Reset Failed",
        description: "Unable to reset the game. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset campaign only when coming from home page with reset=true parameter
  useEffect(() => {
    if (activeCampaign && shouldReset && !hasProcessedReset && !campaignLoading) {
      setHasProcessedReset(true);
      // Clear React Query cache first to ensure fresh data
      queryClient.clear();
      resetMutation.mutate(activeCampaign.id);
      
      // Remove the reset parameter from URL to prevent repeated resets
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('reset');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    }
  }, [activeCampaign, shouldReset, hasProcessedReset, campaignLoading, resetMutation, queryClient]);

  const isLoading = campaignLoading || facesLoading || resultsLoading;
  const remainingRolls = Math.max(0, (activeCampaign?.totalRolls || 100) - (activeCampaign?.currentRolls || 0));
  const rollsExhausted = remainingRolls <= 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading three dice game...</div>
        </div>
      </div>
    );
  }

  if (!activeCampaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="text-3xl font-bold">Three Dice Roll Game</h1>
          <p className="text-muted-foreground">No active three dice campaign found. Please create one first.</p>
          <Link href="/" data-testid="link-home">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" data-testid="link-home">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Dice6 className="h-8 w-8" />
                Three Dice Roll Game
              </h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setConfigPanelOpen(true)}
            data-testid="button-open-config"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Campaign Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-rolls-counter">
              Rolls: {activeCampaign.currentRolls || 0}/{activeCampaign.totalRolls || 100}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-6">
            <ThreeDiceRoll 
              faces={faces} 
              disabled={rollsExhausted}
              activeCampaign={activeCampaign}
            />

            {/* Warning Message */}
            {rollsExhausted && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardContent className="pt-4">
                  <div className="text-center text-orange-700 dark:text-orange-300">
                    All rolls have been used up. The game has ended.
                  </div>
                </CardContent>
                <CardContent className="pt-4">
                  <div className="flex justify-center gap-3">
                    <Link href="/" data-testid="link-home-game-ended">
                      <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                      </Button>
                    </Link>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        if (activeCampaign) {
                          queryClient.clear();
                          resetMutation.mutate(activeCampaign.id);
                        }
                      }}
                      disabled={resetMutation.isPending}
                      data-testid="button-play-again"
                    >
                      {resetMutation.isPending ? "Resetting..." : "Play Again"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Sliding Configuration Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-1/3 bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
            configPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid="config-panel"
        >
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Three Dice Configuration
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setConfigPanelOpen(false)}
                data-testid="button-close-config"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <ThreeDiceFaceConfig activeCampaign={activeCampaign} />
            </div>
          </div>
        </div>

        {/* Overlay */}
        {configPanelOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setConfigPanelOpen(false)}
            data-testid="config-panel-overlay"
          />
        )}

        <Separator />

        {/* Results History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Roll History
            </CardTitle>
            <CardDescription>Recent three dice roll results</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center text-muted-foreground py-8" data-testid="text-no-results">
                No rolls yet. Roll the three dice to start!
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-x-4 mb-4 px-3 py-2 bg-muted rounded-lg items-center" style={{ gridTemplateColumns: 'auto 1fr 1fr 1fr auto', gap: '0 30px' }}>
                  <div className="text-sm font-semibold text-muted-foreground">#</div>
                  <div className="flex items-center gap-2">
                    <Dice6 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="text-sm font-semibold text-muted-foreground">Dice 1</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dice6 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="text-sm font-semibold text-muted-foreground">Dice 2</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dice6 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="text-sm font-semibold text-muted-foreground">Dice 3</div>
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground text-right">Time</div>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.slice(0, 20).map((result, index) => {
                    // Find face data to get colors
                    const dice1Face = faces.find(f => f.diceNumber === 1 && f.faceNumber === result.dice1Face);
                    const dice2Face = faces.find(f => f.diceNumber === 2 && f.faceNumber === result.dice2Face);
                    const dice3Face = faces.find(f => f.diceNumber === 3 && f.faceNumber === result.dice3Face);
                    
                    return (
                      <div
                        key={result.id}
                        className="grid grid-cols-[auto_1fr_1fr_1fr_auto] p-3 bg-secondary rounded-lg items-center"
                        style={{ gap: '0 30px' }}
                        data-testid={`result-item-${index}`}
                      >
                        <div className="text-sm font-medium">#{index + 1}</div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: dice1Face?.color || '#ffffff' }}
                          />
                          <div className="text-sm min-w-0 truncate">{result.winner1}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: dice2Face?.color || '#ffffff' }}
                          />
                          <div className="text-sm min-w-0 truncate">{result.winner2}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: dice3Face?.color || '#ffffff' }}
                          />
                          <div className="text-sm min-w-0 truncate">{result.winner3}</div>
                        </div>
                        <div className="text-sm text-muted-foreground text-right" data-testid={`text-result-time-${index}`}>
                          {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}