import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SpinningWheel } from "@/components/spinning-wheel";
import { WheelControls } from "@/components/wheel-controls";
import { ResultsPanel } from "@/components/results-panel";
import { CampaignConfig } from "@/components/campaign-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Settings, X } from "lucide-react";
import type { WheelSection } from "@shared/schema";

export default function SpinWheelPage() {
  const [currentResult, setCurrentResult] = useState<string | null>(null);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [spinDuration, setSpinDuration] = useState([3]);

  const {
    data: wheelSections = [],
    isLoading: sectionsLoading,
    refetch: refetchSections,
  } = useQuery<WheelSection[]>({
    queryKey: ["/api/wheel-sections"],
  });

  // Add ESC key support to close settings panel
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && settingsPanelOpen) {
        setSettingsPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsPanelOpen]);

  return (
    <div className="container mx-auto px-4 py-8" data-testid="spin-wheel-page">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" data-testid="link-home">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                🎯 Spin Wheel Game
              </h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSettingsPanelOpen(true)}
            data-testid="button-open-settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content - Wheel and Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start min-h-[600px]">
          {/* Left Side - Spinning Wheel */}
          <div className="flex justify-center h-full">
            <SpinningWheel
              sections={wheelSections}
              onSpinComplete={setCurrentResult}
              spinDuration={spinDuration}
            />
          </div>

          {/* Right Side - Results Panel */}
          <div>
            <ResultsPanel currentResult={currentResult} />
          </div>
        </div>

        {/* Sliding Settings Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-1/3 bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
            settingsPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid="settings-panel"
        >
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Spin Wheel Settings
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSettingsPanelOpen(false)}
                data-testid="button-close-settings"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <Tabs defaultValue="wheel" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="wheel" data-testid="tab-wheel-config">
                    🎯 Sections
                  </TabsTrigger>
                  <TabsTrigger value="spin" data-testid="tab-spin-config">
                    🎮 Spin
                  </TabsTrigger>
                  <TabsTrigger value="campaign" data-testid="tab-campaign-config">
                    ⚙️ Campaign
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="wheel">
                  <WheelControls
                    sections={wheelSections}
                    isLoading={sectionsLoading}
                    onSectionsUpdate={refetchSections}
                  />
                </TabsContent>
                <TabsContent value="spin">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Spin Settings</h3>
                    
                    {/* Spin Duration Control */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium">
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
                          className="flex-1"
                          data-testid="slider-duration"
                        />
                        <span className="text-sm text-muted-foreground">Slow</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current: {spinDuration[0]}s
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="campaign">
                  <CampaignConfig onCampaignUpdate={refetchSections} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Overlay */}
        {settingsPanelOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setSettingsPanelOpen(false)}
            data-testid="settings-panel-overlay"
          />
        )}
      </div>
    </div>
  );
}
