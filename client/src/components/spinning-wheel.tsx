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

  // Get next winner from rotation sequence
  const getNextWinnerFromSequence = async (): Promise<WheelSection | null> => {
    if (!activeCampaign) return null;
    
    try {
      const response = await fetch(`/api/campaigns/${activeCampaign.id}/next-winner`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const winner = await response.json();
      console.log('=== SEQUENCE DEBUG ===');
      console.log('Winner from sequence:', winner ? `${winner.text}(${winner.amount || 'no amount'})` : 'null');
      console.log('Winner ID:', winner?.id);
      console.log('====================');
      return winner;
    } catch (error) {
      console.error("Failed to get next winner:", error);
      // Fallback to random selection if sequence fails
      if (sections.length > 0) {
        return sections[Math.floor(Math.random() * sections.length)];
      }
      return null;
    }
  };

  // Advance sequence after successful spin
  const advanceSequence = async (): Promise<void> => {
    if (!activeCampaign) return;
    
    try {
      const response = await fetch(`/api/campaigns/${activeCampaign.id}/advance-sequence`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to advance sequence:", error);
    }
  };

  // Calculate the rotation needed to land on a specific section
  const getTargetRotationForSection = (targetSection: WheelSection): number => {
    const sectionIndex = sections.findIndex(s => s.id === targetSection.id);
    if (sectionIndex === -1) {
      console.error('Target section not found in sections array:', targetSection);
      return currentRotation;
    }

    console.log('=== ROTATION DEBUG ===');
    console.log('Target section:', targetSection.text, 'Amount:', targetSection.amount);
    console.log('Section index in array:', sectionIndex);
    console.log('Total sections:', sections.length);
    console.log('All sections:', sections.map((s, i) => `${i}: ${s.text}(${s.amount || 'no amount'})`));

    const sectionAngle = (2 * Math.PI) / sections.length;
    const pointerAngle = -Math.PI / 2; // Pointer points up (top of circle)
    
    // When wheel rotates by currentRotation, section i is at: (i * sectionAngle) + currentRotation
    // The midpoint of section i is at: (i * sectionAngle) + currentRotation + (sectionAngle/2)
    // For pointer to point at this section: (i * sectionAngle) + finalRotation + (sectionAngle/2) = pointerAngle
    // Therefore: finalRotation = pointerAngle - (i * sectionAngle) - (sectionAngle/2)
    
    const sectionMidpointOffset = sectionIndex * sectionAngle + (sectionAngle / 2);
    const targetRotationOffset = pointerAngle - sectionMidpointOffset;
    
    console.log('Section angle:', sectionAngle * (180 / Math.PI), 'degrees');
    console.log('Section midpoint offset:', sectionMidpointOffset * (180 / Math.PI), 'degrees');
    console.log('Target rotation offset:', targetRotationOffset * (180 / Math.PI), 'degrees');
    
    // Normalize to ensure we rotate in the positive direction
    let normalizedOffset = targetRotationOffset;
    while (normalizedOffset <= 0) {
      normalizedOffset += 2 * Math.PI;
    }
    
    // Add multiple rotations for visual effect (3-8 full rotations)
    const baseRotations = Math.random() * 5 + 3;
    const finalRotation = currentRotation + (baseRotations * 2 * Math.PI) + normalizedOffset;
    
    console.log('Final rotation:', finalRotation);
    console.log('==================');
    return finalRotation;
  };

  // Calculate which section is currently under the pointer
  const getWinnerAtCurrentPosition = (): WheelSection | null => {
    if (sections.length === 0) return null;
    
    const sectionAngle = (2 * Math.PI) / sections.length;
    const pointerAngle = -Math.PI / 2; // Pointer points up
    
    // Normalize the current rotation
    const normalizedRotation = currentRotation % (2 * Math.PI);
    
    // Calculate which section the pointer is currently pointing at
    // Pointer angle relative to wheel position
    let relativeAngle = pointerAngle - normalizedRotation;
    
    // Normalize to 0-2π range
    while (relativeAngle < 0) {
      relativeAngle += 2 * Math.PI;
    }
    while (relativeAngle >= 2 * Math.PI) {
      relativeAngle -= 2 * Math.PI;
    }
    
    // Find which section this angle falls into
    const sectionIndex = Math.floor(relativeAngle / sectionAngle);
    
    return sections[sectionIndex] || null;
  };

  // Random selection from a specific set of sections
  const getRandomWinnerFromSections = (availableSections: WheelSection[]): WheelSection => {
    const randomIndex = Math.floor(Math.random() * availableSections.length);
    return availableSections[randomIndex];
  };


  const spinWheel = async () => {
    if (isSpinning || sections.length === 0) return;

    setIsSpinning(true);

    // Get the next winner from the rotation sequence
    const selectedWinner = await getNextWinnerFromSequence();
    
    if (!selectedWinner) {
      setIsSpinning(false);
      return;
    }

    const duration = spinDuration[0] * 1000; // Convert to milliseconds
    // Calculate the exact rotation needed to land on the selected winner
    const finalRotation = getTargetRotationForSection(selectedWinner);

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
        
        setTimeout(async () => {
          // Use the winner from sequence (predetermined)
          onSpinComplete(selectedWinner.text);
          recordSpinMutation.mutate({ 
            winner: selectedWinner.text, 
            amount: selectedWinner.amount || undefined 
          });
          // Advance the sequence index
          await advanceSequence();
          setIsSpinning(false);
        }, 500);
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
