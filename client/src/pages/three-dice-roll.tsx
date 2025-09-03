import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, History, Settings, Dice6, Menu, X } from "lucide-react";
import { ThreeDiceRoll } from "@/components/three-dice-roll";
import { ThreeDiceFaceConfig } from "@/components/three-dice-face-config";
import type { ThreeDiceCampaign, ThreeDiceFace, ThreeDiceResult } from "@shared/schema";

export function ThreeDiceRollPage() {
  const [configPanelOpen, setConfigPanelOpen] = useState(false);

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

  const isLoading = campaignLoading || facesLoading || resultsLoading;
  const hasQuotas = faces.some(face => (face.maxWins || 0) > 0);
  const totalQuota = faces.reduce((sum, face) => sum + (face.maxWins || 0), 0);
  const usedQuota = faces.reduce((sum, face) => sum + (face.currentWins || 0), 0);
  const remainingQuota = Math.max(0, totalQuota - usedQuota);

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
              <p className="text-muted-foreground" data-testid="text-campaign-name">
                Campaign: {activeCampaign.name}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setConfigPanelOpen(true)}
            data-testid="button-open-config"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* Campaign Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-total-winners">
                  {activeCampaign.currentWinners || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Winners</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600" data-testid="text-total-spent">
                  ${activeCampaign.currentSpent || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-quota-used">
                  {usedQuota}/{totalQuota}
                </div>
                <div className="text-sm text-muted-foreground">Quota Used</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold" data-testid="text-remaining-rolls">
                  {hasQuotas ? remainingQuota : "∞"}
                </div>
                <div className="text-sm text-muted-foreground">Remaining Rolls</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex justify-center">
          <div className="space-y-6 max-w-2xl w-full">
            <ThreeDiceRoll 
              faces={faces} 
              disabled={hasQuotas && remainingQuota <= 0}
              activeCampaign={activeCampaign}
            />

            {/* Warning Message */}
            {hasQuotas && remainingQuota <= 0 && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardContent className="pt-4">
                  <div className="text-center text-orange-700 dark:text-orange-300">
                    All prizes have been distributed according to the campaign quotas.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sliding Configuration Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
            configPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid="config-panel"
        >
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.slice(0, 20).map((result, index) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                    data-testid={`result-item-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="px-2 py-1 bg-secondary border rounded text-xs" data-testid={`badge-dice1-face-${index}`}>
                          D1: {result.dice1Face}
                        </div>
                        <div className="px-2 py-1 bg-secondary border rounded text-xs" data-testid={`badge-dice2-face-${index}`}>
                          D2: {result.dice2Face}
                        </div>
                        <div className="px-2 py-1 bg-secondary border rounded text-xs" data-testid={`badge-dice3-face-${index}`}>
                          D3: {result.dice3Face}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-sm" data-testid={`text-result-winners-${index}`}>
                          {result.winner1} | {result.winner2} | {result.winner3}
                        </div>
                        {(result.amount1 || result.amount2 || result.amount3) && (
                          <div className="text-green-600 text-sm" data-testid={`text-result-amounts-${index}`}>
                            {result.amount1} | {result.amount2} | {result.amount3}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`text-result-time-${index}`}>
                      {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}