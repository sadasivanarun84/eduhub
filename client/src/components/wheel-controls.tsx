import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WheelSection } from "@shared/schema";

interface WheelControlsProps {
  sections: WheelSection[];
  isLoading: boolean;
  onSectionsUpdate: () => void;
}

const PREDEFINED_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", 
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
  "#84cc16", "#f59e0b", "#10b981", "#6366f1"
];

export function WheelControls({ sections, isLoading, onSectionsUpdate }: WheelControlsProps) {
  const [newSectionText, setNewSectionText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addSectionMutation = useMutation({
    mutationFn: async (data: { text: string; color: string; order: number }) => {
      return apiRequest("POST", "/api/wheel-sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wheel-sections"] });
      onSectionsUpdate();
      setNewSectionText("");
      toast({
        title: "Section added",
        description: "New wheel section has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/wheel-sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wheel-sections"] });
      onSectionsUpdate();
      toast({
        title: "Section removed",
        description: "Wheel section has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove section. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, maxWins }: { id: string; maxWins: number }) => {
      return apiRequest("PUT", `/api/wheel-sections/${id}`, { maxWins });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wheel-sections"] });
      onSectionsUpdate();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update section quota. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/wheel-sections");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wheel-sections"] });
      onSectionsUpdate();
      toast({
        title: "All sections cleared",
        description: "All wheel sections have been removed.",
      });
    },
  });

  const randomizeColorsMutation = useMutation({
    mutationFn: async () => {
      // Delete all sections first, then add them back with random colors
      await apiRequest("DELETE", "/api/wheel-sections");
      
      const promises = sections.map((section, index) => {
        const randomColor = PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
        return apiRequest("POST", "/api/wheel-sections", {
          text: section.text,
          color: randomColor,
          amount: section.amount, // Preserve existing amount
          order: index,
        });
      });
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wheel-sections"] });
      onSectionsUpdate();
      toast({
        title: "Colors randomized",
        description: "All section colors have been randomized.",
      });
    },
  });

  // Parse amount from text (e.g., "10k" -> 10000, "50" -> 50)
  const parseAmount = (text: string): number | null => {
    const trimmed = text.trim().toLowerCase();
    const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)(k)?$/);
    
    if (numMatch) {
      const num = parseFloat(numMatch[1]);
      const multiplier = numMatch[2] === 'k' ? 1000 : 1;
      return Math.round(num * multiplier);
    }
    
    return null;
  };

  const handleAddSection = () => {
    if (!newSectionText.trim()) return;
    
    const randomColor = PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
    const order = sections.length;
    const amount = parseAmount(newSectionText.trim());
    
    addSectionMutation.mutate({
      text: newSectionText.trim(),
      color: randomColor,
      amount,
      order,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddSection();
    }
  };

  return (
    <Card className="floating-card">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          Wheel Sections
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Section */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter section text (e.g., 10k, 50, Better Luck Next Time)..."
            value={newSectionText}
            onChange={(e) => setNewSectionText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            data-testid="input-section-text"
          />
          <Button
            onClick={handleAddSection}
            disabled={!newSectionText.trim() || addSectionMutation.isPending}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            data-testid="button-add-section"
          >
            <span className="text-lg mr-2">➕</span>
            Add
          </Button>
        </div>

        {/* Current Sections List */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-4">
              Loading sections...
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              No sections yet. Add some to get started!
            </div>
          ) : (
            sections.map((section) => (
              <div
                key={section.id}
                className="section-item p-3 rounded-lg border border-border flex items-center justify-between"
                data-testid={`section-item-${section.id}`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  <span className="flex-1">{section.text}</span>
                  {section.amount && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        ${section.amount.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground">Quota:</span>
                        <Input
                          type="number"
                          min="0"
                          value={section.maxWins || 0}
                          onChange={(e) => {
                            const newMaxWins = parseInt(e.target.value) || 0;
                            updateSectionMutation.mutate({
                              id: section.id,
                              maxWins: newMaxWins,
                            });
                          }}
                          className="w-16 h-6 text-xs"
                          data-testid={`input-quota-${section.id}`}
                        />
                        {section.maxWins && section.maxWins > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({section.currentWins || 0}/{section.maxWins})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteSectionMutation.mutate(section.id)}
                  disabled={deleteSectionMutation.isPending}
                  className="text-muted-foreground hover:text-accent"
                  data-testid={`button-delete-${section.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-6 border-t border-border">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => clearAllMutation.mutate()}
              disabled={sections.length === 0 || clearAllMutation.isPending}
              className="flex-1 text-sm"
              data-testid="button-clear-all"
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              onClick={() => randomizeColorsMutation.mutate()}
              disabled={sections.length === 0 || randomizeColorsMutation.isPending}
              className="flex-1 text-sm bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-random-colors"
            >
              Random Colors
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
