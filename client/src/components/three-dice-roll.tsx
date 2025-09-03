import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dice6 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ThreeDiceFace, ThreeDiceCampaign, ThreeDiceResult } from "@shared/schema";

interface ThreeDiceRollProps {
  faces: ThreeDiceFace[];
  disabled?: boolean;
  activeCampaign: ThreeDiceCampaign | null;
}

export function ThreeDiceRoll({ faces, disabled, activeCampaign }: ThreeDiceRollProps) {
  const [isRolling, setIsRolling] = useState(false);
  const dice1Ref = useRef<HTMLDivElement>(null);
  const dice2Ref = useRef<HTMLDivElement>(null);
  const dice3Ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: results = [] } = useQuery<ThreeDiceResult[]>({
    queryKey: [`/api/three-dice/results?campaignId=${activeCampaign?.id}`],
    enabled: !!activeCampaign?.id,
  });

  const lastResult = results[0];

  const rollMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/three-dice/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to roll three dice");
      return response.json();
    },
    onSuccess: (data) => {
      // Start rolling animation for all three dice
      setIsRolling(true);
      
      // Apply rotation animations
      if (dice1Ref.current) {
        dice1Ref.current.style.transform = `rotateX(${data.animation.dice1.totalDegrees}deg)`;
      }
      if (dice2Ref.current) {
        dice2Ref.current.style.transform = `rotateX(${data.animation.dice2.totalDegrees}deg)`;
      }
      if (dice3Ref.current) {
        dice3Ref.current.style.transform = `rotateX(${data.animation.dice3.totalDegrees}deg)`;
      }

      // Stop rolling after animation completes
      setTimeout(() => {
        setIsRolling(false);
        toast({
          title: "Three dice rolled!",
          description: `Results: ${data.result.winner1}, ${data.result.winner2}, ${data.result.winner3}`,
        });
        
        // Invalidate and refetch queries
        queryClient.invalidateQueries({ queryKey: [`/api/three-dice/results?campaignId=${activeCampaign?.id}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/three-dice/campaigns/active"] });
        queryClient.invalidateQueries({ queryKey: [`/api/three-dice/faces?campaignId=${activeCampaign?.id}`] });
      }, 3000);
    },
    onError: () => {
      setIsRolling(false);
      toast({
        title: "Failed to roll three dice",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRoll = () => {
    if (isRolling || disabled) return;
    rollMutation.mutate();
  };

  const getFaceData = (diceNumber: number, faceNumber: number) => {
    return faces.find(f => f.diceNumber === diceNumber && f.faceNumber === faceNumber) || { 
      text: faceNumber.toString(), 
      color: "#ffffff", 
      textColor: "#000000" 
    };
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <Dice6 className="h-6 w-6" />
          Three Dice Roll
        </CardTitle>
        <CardDescription>
          Roll three dice to win prizes based on campaign quotas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 3D Three Dice Container */}
        <div className="flex justify-center items-center h-32 gap-8">
          {[1, 2, 3].map((diceNumber) => (
            <div key={diceNumber} className="dice-container" style={{ perspective: "600px" }}>
              <div
                ref={diceNumber === 1 ? dice1Ref : diceNumber === 2 ? dice2Ref : dice3Ref}
                className="dice-cube"
                style={{
                  width: "80px",
                  height: "80px",
                  position: "relative",
                  transformStyle: "preserve-3d",
                  margin: "40px",
                  borderRadius: "8px",
                  transition: isRolling ? "transform 3s cubic-bezier(0.4, 0.0, 0.2, 1)" : "none",
                }}
              >
                {/* Dice Faces for each dice */}
                {[1, 2, 3, 4, 5, 6].map((faceNumber) => {
                  const faceData = getFaceData(diceNumber, faceNumber);
                  const faceStyles = {
                    1: { transform: "rotateY(0deg) translateZ(40px)" }, // Front
                    2: { transform: "rotateY(90deg) translateZ(40px)" }, // Right
                    3: { transform: "rotateX(90deg) translateZ(40px)" }, // Top
                    4: { transform: "rotateX(-90deg) translateZ(40px)" }, // Bottom
                    5: { transform: "rotateY(-90deg) translateZ(40px)" }, // Left
                    6: { transform: "rotateY(180deg) translateZ(40px)" }, // Back
                  };

                  return (
                    <div
                      key={faceNumber}
                      className="dice-face absolute w-full h-full border border-gray-400 flex items-center justify-center font-bold text-sm rounded-lg text-center"
                      style={{
                        backgroundColor: faceData.color,
                        color: faceData.textColor || "#000000",
                        ...faceStyles[faceNumber as keyof typeof faceStyles],
                      }}
                      data-testid={`dice-${diceNumber}-face-${faceNumber}`}
                    >
                      {faceData.text}
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-sm text-muted-foreground mt-2">
                Dice {diceNumber}
              </div>
            </div>
          ))}
        </div>

        {/* Roll Button */}
        <div className="text-center">
          <Button
            onClick={handleRoll}
            disabled={isRolling || disabled || rollMutation.isPending}
            size="lg"
            className="px-8"
            data-testid="button-roll-three-dice"
          >
            {isRolling ? "Rolling..." : "Roll Three Dice"}
          </Button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <Card className="bg-secondary" data-testid="card-last-result">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">Last Roll</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold" data-testid="text-last-winner-1">
                      {lastResult.winner1}
                    </div>
                    {lastResult.amount1 && (
                      <div className="text-sm text-green-600" data-testid="text-last-amount-1">
                        {lastResult.amount1}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground" data-testid="text-last-dice1-face">
                      Dice 1 - Face {lastResult.dice1Face}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold" data-testid="text-last-winner-2">
                      {lastResult.winner2}
                    </div>
                    {lastResult.amount2 && (
                      <div className="text-sm text-green-600" data-testid="text-last-amount-2">
                        {lastResult.amount2}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground" data-testid="text-last-dice2-face">
                      Dice 2 - Face {lastResult.dice2Face}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold" data-testid="text-last-winner-3">
                      {lastResult.winner3}
                    </div>
                    {lastResult.amount3 && (
                      <div className="text-sm text-green-600" data-testid="text-last-amount-3">
                        {lastResult.amount3}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground" data-testid="text-last-dice3-face">
                      Dice 3 - Face {lastResult.dice3Face}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}