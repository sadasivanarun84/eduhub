import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Trophy, Target, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Campaign, InsertCampaign } from "@shared/schema";

interface CampaignConfigProps {
  onCampaignUpdate?: () => void;
}

export function CampaignConfig({ onCampaignUpdate }: CampaignConfigProps) {
  const [formData, setFormData] = useState<InsertCampaign>({
    name: "",
    totalAmount: null,
    totalWinners: 10,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: activeCampaign,
    isLoading,
  } = useQuery<Campaign>({
    queryKey: ["/api/campaigns/active"],
    retry: false,
  });

  // Update form when active campaign loads
  useEffect(() => {
    if (activeCampaign) {
      setFormData({
        name: activeCampaign.name,
        totalAmount: activeCampaign.totalAmount,
        totalWinners: activeCampaign.totalWinners,
      });
    }
  }, [activeCampaign]);

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: InsertCampaign) => {
      return apiRequest("POST", "/api/campaigns", campaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onCampaignUpdate?.();
      toast({
        title: "Campaign created",
        description: "New campaign has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (updates: Partial<Campaign>) => {
      if (!activeCampaign) throw new Error("No active campaign");
      return apiRequest("PUT", `/api/campaigns/${activeCampaign.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      onCampaignUpdate?.();
      toast({
        title: "Campaign updated",
        description: "Campaign settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!activeCampaign) throw new Error("No active campaign");
      const response = await fetch(`/api/campaigns/${activeCampaign.id}/reset`, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: () => {
      // Force invalidate all related queries without cache
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/spin-results"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/wheel-sections"], refetchType: 'all' });
      // Force refetch immediately
      queryClient.refetchQueries({ queryKey: ["/api/campaigns/active"] });
      queryClient.refetchQueries({ queryKey: ["/api/spin-results"] });
      onCampaignUpdate?.();
      toast({
        title: "Campaign reset",
        description: "Campaign has been reset. All spin results cleared and rotation sequence regenerated.",
      });
    },
    onError: (error) => {
      console.error('Reset error:', error);
      toast({
        title: "Error",
        description: "Failed to reset campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof InsertCampaign, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Campaign name is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.totalWinners <= 0) {
      toast({
        title: "Validation Error",
        description: "Total winners must be greater than 0.",
        variant: "destructive",
      });
      return;
    }


    if (activeCampaign) {
      updateCampaignMutation.mutate(formData);
    } else {
      createCampaignMutation.mutate(formData);
    }
  };

  const isValidPrizeAmount = (value: string) => {
    return value === "" || (!isNaN(Number(value)) && Number(value) > 0);
  };

  return (
    <Card className="floating-card">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Campaign Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4">
            Loading campaign...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="campaign-name" className="text-sm font-medium">
                Campaign Name
              </Label>
              <Input
                id="campaign-name"
                type="text"
                placeholder="Enter campaign name..."
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full"
                data-testid="input-campaign-name"
              />
            </div>

            <Separator />

            {/* Prize Configuration */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Trophy className="w-4 h-4" />
                Prize Configuration
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total-amount" className="text-sm">
                    Total Amount (Optional)
                  </Label>
                  <Input
                    id="total-amount"
                    type="number"
                    placeholder="e.g., 300000"
                    value={formData.totalAmount || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (isValidPrizeAmount(value)) {
                        handleInputChange("totalAmount", value ? Number(value) : null);
                      }
                    }}
                    className="w-full"
                    data-testid="input-total-amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total budget for all prizes
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total-winners" className="text-sm">
                    Total Winners
                  </Label>
                  <Input
                    id="total-winners"
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.totalWinners}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > 0) {
                        handleInputChange("totalWinners", value);
                      }
                    }}
                    className="w-full"
                    min="1"
                    required
                    data-testid="input-total-winners"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of winners
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Quota Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="w-4 h-4" />
                Quota System
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Configure individual prize quotas in the Wheel tab. Set how many times each prize can be won.
                  <br /><br />
                  Example: 5 winners of $10k, 2 winners of $50k, 3 winners of $20k, etc.
                </p>
              </div>
            </div>

            {/* Campaign Status */}
            {activeCampaign && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Campaign Progress
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-muted-foreground">Winners</div>
                      <div className="font-semibold text-lg">
                        {activeCampaign.currentWinners} / {activeCampaign.totalWinners}
                      </div>
                    </div>
                    {activeCampaign.totalAmount && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <div className="text-muted-foreground">Spent</div>
                        <div className="font-semibold text-lg">
                          {activeCampaign.currentSpent} / {activeCampaign.totalAmount}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                data-testid="button-save-campaign"
              >
                {activeCampaign ? "Update Campaign" : "Create Campaign"}
              </Button>
              
              {activeCampaign && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                  disabled={resetCampaignMutation.isPending}
                  onClick={() => resetCampaignMutation.mutate()}
                  data-testid="button-reset-campaign"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {resetCampaignMutation.isPending ? "Resetting..." : "Reset Campaign"}
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}