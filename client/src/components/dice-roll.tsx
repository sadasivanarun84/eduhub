import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dice6 } from "lucide-react";
import type { DiceResult, DiceFace } from "@shared/schema";

interface DiceRollProps {
  faces: DiceFace[];
  disabled?: boolean;
  activeCampaign?: { id: string } | null;
}

interface RollResponse {
  result: DiceResult;
  animation: {
    faceNumber: number;
    totalDegrees: number;
    rotations: number;
  };
}

export function DiceRoll({ faces, disabled, activeCampaign }: DiceRollProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<DiceResult | null>(null);
  const diceRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const rollMutation = useMutation({
    mutationFn: async (): Promise<RollResponse> => {
      const response = await fetch("/api/dice/roll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to roll dice");
      return response.json();
    },
    onSuccess: (data) => {
      // Start the dice animation
      animateDice(data.animation.faceNumber, data.animation.totalDegrees);
      setLastResult(data.result);
      
      // Invalidate relevant queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/dice/campaigns/active"] });
      queryClient.invalidateQueries({ queryKey: [`/api/dice/results?campaignId=${activeCampaign?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/dice/faces?campaignId=${activeCampaign?.id}`] });
    },
    onError: (error) => {
      console.error("Roll failed:", error);
      setIsRolling(false);
    },
  });

  const animateDice = (finalFace: number, totalDegrees: number) => {
    const dice = diceRef.current;
    if (!dice) return;

    setIsRolling(true);

    // Clear any existing transform
    dice.style.transform = "rotateX(0deg) rotateY(0deg)";
    
    // Apply the rotation animation
    setTimeout(() => {
      dice.style.transition = "transform 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      
      // Calculate final rotation to show the correct face
      // Each face is 90 degrees apart in a cube
      const faceRotations = {
        1: { x: 0, y: 0 },      // Front
        2: { x: 0, y: -90 },    // Right
        3: { x: -90, y: 0 },    // Top
        4: { x: 90, y: 0 },     // Bottom
        5: { x: 0, y: 90 },     // Left
        6: { x: 0, y: 180 },    // Back
      };
      
      const finalRotation = faceRotations[finalFace as keyof typeof faceRotations];
      const extraRotations = Math.floor(totalDegrees / 360);
      
      dice.style.transform = `rotateX(${finalRotation.x + (extraRotations * 360)}deg) rotateY(${finalRotation.y + (extraRotations * 360)}deg)`;
    }, 50);

    // Reset animation state after completion
    setTimeout(() => {
      setIsRolling(false);
      if (dice) {
        dice.style.transition = "";
      }
    }, 3500);
  };

  const handleRoll = () => {
    if (isRolling || disabled) return;
    rollMutation.mutate();
  };

  const getFaceData = (faceNumber: number) => {
    return faces.find(f => f.faceNumber === faceNumber) || { 
      text: faceNumber.toString(), 
      color: "#ffffff", 
      textColor: "#000000" 
    };
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Dice6 className="h-6 w-6" />
          Dice Roll
        </CardTitle>
        <CardDescription>
          Roll the dice to win prizes based on campaign quotas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 3D Dice Container */}
        <div className="flex justify-center items-center h-32">
          <div className="dice-container" style={{ perspective: "600px" }}>
            <div
              ref={diceRef}
              className="dice-cube"
              style={{
                width: "80px",
                height: "80px",
                position: "relative",
                transformStyle: "preserve-3d",
                margin: "40px",
                borderRadius: "8px",
              }}
            >
              {/* Dice Faces */}
              {[1, 2, 3, 4, 5, 6].map((faceNumber) => {
                const faceData = getFaceData(faceNumber);
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
                    data-testid={`dice-face-${faceNumber}`}
                  >
                    {faceData.text}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Roll Button */}
        <div className="text-center">
          <Button
            onClick={handleRoll}
            disabled={isRolling || disabled || rollMutation.isPending}
            size="lg"
            className="px-8"
            data-testid="button-roll-dice"
          >
            {isRolling ? "Rolling..." : "Roll Dice"}
          </Button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <Card className="bg-secondary" data-testid="card-last-result">
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Last Roll</div>
                <div className="text-lg font-semibold" data-testid="text-last-winner">
                  {lastResult.winner}
                </div>
                {lastResult.amount && (
                  <div className="text-sm text-green-600" data-testid="text-last-amount">
                    {lastResult.amount}
                  </div>
                )}
                <div className="text-xs text-muted-foreground" data-testid="text-last-face">
                  Face {lastResult.faceNumber}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}