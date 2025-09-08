import { useRef, useState, useCallback, useEffect } from "react";
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
  const [buttonGlow, setButtonGlow] = useState(false);
  const rollInProgressRef = useRef(false);
  const buttonGlowAnimationRef = useRef<number | null>(null);
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
      // Rolling animation already started in handleRoll()
      // rollInProgressRef.current is already true
      
      // Generate random tumbling animation for each dice
      const generateTumbleAnimation = (finalFace: number) => {
        const rotations = Math.floor(Math.random() * 3) + 5; // 5-7 full rotations
        const randomX = Math.random() * 360 * rotations;
        const randomY = Math.random() * 360 * rotations;
        const randomZ = Math.random() * 360 * rotations;
        
        // Calculate final position - rotate cube to bring desired face to front
        const faceRotations = {
          1: { x: 0, y: 0, z: 0 },      // Show front face
          2: { x: 0, y: -90, z: 0 },    // Bring right face to front
          3: { x: 90, y: 0, z: 0 },     // Bring top face to front
          4: { x: -90, y: 0, z: 0 },    // Bring bottom face to front
          5: { x: 0, y: 90, z: 0 },     // Bring left face to front
          6: { x: 0, y: 180, z: 0 },    // Bring back face to front
        };
        
        const finalRotation = faceRotations[finalFace as keyof typeof faceRotations];
        
        return {
          intermediate: `rotateX(${randomX}deg) rotateY(${randomY}deg) rotateZ(${randomZ}deg)`,
          final: `rotateX(${finalRotation.x}deg) rotateY(${finalRotation.y}deg) rotateZ(${finalRotation.z}deg)`,
        };
      };

      const dice1Animation = generateTumbleAnimation(data.result.dice1Face);
      const dice2Animation = generateTumbleAnimation(data.result.dice2Face);
      const dice3Animation = generateTumbleAnimation(data.result.dice3Face);

      // Apply tumbling animations
      if (dice1Ref.current) {
        dice1Ref.current.style.transform = dice1Animation.intermediate;
      }
      if (dice2Ref.current) {
        dice2Ref.current.style.transform = dice2Animation.intermediate;
      }
      if (dice3Ref.current) {
        dice3Ref.current.style.transform = dice3Animation.intermediate;
      }

      // After tumbling, land on final faces
      setTimeout(() => {
        if (dice1Ref.current) {
          dice1Ref.current.style.transform = dice1Animation.final;
        }
        if (dice2Ref.current) {
          dice2Ref.current.style.transform = dice2Animation.final;
        }
        if (dice3Ref.current) {
          dice3Ref.current.style.transform = dice3Animation.final;
        }
      }, 2000);

      // Stop rolling and show results after dice settle
      setTimeout(() => {
        setIsRolling(false);
        rollInProgressRef.current = false;
        
        // Invalidate and refetch queries immediately
        Promise.all([
          queryClient.invalidateQueries({ queryKey: [`/api/three-dice/results?campaignId=${activeCampaign?.id}`], refetchType: 'active' }),
          queryClient.invalidateQueries({ queryKey: ["/api/three-dice/campaigns/active"], refetchType: 'active' }),
          queryClient.invalidateQueries({ queryKey: [`/api/three-dice/faces?campaignId=${activeCampaign?.id}`], refetchType: 'active' })
        ]).then(() => {
          // Queries invalidated and refetched successfully
        });
        
        // Show notification after everything settles
        setTimeout(() => {
          toast({
            title: "Three dice rolled!",
            description: `Results: ${data.result.winner1}, ${data.result.winner2}, ${data.result.winner3}`,
          });
        }, 200);
      }, 3200);
    },
    onError: () => {
      setIsRolling(false);
      rollInProgressRef.current = false;
      toast({
        title: "Failed to roll three dice",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRoll = useCallback(() => {
    // Prevent multiple concurrent rolls with multiple checks
    if (isRolling || disabled || rollMutation.isPending || rollInProgressRef.current) {
      console.log("Roll blocked:", { isRolling, disabled, isPending: rollMutation.isPending, inProgress: rollInProgressRef.current });
      return;
    }
    
    console.log("Starting roll...");
    // Set both blocking mechanisms immediately
    rollInProgressRef.current = true;
    setIsRolling(true);
    
    // Reset dice to neutral position before rolling
    if (dice1Ref.current) {
      dice1Ref.current.style.transform = "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    }
    if (dice2Ref.current) {
      dice2Ref.current.style.transform = "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    }
    if (dice3Ref.current) {
      dice3Ref.current.style.transform = "rotateX(0deg) rotateY(0deg) rotateZ(0deg)";
    }
    
    // Start rolling immediately
    rollMutation.mutate();
  }, [isRolling, disabled, rollMutation]);

  // Button glow animation functions
  const startButtonGlowAnimation = () => {
    let glowState = false;
    
    const animate = () => {
      glowState = !glowState;
      setButtonGlow(glowState);
      buttonGlowAnimationRef.current = setTimeout(animate, 1000); // Toggle every 1 second
    };
    
    animate();
  };

  const stopButtonGlowAnimation = () => {
    if (buttonGlowAnimationRef.current) {
      clearTimeout(buttonGlowAnimationRef.current);
      buttonGlowAnimationRef.current = null;
    }
    setButtonGlow(false);
  };

  // Start button glow animation when not rolling
  useEffect(() => {
    if (!isRolling && !disabled && !rollMutation.isPending && !rollInProgressRef.current) {
      startButtonGlowAnimation();
    } else {
      stopButtonGlowAnimation();
    }
  }, [isRolling, disabled, rollMutation.isPending, rollInProgressRef.current]);

  // Cleanup glow animation on unmount
  useEffect(() => {
    return () => {
      stopButtonGlowAnimation();
    };
  }, []);

  // Add keyboard support for rolling dice
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard events if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Prevent repeated keydown events from held keys
      if (event.repeat) {
        return;
      }
      
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        // Additional check to prevent double execution during state updates
        if (!isRolling && !disabled && !rollMutation.isPending && !rollInProgressRef.current) {
          handleRoll();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRoll, isRolling, disabled, rollMutation.isPending]);

  const getFaceData = (diceNumber: number, faceNumber: number) => {
    const face = faces.find(f => f.diceNumber === diceNumber && f.faceNumber === faceNumber);
    return {
      text: face?.text || faceNumber.toString(),
      color: face?.color || "#ffffff",
      textColor: face?.textColor || "#000000"
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
                  borderRadius: "16px",
                  transition: isRolling ? "transform 2s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "transform 1s ease-out",
                }}
              >
                {/* Dice Faces for each dice */}
                {[1, 2, 3, 4, 5, 6].map((faceNumber) => {
                  const faceData = getFaceData(diceNumber, faceNumber);
                  const faceStyles = {
                    1: { transform: "rotateY(0deg) translateZ(40px)" }, // Front
                    2: { transform: "rotateY(90deg) translateZ(40px)" }, // Right
                    3: { transform: "rotateX(-90deg) translateZ(40px)" }, // Top
                    4: { transform: "rotateX(90deg) translateZ(40px)" }, // Bottom
                    5: { transform: "rotateY(-90deg) translateZ(40px)" }, // Left
                    6: { transform: "rotateY(180deg) translateZ(40px)" }, // Back
                  };

                  return (
                    <div
                      key={faceNumber}
                      className="dice-face absolute w-full h-full flex items-center justify-center font-bold text-sm text-center"
                      style={{
                        backgroundColor: faceData.color || "#ffffff",
                        color: faceData.textColor || "#000000",
                        borderRadius: "12px",
                        boxShadow: "inset -2px -2px 4px rgba(0, 0, 0, 0.1), inset 2px 2px 4px rgba(255, 255, 255, 0.3)",
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
        <div className="text-center pt-8">
          <Button
            onClick={handleRoll}
            disabled={isRolling || disabled || rollMutation.isPending || rollInProgressRef.current}
            size="lg"
            className={`px-12 py-4 rounded-full font-bold text-xl shadow-lg disabled:opacity-50 transition-all duration-300 ${
              buttonGlow && !isRolling && !disabled && !rollMutation.isPending && !rollInProgressRef.current 
                ? 'shadow-2xl ring-4 ring-yellow-400 ring-opacity-60' 
                : ''
            }`}
            style={buttonGlow && !isRolling && !disabled && !rollMutation.isPending && !rollInProgressRef.current ? {
              boxShadow: '0 0 30px rgba(255, 255, 0, 0.6), 0 0 60px rgba(255, 255, 0, 0.4)'
            } : {}}
            data-testid="button-roll-three-dice"
          >
            {(isRolling || rollInProgressRef.current) ? "Rolling..." : "ROLL THE DICES"}
          </Button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <Card className="bg-secondary" data-testid="card-last-result">
            <CardContent className="pt-4">
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">Last Roll</div>
                <div className="text-lg font-semibold" data-testid="text-last-winners">
                  {lastResult.winner1} | {lastResult.winner2} | {lastResult.winner3}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}