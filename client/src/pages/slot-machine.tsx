import { useState, useEffect } from "react";
import { Link } from "wouter";
import { SlotMachine, type SpinResult } from "@/components/slot-machine";
import { SlotMachineControls } from "@/components/slot-machine-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Settings, X, History, Trophy } from "lucide-react";

interface GameStats {
  totalSpins: number;
  totalWins: number;
  totalWinnings: number;
  biggestWin: number;
  winStreak: number;
  currentStreak: number;
}

export default function SlotMachinePage() {
  const [credits, setCredits] = useState(1000);
  const [bet, setBet] = useState(10);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalSpins: 0,
    totalWins: 0,
    totalWinnings: 0,
    biggestWin: 0,
    winStreak: 0,
    currentStreak: 0,
  });
  const [recentResults, setRecentResults] = useState<SpinResult[]>([]);

  // Load saved game state
  useEffect(() => {
    const savedCredits = localStorage.getItem('slotMachine_credits');
    const savedBet = localStorage.getItem('slotMachine_bet');
    const savedStats = localStorage.getItem('slotMachine_stats');
    const savedResults = localStorage.getItem('slotMachine_results');

    if (savedCredits) setCredits(parseInt(savedCredits));
    if (savedBet) setBet(parseInt(savedBet));
    if (savedStats) setGameStats(JSON.parse(savedStats));
    if (savedResults) setRecentResults(JSON.parse(savedResults));
  }, []);

  // Save game state
  useEffect(() => {
    localStorage.setItem('slotMachine_credits', credits.toString());
    localStorage.setItem('slotMachine_bet', bet.toString());
    localStorage.setItem('slotMachine_stats', JSON.stringify(gameStats));
    localStorage.setItem('slotMachine_results', JSON.stringify(recentResults.slice(-10)));
  }, [credits, bet, gameStats, recentResults]);

  // ESC key support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && settingsPanelOpen) {
        setSettingsPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsPanelOpen]);

  const handleSpinComplete = (result: SpinResult) => {
    // Update stats
    const newStats = {
      ...gameStats,
      totalSpins: gameStats.totalSpins + 1,
    };

    if (result.isWin) {
      newStats.totalWins += 1;
      newStats.totalWinnings += result.payout;
      newStats.currentStreak += 1;
      newStats.winStreak = Math.max(newStats.winStreak, newStats.currentStreak);
      newStats.biggestWin = Math.max(newStats.biggestWin, result.payout);
    } else {
      newStats.currentStreak = 0;
    }

    setGameStats(newStats);
    
    // Add to recent results (keep last 10)
    setRecentResults(prev => [result, ...prev].slice(0, 10));
  };

  const resetGame = () => {
    setCredits(1000);
    setBet(10);
    setGameStats({
      totalSpins: 0,
      totalWins: 0,
      totalWinnings: 0,
      biggestWin: 0,
      winStreak: 0,
      currentStreak: 0,
    });
    setRecentResults([]);
    localStorage.removeItem('slotMachine_credits');
    localStorage.removeItem('slotMachine_bet');
    localStorage.removeItem('slotMachine_stats');
    localStorage.removeItem('slotMachine_results');
  };

  const winRate = gameStats.totalSpins > 0 ? (gameStats.totalWins / gameStats.totalSpins * 100).toFixed(1) : '0.0';

  return (
    <div className="container mx-auto px-4 py-8" data-testid="slot-machine-page">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                🎰 Slot Machine
              </h1>
              <p className="text-muted-foreground">Try your luck with the classic slots!</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSettingsPanelOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Game Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-sm text-muted-foreground">Total Spins</div>
              <div className="text-lg font-bold">{gameStats.totalSpins}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-lg font-bold text-green-600">{winRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-sm text-muted-foreground">Total Won</div>
              <div className="text-lg font-bold text-yellow-600">{gameStats.totalWinnings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-sm text-muted-foreground">Biggest Win</div>
              <div className="text-lg font-bold text-purple-600">{gameStats.biggestWin}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-sm text-muted-foreground">Win Streak</div>
              <div className="text-lg font-bold text-blue-600">{gameStats.currentStreak}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Slot Machine (Center/Left) */}
          <div className="lg:col-span-2 flex justify-center items-start">
            <SlotMachine
              credits={credits}
              bet={bet}
              onCreditsChange={setCredits}
              onSpinComplete={handleSpinComplete}
              onOpenSettings={() => setSettingsPanelOpen(true)}
            />
          </div>

          {/* Recent Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5" />
                  Recent Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentResults.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recentResults.map((result, index) => (
                      <div 
                        key={index}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          result.isWin ? 'bg-green-50 dark:bg-green-950/30' : 'bg-gray-50 dark:bg-gray-950/30'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {result.symbols.map((symbol, i) => (
                            <span key={i} className="text-lg">{symbol}</span>
                          ))}
                        </div>
                        <div className="text-right">
                          {result.isWin ? (
                            <div className="text-green-600 font-medium">
                              +{result.payout}
                            </div>
                          ) : (
                            <div className="text-red-500 text-xs">
                              No win
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    No spins yet - start playing!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Achievement Badges */}
            {gameStats.totalSpins > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {gameStats.totalSpins >= 10 && (
                      <Badge variant="secondary" className="mr-2">
                        🎯 Spinner (10+ spins)
                      </Badge>
                    )}
                    {gameStats.totalWins >= 5 && (
                      <Badge variant="secondary" className="mr-2">
                        🍀 Lucky (5+ wins)
                      </Badge>
                    )}
                    {gameStats.winStreak >= 3 && (
                      <Badge variant="secondary" className="mr-2">
                        🔥 Hot Streak (3+ consecutive)
                      </Badge>
                    )}
                    {gameStats.biggestWin >= 1000 && (
                      <Badge variant="secondary" className="mr-2">
                        💎 Big Winner (1000+)
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-1/3 min-w-[400px] bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
            settingsPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Slot Machine Settings
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSettingsPanelOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <SlotMachineControls
                credits={credits}
                bet={bet}
                onCreditsChange={setCredits}
                onBetChange={setBet}
                onReset={resetGame}
              />
            </div>
          </div>
        </div>

        {/* Overlay */}
        {settingsPanelOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setSettingsPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}