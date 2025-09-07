import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dice6, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ThreeDiceFace, ThreeDiceCampaign } from "@shared/schema";

const threeDiceFaceSchema = z.object({
  text: z.string().min(1, "Prize text is required"),
  color: z.string().min(1, "Background color is required"),
  textColor: z.string().min(1, "Text color is required"),
});

const campaignConfigSchema = z.object({
  totalRolls: z.number().min(1, "Total rolls must be at least 1").max(1000, "Total rolls cannot exceed 1000"),
});

type ThreeDiceFaceForm = z.infer<typeof threeDiceFaceSchema>;
type CampaignConfigForm = z.infer<typeof campaignConfigSchema>;

interface ThreeDiceFaceConfigProps {
  activeCampaign: ThreeDiceCampaign | null;
}

export function ThreeDiceFaceConfig({ activeCampaign }: ThreeDiceFaceConfigProps) {
  const [editingFace, setEditingFace] = useState<ThreeDiceFace | null>(null);
  const [selectedDice, setSelectedDice] = useState(1);
  const [configMode, setConfigMode] = useState<"faces" | "campaign">("faces");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: faces = [], isLoading } = useQuery<ThreeDiceFace[]>({
    queryKey: [`/api/three-dice/faces?campaignId=${activeCampaign?.id}`],
    enabled: !!activeCampaign?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const form = useForm<ThreeDiceFaceForm>({
    resolver: zodResolver(threeDiceFaceSchema),
    defaultValues: {
      text: "",
      color: "#ffffff",
      textColor: "#000000",
    },
  });

  const campaignForm = useForm<CampaignConfigForm>({
    resolver: zodResolver(campaignConfigSchema),
    defaultValues: {
      totalRolls: 100, // Always default to 100
    },
  });

  // Update form when campaign changes
  useEffect(() => {
    if (activeCampaign) {
      campaignForm.reset({
        totalRolls: activeCampaign.totalRolls || 100,
      });
    }
  }, [activeCampaign]);

  const updateFaceMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ThreeDiceFace> }) => {
      const response = await fetch(`/api/three-dice/faces/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update three dice face");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/three-dice/faces?campaignId=${activeCampaign?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/three-dice/campaigns/active"] });
      setEditingFace(null);
      form.reset();
      toast({ title: "Three dice face updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update three dice face", variant: "destructive" });
    },
  });

  const applyToAllFacesMutation = useMutation({
    mutationFn: async (data: { faceNumber: number; updates: Partial<ThreeDiceFace> }) => {
      // Find all faces with the same face number (across all dice)
      const facesToUpdate = faces.filter(f => f.faceNumber === data.faceNumber);
      
      // Update all faces with the same number
      const updatePromises = facesToUpdate.map(face => 
        fetch(`/api/three-dice/faces/${face.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.updates),
        })
      );

      const responses = await Promise.all(updatePromises);
      const failedResponses = responses.filter(r => !r.ok);
      
      if (failedResponses.length > 0) {
        throw new Error(`Failed to update ${failedResponses.length} face(s)`);
      }
      
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/three-dice/faces?campaignId=${activeCampaign?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/three-dice/campaigns/active"] });
      setEditingFace(null);
      form.reset();
      toast({ title: "Applied settings to all matching faces successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to apply to all faces", variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ThreeDiceCampaign> }) => {
      const response = await fetch(`/api/three-dice/campaigns/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update campaign");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/three-dice/campaigns/active"] });
      toast({ title: "Campaign settings updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update campaign settings", variant: "destructive" });
    },
  });

  const handleEditFace = (face: ThreeDiceFace) => {
    setEditingFace(face);
    setSelectedDice(face.diceNumber);
    form.reset({
      text: face.text,
      color: face.color,
      textColor: face.textColor || "#000000",
    });
  };

  const onSubmit = (data: ThreeDiceFaceForm) => {
    if (!editingFace || !activeCampaign) return;

    updateFaceMutation.mutate({
      id: editingFace.id,
      updates: {
        text: data.text,
        color: data.color,
        textColor: data.textColor,
        amount: "$0", // Always set to $0
        maxWins: 0, // Always set to 0 (unlimited)
      },
    });
  };

  const onCampaignSubmit = (data: CampaignConfigForm) => {
    if (!activeCampaign) return;

    updateCampaignMutation.mutate({
      id: activeCampaign.id,
      updates: {
        totalRolls: data.totalRolls,
      },
    });
  };

  const onApplyToAllFaces = (data: ThreeDiceFaceForm) => {
    if (!editingFace || !activeCampaign) return;

    applyToAllFacesMutation.mutate({
      faceNumber: editingFace.faceNumber,
      updates: {
        text: data.text,
        color: data.color,
        textColor: data.textColor,
        amount: "$0", // Always set to $0
        maxWins: 0, // Always set to 0 (unlimited)
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
            Three Dice Configuration
          </CardTitle>
          <CardDescription>No active three dice campaign found</CardDescription>
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
            Three Dice Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>Loading three dice faces...</div>
        </CardContent>
      </Card>
    );
  }

  const dice1Faces = faces.filter(f => f.diceNumber === 1).sort((a, b) => a.faceNumber - b.faceNumber);
  const dice2Faces = faces.filter(f => f.diceNumber === 2).sort((a, b) => a.faceNumber - b.faceNumber);
  const dice3Faces = faces.filter(f => f.diceNumber === 3).sort((a, b) => a.faceNumber - b.faceNumber);


  const renderDiceFaces = (diceFaces: ThreeDiceFace[], diceNumber: number) => (
    <div className="space-y-4">
      {/* Dice Faces Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {diceFaces.map((face) => (
          <Card 
            key={face.id} 
            className="relative cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleEditFace(face)}
            data-testid={`card-dice-${diceNumber}-face-${face.faceNumber}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: face.color }}
                  data-testid={`color-preview-${diceNumber}-${face.faceNumber}`}
                />
                <Badge variant="outline" data-testid={`badge-face-number-${diceNumber}-${face.faceNumber}`}>
                  Face {face.faceNumber}
                </Badge>
              </div>
              <div className="space-y-1">
                <div 
                  className="font-medium text-sm p-2 rounded border" 
                  style={{ backgroundColor: face.color, color: face.textColor || "#000000" }}
                  data-testid={`text-face-prize-${diceNumber}-${face.faceNumber}`}
                >
                  {face.text}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Three Dice Configuration
          </CardTitle>
          <CardDescription>
            Configure campaign settings and dice faces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main configuration tabs */}
          <Tabs value={configMode} onValueChange={(value) => setConfigMode(value as "faces" | "campaign")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="faces" data-testid="tab-faces-config">Dice Faces</TabsTrigger>
              <TabsTrigger value="campaign" data-testid="tab-campaign-config">Campaign Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="faces" className="mt-4">
              {/* Dice selection tabs */}
              <Tabs value={selectedDice.toString()} onValueChange={(value) => setSelectedDice(parseInt(value))}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="1" data-testid="tab-dice-1">Dice 1</TabsTrigger>
                  <TabsTrigger value="2" data-testid="tab-dice-2">Dice 2</TabsTrigger>
                  <TabsTrigger value="3" data-testid="tab-dice-3">Dice 3</TabsTrigger>
                </TabsList>
                <TabsContent value="1" className="mt-4">
                  {renderDiceFaces(dice1Faces, 1)}
                </TabsContent>
                <TabsContent value="2" className="mt-4">
                  {renderDiceFaces(dice2Faces, 2)}
                </TabsContent>
                <TabsContent value="3" className="mt-4">
                  {renderDiceFaces(dice3Faces, 3)}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="campaign" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campaign Settings</CardTitle>
                  <CardDescription>Configure roll limits and other campaign options</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...campaignForm}>
                    <form onSubmit={campaignForm.handleSubmit(onCampaignSubmit)} className="space-y-4">
                      <FormField
                        control={campaignForm.control}
                        name="totalRolls"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Rolls Allowed</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                placeholder="100" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid="input-total-rolls"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          disabled={updateCampaignMutation.isPending}
                          data-testid="button-save-campaign"
                        >
                          {updateCampaignMutation.isPending ? "Saving..." : "Save Settings"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editingFace && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dice6 className="h-5 w-5" />
              Edit Dice {editingFace.diceNumber} - Face {editingFace.faceNumber}
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
                      <FormLabel>Background Color</FormLabel>
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
                            placeholder="#ffffff" 
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
                  name="textColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="color" 
                            {...field} 
                            className="w-16 h-10 p-1 rounded"
                            data-testid="input-face-text-color"
                          />
                          <Input 
                            type="text" 
                            placeholder="#000000" 
                            {...field}
                            className="flex-1"
                            data-testid="input-face-text-color-text"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={updateFaceMutation.isPending || applyToAllFacesMutation.isPending}
                    data-testid="button-save-face"
                  >
                    {updateFaceMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={() => onApplyToAllFaces(form.getValues())}
                    disabled={updateFaceMutation.isPending || applyToAllFacesMutation.isPending}
                    data-testid="button-apply-to-all"
                  >
                    {applyToAllFacesMutation.isPending ? "Applying..." : `Apply to All Face ${editingFace?.faceNumber}s`}
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