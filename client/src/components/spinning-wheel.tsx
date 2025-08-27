import { useRef, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { WheelSection, Campaign } from "@shared/schema";

interface SpinningWheelProps {
  sections: WheelSection[];
  onSpinComplete: (winner: string) => void;
}

export function SpinningWheel({ sections, onSpinComplete }: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState([3]);
  const queryClient = useQueryClient();

  // Fetch active campaign for threshold logic
  const { data: activeCampaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns/active"],
    retry: false,
  });

  const recordSpinMutation = useMutation({
    mutationFn: async (data: { winner: string; amount?: number }) => {
      return apiRequest("POST", "/api/spin-results", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spin-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/active"] });
    },
  });

  useEffect(() => {
    drawWheel();
  }, [sections, currentRotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || sections.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number): string[] => {
      // Ensure text is a string
      const textStr = String(text || '');
      const words = textStr.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sections
    const anglePerSection = (2 * Math.PI) / sections.length;

    sections.forEach((section, index) => {
      const startAngle = (index * anglePerSection) + currentRotation;
      const endAngle = ((index + 1) * anglePerSection) + currentRotation;

      // Draw section
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = section.color;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text with word wrapping
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSection / 2);
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Inter";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 2;
      
      // Calculate available space for text
      const availableWidth = radius * 0.35; // Leave more margin for readability
      const lines = wrapText(section.text, availableWidth);
      const lineHeight = 16;
      const totalHeight = lines.length * lineHeight;
      const startY = -(totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line
      lines.forEach((line, lineIndex) => {
        const y = startY + (lineIndex * lineHeight);
        ctx.fillText(line, radius * 0.5, y);
      });
      
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffd700";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  // Intelligent winner selection based on campaign threshold logic
  const determineWinner = (finalRotation: number): WheelSection | null => {
    if (sections.length === 0) return null;

    // Check if we have campaign constraints
    const hasCampaignConstraints = activeCampaign && 
      activeCampaign.totalAmount && 
      activeCampaign.threshold &&
      sections.some(section => section.amount !== null);

    if (!hasCampaignConstraints) {
      // No campaign constraints - use traditional random selection
      return getRandomWinner(finalRotation);
    }

    // Campaign with threshold logic
    const campaign = activeCampaign!;
    const sectionsWithAmounts = sections.filter(section => section.amount !== null);
    const thresholdReached = campaign.currentSpent >= campaign.threshold!;

    if (!thresholdReached) {
      // Threshold not reached - random selection from all sections
      return getRandomWinner(finalRotation);
    }

    // Threshold reached - controlled selection based on remaining budget
    const remainingBudget = campaign.totalAmount! - campaign.currentSpent;
    const remainingWinners = campaign.totalWinners - campaign.currentWinners;

    if (remainingWinners <= 0) {
      // No more winners allowed
      return null;
    }

    // Find affordable prizes that fit within remaining budget
    const affordablePrizes = sectionsWithAmounts.filter(section => 
      (section.amount || 0) <= remainingBudget
    );

    if (affordablePrizes.length === 0) {
      // No affordable prizes - check if there are any non-amount sections
      const nonAmountSections = sections.filter(section => section.amount === null);
      if (nonAmountSections.length > 0) {
        return getRandomWinnerFromSections(nonAmountSections);
      }
      return null;
    }

    // Select from affordable prizes based on budget distribution strategy
    return selectOptimalPrize(affordablePrizes, remainingBudget, remainingWinners);
  };

  // Traditional random selection based on wheel position
  const getRandomWinner = (finalRotation: number): WheelSection => {
    const pointerAngle = -Math.PI / 2;
    const sectionAngle = (2 * Math.PI) / sections.length;
    const angleFromSection0 = (pointerAngle - finalRotation + 2 * Math.PI) % (2 * Math.PI);
    const winnerIndex = Math.floor(angleFromSection0 / sectionAngle);
    return sections[winnerIndex];
  };

  // Random selection from a specific set of sections
  const getRandomWinnerFromSections = (availableSections: WheelSection[]): WheelSection => {
    const randomIndex = Math.floor(Math.random() * availableSections.length);
    return availableSections[randomIndex];
  };

  // Optimal prize selection for controlled distribution
  const selectOptimalPrize = (
    affordablePrizes: WheelSection[], 
    remainingBudget: number, 
    remainingWinners: number
  ): WheelSection => {
    // Strategy: Try to distribute budget optimally across remaining winners
    const averageBudgetPerWinner = remainingBudget / remainingWinners;
    
    // Find prizes close to the average budget per winner
    const optimalPrizes = affordablePrizes.filter(section => {
      const amount = section.amount || 0;
      return amount <= averageBudgetPerWinner * 1.2; // Allow 20% variance
    });

    if (optimalPrizes.length > 0) {
      return getRandomWinnerFromSections(optimalPrizes);
    }

    // Fallback to any affordable prize
    return getRandomWinnerFromSections(affordablePrizes);
  };

  const spinWheel = () => {
    if (isSpinning || sections.length === 0) return;

    setIsSpinning(true);

    const duration = spinDuration[0] * 1000; // Convert to milliseconds
    const spinRotations = Math.random() * 5 + 3; // 3-8 full rotations
    const finalRotation = currentRotation + (spinRotations * 2 * Math.PI);

    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const rotation = currentRotation + (finalRotation - currentRotation) * easeOut;
      setCurrentRotation(rotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Spinning finished
        const finalRot = finalRotation % (2 * Math.PI);
        setCurrentRotation(finalRot);

        // Determine winner using intelligent selection
        const winner = determineWinner(finalRot);

        if (winner) {
          setTimeout(() => {
            onSpinComplete(winner.text);
            recordSpinMutation.mutate({ 
              winner: winner.text, 
              amount: winner.amount || undefined 
            });
            setIsSpinning(false);
          }, 500);
        } else {
          setIsSpinning(false);
        }
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="text-center">
      {/* Wheel Container */}
      <div className="wheel-container inline-block relative mb-8">
        <div className="wheel-pointer"></div>
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="rounded-full shadow-2xl"
          data-testid="wheel-canvas"
        />
      </div>

      {/* Spin Button */}
      <Button
        onClick={spinWheel}
        disabled={isSpinning || sections.length === 0}
        className="spin-button text-primary-foreground px-12 py-4 rounded-full font-bold text-xl shadow-lg mb-6 disabled:opacity-50"
        size="lg"
        data-testid="button-spin"
      >
        <span className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <span>{isSpinning ? "Spinning..." : "SPIN WHEEL"}</span>
        </span>
      </Button>

      {/* Spin Speed Control */}
      <div className="control-panel rounded-lg p-4 inline-block">
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Spin Duration
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Fast</span>
          <Slider
            value={spinDuration}
            onValueChange={setSpinDuration}
            max={5}
            min={1}
            step={1}
            className="w-32"
            data-testid="slider-duration"
          />
          <span className="text-sm text-muted-foreground">Slow</span>
        </div>
      </div>
    </div>
  );
}
