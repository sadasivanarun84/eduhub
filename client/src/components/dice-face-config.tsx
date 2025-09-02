import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Settings, Dice6 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DiceFace, DiceCampaign } from "@shared/schema";

const diceFaceSchema = z.object({
  text: z.string().min(1, "Prize text is required"),
  color: z.string().min(1, "Color is required"),
  amount: z.coerce.number().optional(),
  maxWins: z.coerce.number().min(0, "Max wins must be 0 or greater").optional(),
});

type DiceFaceForm = z.infer<typeof diceFaceSchema>;

interface DiceFaceConfigProps {
  activeCampaign: DiceCampaign | null;
}

export function DiceFaceConfig({ activeCampaign }: DiceFaceConfigProps) {
  const [editingFace, setEditingFace] = useState<DiceFace | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: faces = [], isLoading } = useQuery<DiceFace[]>({
    queryKey: [`/api/dice/faces?campaignId=${activeCampaign?.id}`],
    enabled: !!activeCampaign?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const form = useForm<DiceFaceForm>({
    resolver: zodResolver(diceFaceSchema),
    defaultValues: {
      text: "",
      color: "#ef4444",
      amount: 0,
      maxWins: 0,
    },
  });

  const updateFaceMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<DiceFace> }) => {
      const response = await fetch(`/api/dice/faces/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update dice face");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dice/faces"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dice/campaigns"] });
      setEditingFace(null);
      form.reset();
      toast({ title: "Dice face updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update dice face", variant: "destructive" });
    },
  });

  const handleEditFace = (face: DiceFace) => {
    setEditingFace(face);
    form.reset({
      text: face.text,
      color: face.color,
      amount: face.amount || 0,
      maxWins: face.maxWins || 0,
    });
  };

  const onSubmit = (data: DiceFaceForm) => {
    if (!editingFace || !activeCampaign) return;

    updateFaceMutation.mutate({
      id: editingFace.id,
      updates: {
        text: data.text,
        color: data.color,
        amount: data.amount || null,
        maxWins: data.maxWins || 0,
      },
    });
  };

  const cancelEdit = () => {
    setEditingFace(null);
    form.reset();
  };

  if (!activeCampaign) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dice Configuration
          </CardTitle>
          <CardDescription>No active dice campaign found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dice Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>Loading dice faces...</div>
        </CardContent>
      </Card>
    );
  }

  const totalQuota = faces.reduce((sum, face) => sum + (face.maxWins || 0), 0);
  const usedQuota = faces.reduce((sum, face) => sum + (face.currentWins || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dice Configuration
          </CardTitle>
          <CardDescription>
            Configure the 6 dice faces and their win quotas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quota Summary */}
          <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Total Quota:</span> {totalQuota} wins
            </div>
            <div className="text-sm">
              <span className="font-medium">Used:</span> {usedQuota} wins
            </div>
            <div className="text-sm">
              <span className="font-medium">Remaining:</span> {Math.max(0, totalQuota - usedQuota)} wins
            </div>
          </div>

          {/* Dice Faces Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {faces.map((face) => (
              <Card 
                key={face.id} 
                className="relative cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleEditFace(face)}
                data-testid={`card-dice-face-${face.faceNumber}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: face.color }}
                      data-testid={`color-preview-${face.faceNumber}`}
                    />
                    <Badge variant="outline" data-testid={`badge-face-number-${face.faceNumber}`}>
                      Face {face.faceNumber}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-sm" data-testid={`text-face-prize-${face.faceNumber}`}>
                      {face.text}
                    </div>
                    {face.amount && (
                      <div className="text-xs text-green-600" data-testid={`text-face-amount-${face.faceNumber}`}>
                        ${face.amount}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground" data-testid={`text-face-quota-${face.faceNumber}`}>
                      Quota: {face.currentWins || 0}/{face.maxWins || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editingFace && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dice6 className="h-5 w-5" />
              Edit Face {editingFace.faceNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Text</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter prize description" 
                          {...field} 
                          data-testid="input-face-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="color" 
                            {...field} 
                            className="w-16 h-10 p-1 rounded"
                            data-testid="input-face-color"
                          />
                          <Input 
                            type="text" 
                            placeholder="#000000" 
                            {...field}
                            className="flex-1"
                            data-testid="input-face-color-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Amount ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          min="0"
                          {...field} 
                          data-testid="input-face-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxWins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Wins (Quota)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          min="0"
                          {...field} 
                          data-testid="input-face-max-wins"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={updateFaceMutation.isPending}
                    data-testid="button-save-face"
                  >
                    {updateFaceMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={cancelEdit}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}