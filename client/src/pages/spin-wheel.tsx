import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SpinningWheel } from "@/components/spinning-wheel";
import { WheelControls } from "@/components/wheel-controls";
import { ResultsPanel } from "@/components/results-panel";
import type { WheelSection } from "@shared/schema";

export default function SpinWheelPage() {
  const [currentResult, setCurrentResult] = useState<string | null>(null);

  const {
    data: wheelSections = [],
    isLoading: sectionsLoading,
    refetch: refetchSections,
  } = useQuery<WheelSection[]>({
    queryKey: ["/api/wheel-sections"],
  });

  return (
    <div className="min-h-screen p-4 lg:p-8" data-testid="spin-wheel-page">
      {/* Header Section */}
      <header className="text-center mb-8 lg:mb-12">
        <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4">
          🎯 Spin Wheel
        </h1>
        <p className="text-muted-foreground text-lg lg:text-xl max-w-2xl mx-auto">
          Create your custom spinning wheel, add sections, and let fortune decide!
        </p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Panel - Wheel Controls */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <WheelControls
              sections={wheelSections}
              isLoading={sectionsLoading}
              onSectionsUpdate={refetchSections}
            />
          </div>

          {/* Center Panel - Spinning Wheel */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <SpinningWheel
              sections={wheelSections}
              onSpinComplete={setCurrentResult}
            />
          </div>

          {/* Right Panel - Results & History */}
          <div className="lg:col-span-1 order-3">
            <ResultsPanel currentResult={currentResult} />
          </div>
        </div>

        {/* Mobile-Optimized Bottom Controls */}
        <div className="lg:hidden mt-8">
          <div className="floating-card rounded-xl p-4">
            <div className="flex items-center justify-between text-center">
              <div className="flex-1">
                <div className="text-2xl mb-1">⚙️</div>
                <div className="text-xs text-muted-foreground">Customize</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-xs text-muted-foreground">Spin</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xs text-muted-foreground">Results</div>
              </div>
              <div className="flex-1">
                <div className="text-2xl mb-1">📋</div>
                <div className="text-xs text-muted-foreground">History</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
