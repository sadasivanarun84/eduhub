import { useRef, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import type { WheelSection, Campaign } from "@shared/schema";

interface SpinningWheelProps {
  sections: WheelSection[];
  onSpinComplete: (winner: string) => void;
  spinDuration?: number[];
}

export function SpinningWheel({ sections, onSpinComplete, spinDuration = [3] }: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isGlowing, setIsGlowing] = useState(false);
  const [buttonGlow, setButtonGlow] = useState(false);
  const glowAnimationRef = useRef<number | null>(null);
  const buttonGlowAnimationRef = useRef<number | null>(null);
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

  const resetCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("POST", `/api/campaigns/${campaignId}/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/spin-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wheel-sections"] });
    },
  });

  useEffect(() => {
    drawWheel();
  }, [sections, currentRotation, isGlowing]);

  // Cleanup glow animation on unmount
  useEffect(() => {
    return () => {
      stopGlowAnimation();
      stopButtonGlowAnimation();
    };
  }, []);

  // Check if the game is over (when current winners reaches total winners limit)
  const isGameOver = activeCampaign && activeCampaign.currentWinners >= activeCampaign.totalWinners;

  // Start button glow animation when wheel is not spinning and game is not over
  useEffect(() => {
    if (!isSpinning && !isGameOver) {
      startButtonGlowAnimation();
    } else {
      stopButtonGlowAnimation();
    }
  }, [isSpinning, isGameOver]);

  // Start glow animation when wheel stops
  const startGlowAnimation = () => {
    setIsGlowing(true);
    let glowState = false;
    
    const animate = () => {
      glowState = !glowState;
      setIsGlowing(glowState);
      glowAnimationRef.current = setTimeout(animate, 500); // Toggle every 500ms
    };
    
    animate();
    // Animation continues until next spin (no automatic stop)
  };

  const stopGlowAnimation = () => {
    if (glowAnimationRef.current) {
      clearTimeout(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }
    setIsGlowing(false);
  };

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

  // Helper functions for color manipulation
  const lightenColor = (color: string, percent: number): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const lightenedR = Math.min(255, Math.round(r + (255 - r) * percent / 100));
    const lightenedG = Math.min(255, Math.round(g + (255 - g) * percent / 100));
    const lightenedB = Math.min(255, Math.round(b + (255 - b) * percent / 100));
    
    return `#${lightenedR.toString(16).padStart(2, '0')}${lightenedG.toString(16).padStart(2, '0')}${lightenedB.toString(16).padStart(2, '0')}`;
  };

  const darkenColor = (color: string, percent: number): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const darkenedR = Math.max(0, Math.round(r - r * percent / 100));
    const darkenedG = Math.max(0, Math.round(g - g * percent / 100));
    const darkenedB = Math.max(0, Math.round(b - b * percent / 100));
    
    return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
  };

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

    // Define light source position (exact center of wheel)
    const lightSourceX = centerX;
    const lightSourceY = centerY;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sections
    const anglePerSection = (2 * Math.PI) / sections.length;

    sections.forEach((section, index) => {
      const startAngle = (index * anglePerSection) + currentRotation;
      const endAngle = ((index + 1) * anglePerSection) + currentRotation;

      // Calculate section center point for lighting calculations
      const sectionCenterAngle = startAngle + anglePerSection / 2;
      const sectionCenterX = centerX + Math.cos(sectionCenterAngle) * radius * 0.5;
      const sectionCenterY = centerY + Math.sin(sectionCenterAngle) * radius * 0.5;
      
      // Calculate distance from light source to section center for lighting intensity
      const lightDistance = Math.sqrt(
        Math.pow(lightSourceX - sectionCenterX, 2) + 
        Math.pow(lightSourceY - sectionCenterY, 2)
      );
      const maxDistance = radius * 1.5;
      const lightIntensity = Math.max(0.2, 1 - (lightDistance / maxDistance));

      // Create gradient that radiates from the direction of the light source
      const gradient = ctx.createRadialGradient(
        sectionCenterX + (lightSourceX - sectionCenterX) * 0.3,
        sectionCenterY + (lightSourceY - sectionCenterY) * 0.3,
        0,
        sectionCenterX,
        sectionCenterY,
        radius * 0.7
      );
      
      // Add glossy effect with light-based intensity
      const baseColor = section.color;
      const lighterColor = lightenColor(baseColor, 30 + lightIntensity * 20);
      const darkerColor = darkenColor(baseColor, 15 + (1 - lightIntensity) * 15);
      
      gradient.addColorStop(0, lighterColor);
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(1, darkerColor);

      // Draw section with glossy gradient
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Add directional shine effect based on light source
      ctx.save();
      
      // Calculate the angle from light source to section center
      const lightToSectionAngle = Math.atan2(
        sectionCenterY - lightSourceY,
        sectionCenterX - lightSourceX
      );
      
      // Create shine arc that faces the light source
      const shineStartAngle = lightToSectionAngle - anglePerSection * 0.15;
      const shineEndAngle = lightToSectionAngle + anglePerSection * 0.15;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius * 0.9, shineStartAngle, shineEndAngle);
      ctx.closePath();
      
      const shineGradient = ctx.createRadialGradient(
        centerX + Math.cos(lightToSectionAngle) * radius * 0.3,
        centerY + Math.sin(lightToSectionAngle) * radius * 0.3,
        0,
        centerX + Math.cos(lightToSectionAngle) * radius * 0.6,
        centerY + Math.sin(lightToSectionAngle) * radius * 0.6,
        radius * 0.5
      );
      
      const shineIntensity = lightIntensity * 0.5;
      shineGradient.addColorStop(0, `rgba(255, 255, 255, ${shineIntensity})`);
      shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = shineGradient;
      ctx.fill();
      ctx.restore();

      // Draw text with word wrapping
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSection / 2);
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Inter";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      // Calculate available space for text
      const availableWidth = radius * 0.35; // Leave more margin for readability
      const lines = wrapText(section.text, availableWidth);
      const lineHeight = 20;
      const totalHeight = lines.length * lineHeight;
      const startY = -(totalHeight / 2) + (lineHeight / 2);
      
      // Draw each line
      lines.forEach((line, lineIndex) => {
        const y = startY + (lineIndex * lineHeight);
        ctx.fillText(line, radius * 0.5, y);
      });
      
      ctx.restore();
    });

    // Draw glowing bulbs within the white border
    const bulbRadius = 6;
    const bulbDistance = radius - 15; // Inside the wheel border
    const numBulbs = 20;
    
    for (let i = 0; i < numBulbs; i++) {
      const bulbAngle = (i / numBulbs) * 2 * Math.PI + currentRotation * 0.1;
      const bulbX = centerX + Math.cos(bulbAngle) * bulbDistance;
      const bulbY = centerY + Math.sin(bulbAngle) * bulbDistance;
      
      // Determine if this bulb should glow (alternating pattern during animation)
      const shouldGlow = !isSpinning && (isGlowing ? i % 2 === 0 : true);
      
      if (shouldGlow) {
        // Draw glow effect first (larger, behind the bulb)
        ctx.save();
        ctx.globalAlpha = isGlowing ? 0.9 : 0.6;
        const glowGradient = ctx.createRadialGradient(bulbX, bulbY, 0, bulbX, bulbY, bulbRadius + (isGlowing ? 12 : 8));
        glowGradient.addColorStop(0, '#ffff00');
        glowGradient.addColorStop(0.3, '#ffd700');
        glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, bulbRadius + (isGlowing ? 12 : 8), 0, 2 * Math.PI);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        ctx.restore();
        
        // Draw main bulb
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, bulbRadius, 0, 2 * Math.PI);
        ctx.fillStyle = isGlowing ? '#ffff44' : '#ffff00';
        ctx.fill();
        ctx.strokeStyle = isGlowing ? '#ffcc00' : '#ffaa00';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Add bright highlight
        ctx.beginPath();
        ctx.arc(bulbX - 2, bulbY - 2, bulbRadius / 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = isGlowing ? 1 : 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // Draw dimmed bulb
        ctx.beginPath();
        ctx.arc(bulbX, bulbY, bulbRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#666600';
        ctx.fill();
        ctx.strokeStyle = '#444400';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffd700";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw the light source (light bulb) - subtle and professional - ON TOP
    ctx.save();
    
    // Light bulb glow effect
    const lightGlow = ctx.createRadialGradient(lightSourceX, lightSourceY, 0, lightSourceX, lightSourceY, 25);
    lightGlow.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    lightGlow.addColorStop(0.4, 'rgba(255, 255, 200, 0.3)');
    lightGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(lightSourceX, lightSourceY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = lightGlow;
    ctx.fill();
    
    // Light bulb main body
    ctx.beginPath();
    ctx.arc(lightSourceX, lightSourceY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Light bulb highlight
    ctx.beginPath();
    ctx.arc(lightSourceX - 2, lightSourceY - 2, 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    
    ctx.restore();
  };

  // Get next winner from rotation sequence
  const getNextWinnerFromSequence = async (): Promise<{ section: WheelSection; visualIndex: number } | null> => {
    if (!activeCampaign) return null;
    
    try {
      const response = await fetch(`/api/campaigns/${activeCampaign.id}/next-winner`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('=== SEQUENCE DEBUG ===');
      console.log('Winner from sequence:', result ? `${result.section.text}(${result.section.amount || 'no amount'}) at index ${result.visualIndex}` : 'null');
      console.log('====================');
      return result;
    } catch (error) {
      console.error("Failed to get next winner:", error);
      // Fallback to random selection if sequence fails
      if (sections.length > 0) {
        const randomSection = sections[Math.floor(Math.random() * sections.length)];
        const randomIndex = sections.findIndex(s => s.id === randomSection.id);
        return { section: randomSection, visualIndex: randomIndex };
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

  // Calculate the rotation needed to land on a specific section using visual index
  const getTargetRotationForSection = (visualIndex: number, targetSection: WheelSection): number => {
    if (visualIndex < 0 || visualIndex >= sections.length) {
      console.error('Invalid visual index:', visualIndex);
      return currentRotation;
    }

    console.log('=== ROTATION DEBUG ===');
    console.log('Target section:', targetSection.text, 'Amount:', targetSection.amount);
    console.log('Visual index:', visualIndex);
    console.log('Total sections:', sections.length);
    console.log('All sections:', sections.map((s, i) => `${i}: ${s.text}(${s.amount || 'no amount'})`));

    const sectionAngle = (2 * Math.PI) / sections.length;
    
    // The pointer is at the top of the wheel (12 o'clock position)
    // Sections are drawn starting from index 0 at 0 degrees (3 o'clock) and go clockwise
    // To have the pointer point at section with visualIndex, we need:
    // sectionMiddle = visualIndex * sectionAngle + sectionAngle/2
    // We want: currentRotation + additionalRotation = -sectionMiddle + pointerOffset
    // Where pointerOffset = -π/2 (top of circle)
    
    const sectionMiddle = visualIndex * sectionAngle + (sectionAngle / 2);
    const pointerOffset = -Math.PI / 2; // Pointer at top
    
    // Calculate the target final rotation
    // We want the section middle to align with the pointer
    let targetFinalRotation = pointerOffset - sectionMiddle;
    
    // Normalize to positive and add minimum rotations for visual effect
    const baseRotations = Math.floor(Math.random() * 3) + 5; // 5-7 full rotations
    targetFinalRotation += baseRotations * 2 * Math.PI;
    
    // Make sure we're rotating forward from current position
    while (targetFinalRotation <= currentRotation) {
      targetFinalRotation += 2 * Math.PI;
    }
    
    console.log('Section angle:', sectionAngle * (180 / Math.PI), 'degrees');
    console.log('Section middle angle:', sectionMiddle * (180 / Math.PI), 'degrees');
    console.log('Target final rotation:', targetFinalRotation * (180 / Math.PI), 'degrees');
    console.log('Current rotation:', currentRotation * (180 / Math.PI), 'degrees');
    console.log('Additional rotation needed:', (targetFinalRotation - currentRotation) * (180 / Math.PI), 'degrees');
    console.log('==================');
    
    return targetFinalRotation;
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
    
    // Check if game is over (campaign limit reached)
    if (activeCampaign && activeCampaign.currentWinners >= activeCampaign.totalWinners) {
      return;
    }

    // Stop any existing glow animation
    stopGlowAnimation();
    setIsSpinning(true);

    // Get the next winner from the rotation sequence
    const winnerResult = await getNextWinnerFromSequence();
    
    if (!winnerResult) {
      setIsSpinning(false);
      return;
    }

    const { section: selectedWinner, visualIndex } = winnerResult;
    const duration = spinDuration[0] * 1000; // Convert to milliseconds
    // Calculate the exact rotation needed to land on the selected winner
    const finalRotation = getTargetRotationForSection(visualIndex, selectedWinner);

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
          
          // Start the glow animation celebration
          startGlowAnimation();
        }, 500);
      }
    };

    requestAnimationFrame(animate);
  };

  const handlePlayAgain = () => {
    if (activeCampaign) {
      resetCampaignMutation.mutate(activeCampaign.id);
    }
  };

  return (
    <div className="flex flex-col items-center h-full" style={{ paddingTop: '0.5rem' }}>
      {/* Wheel Container */}
      <div className="wheel-container inline-block relative mb-8">
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-10" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
          <img 
            src="/location-pin.png" 
            alt="Wheel pointer" 
            className="w-12 h-16 object-contain"
            style={{ maxWidth: '48px', maxHeight: '64px' }}
          />
        </div>
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          className={`rounded-full shadow-2xl transition-opacity duration-300 ${isGameOver ? 'opacity-50' : 'opacity-100'}`}
          data-testid="wheel-canvas"
        />
        {isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 text-white px-6 py-3 rounded-full text-lg font-bold">
              GAME COMPLETED
            </div>
          </div>
        )}
      </div>

      {/* Game Over Message */}
      {isGameOver && (
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold text-red-500 mb-2">🎮 GAME OVER!</div>
          <div className="text-lg text-muted-foreground mb-4">
            Congratulations! You've completed all {activeCampaign?.totalWinners} spins!
          </div>
        </div>
      )}

      {/* Spin Button or Play Again Button */}
      {isGameOver ? (
        <Button
          onClick={handlePlayAgain}
          disabled={resetCampaignMutation.isPending}
          className="spin-button text-primary-foreground px-12 py-4 rounded-full font-bold text-xl shadow-lg disabled:opacity-50 transition-all duration-300 bg-green-600 hover:bg-green-700"
          size="lg"
          data-testid="button-play-again"
        >
          <span>{resetCampaignMutation.isPending ? "Resetting..." : "🎮 PLAY AGAIN"}</span>
        </Button>
      ) : (
        <Button
          onClick={spinWheel}
          disabled={isSpinning || sections.length === 0}
          className={`spin-button text-primary-foreground px-12 py-4 rounded-full font-bold text-xl shadow-lg disabled:opacity-50 transition-all duration-300 ${
            buttonGlow && !isSpinning ? 'shadow-2xl ring-4 ring-yellow-400 ring-opacity-60' : ''
          }`}
          size="lg"
          data-testid="button-spin"
          style={buttonGlow && !isSpinning ? {
            boxShadow: '0 0 30px rgba(255, 255, 0, 0.6), 0 0 60px rgba(255, 255, 0, 0.4)'
          } : {}}
        >
          <span>{isSpinning ? "Spinning..." : "SPIN WHEEL"}</span>
        </Button>
      )}

    </div>
  );
}
