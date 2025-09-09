import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SlotSymbol {
  id: string;
  symbol: string;
  value: number;
  rarity: number; // Higher = rarer
}

export interface SpinResult {
  symbols: string[];
  isWin: boolean;
  payout: number;
  winType?: string;
}

interface SlotMachineProps {
  onSpinComplete?: (result: SpinResult) => void;
  disabled?: boolean;
  credits: number;
  bet: number;
  onCreditsChange: (credits: number) => void;
  onOpenSettings?: () => void;
}

const DEFAULT_SYMBOLS: SlotSymbol[] = [
  { id: "cherry", symbol: "🍒", value: 10, rarity: 1 },
  { id: "lemon", symbol: "🍋", value: 15, rarity: 2 },
  { id: "orange", symbol: "🍊", value: 20, rarity: 2 },
  { id: "grape", symbol: "🍇", value: 25, rarity: 3 },
  { id: "bell", symbol: "🔔", value: 50, rarity: 4 },
  { id: "star", symbol: "⭐", value: 100, rarity: 5 },
  { id: "diamond", symbol: "💎", value: 250, rarity: 8 },
];

const WINNING_COMBINATIONS = [
  { symbols: ["🍒", "🍒", "🍒"], payout: 300, type: "Triple Cherry" },
  { symbols: ["🍋", "🍋", "🍋"], payout: 450, type: "Triple Lemon" },
  { symbols: ["🍊", "🍊", "🍊"], payout: 600, type: "Triple Orange" },
  { symbols: ["🍇", "🍇", "🍇"], payout: 750, type: "Triple Grape" },
  { symbols: ["🔔", "🔔", "🔔"], payout: 1500, type: "Triple Bell" },
  { symbols: ["⭐", "⭐", "⭐"], payout: 3000, type: "Triple Star" },
  { symbols: ["💎", "💎", "💎"], payout: 10000, type: "Triple Diamond" },
  // Two of a kind
  { symbols: ["🍒", "🍒"], payout: 50, type: "Double Cherry" },
  { symbols: ["🍋", "🍋"], payout: 75, type: "Double Lemon" },
  { symbols: ["🍊", "🍊"], payout: 100, type: "Double Orange" },
  { symbols: ["🍇", "🍇"], payout: 125, type: "Double Grape" },
  { symbols: ["🔔", "🔔"], payout: 250, type: "Double Bell" },
  { symbols: ["⭐", "⭐"], payout: 500, type: "Double Star" },
  { symbols: ["💎", "💎"], payout: 1250, type: "Double Diamond" },
];

interface ReelState {
  symbols: string[];
  translateY: number;
  isAnimating: boolean;
}

export function SlotMachine({ 
  onSpinComplete, 
  disabled = false, 
  credits, 
  bet, 
  onCreditsChange,
  onOpenSettings
}: SlotMachineProps) {
  const [reels, setReels] = useState<string[]>(["💎", "💎", "💎"]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [reelStates, setReelStates] = useState<ReelState[]>([
    { symbols: [], translateY: 0, isAnimating: false },
    { symbols: [], translateY: 0, isAnimating: false },
    { symbols: [], translateY: 0, isAnimating: false },
  ]);

  // Initialize reel states with default symbols
  useEffect(() => {
    const initialStates = reels.map((symbol) => {
      const currentIndex = DEFAULT_SYMBOLS.findIndex(s => s.symbol === symbol);
      const prevSymbol = DEFAULT_SYMBOLS[(currentIndex - 1 + DEFAULT_SYMBOLS.length) % DEFAULT_SYMBOLS.length].symbol;
      const nextSymbol = DEFAULT_SYMBOLS[(currentIndex + 1) % DEFAULT_SYMBOLS.length].symbol;
      return {
        symbols: [prevSymbol, symbol, nextSymbol],
        translateY: 0, // Position so symbols start at top of container
        isAnimating: false
      };
    });
    setReelStates(initialStates);
  }, []);

  const generateWeightedSymbol = (): string => {
    const totalWeight = DEFAULT_SYMBOLS.reduce((sum, s) => sum + (10 - s.rarity), 0);
    let random = Math.random() * totalWeight;
    
    for (const symbol of DEFAULT_SYMBOLS) {
      random -= (10 - symbol.rarity);
      if (random <= 0) {
        return symbol.symbol;
      }
    }
    return DEFAULT_SYMBOLS[0].symbol;
  };

  const checkWinning = (symbols: string[]): { isWin: boolean; payout: number; winType?: string } => {
    // Check for exact matches first (3 of a kind)
    const exactMatch = WINNING_COMBINATIONS.find(combo => 
      combo.symbols.length === 3 && 
      symbols[0] === combo.symbols[0] && 
      symbols[1] === combo.symbols[1] && 
      symbols[2] === combo.symbols[2]
    );

    if (exactMatch) {
      return { isWin: true, payout: exactMatch.payout, winType: exactMatch.type };
    }

    // Check for two of a kind
    const symbolCounts = symbols.reduce((acc, symbol) => {
      acc[symbol] = (acc[symbol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    for (const [symbol, count] of Object.entries(symbolCounts)) {
      if (count >= 2) {
        const doubleMatch = WINNING_COMBINATIONS.find(combo => 
          combo.symbols.length === 2 && combo.symbols[0] === symbol
        );
        if (doubleMatch) {
          return { isWin: true, payout: doubleMatch.payout, winType: doubleMatch.type };
        }
      }
    }

    return { isWin: false, payout: 0 };
  };

  const animateReel = (reelIndex: number, finalSymbol: string, duration: number) => {
    return new Promise<void>((resolve) => {
      const startTime = Date.now();
      const symbols = [...DEFAULT_SYMBOLS.map(s => s.symbol)];
      const itemHeight = 80;
      
      // Create the final result context first
      const finalIndex = DEFAULT_SYMBOLS.findIndex(s => s.symbol === finalSymbol);
      const prevSymbol = DEFAULT_SYMBOLS[(finalIndex - 1 + DEFAULT_SYMBOLS.length) % DEFAULT_SYMBOLS.length].symbol;
      const nextSymbol = DEFAULT_SYMBOLS[(finalIndex + 1) % DEFAULT_SYMBOLS.length].symbol;
      
      // Create a long animation sequence for the longer duration
      const animationSymbols = [];
      
      // Start with some symbols to ensure immediate visibility
      animationSymbols.push(prevSymbol, finalSymbol, nextSymbol);
      
      // Add enough symbols for spinning effect but not too many to avoid memory issues
      for (let round = 0; round < 4; round++) { // 4 rounds = 28 symbols (sufficient for long animation)
        animationSymbols.push(...symbols);
      }
      
      // Add the final sequence that will be visible at the end
      animationSymbols.push(prevSymbol, finalSymbol, nextSymbol);
      
      // Position calculation: we want finalSymbol to end up at 80px (center of yellow bar)
      // finalSymbol is at index (animationSymbols.length - 2)
      const finalSymbolIndex = animationSymbols.length - 2;
      const finalTranslateY = 80 - (finalSymbolIndex * itemHeight);
      
      // Start position: Start with first symbols visible in the container
      // Since we added initial symbols (prevSymbol, finalSymbol, nextSymbol) at the beginning,
      // position so they fill the visible area initially
      const startTranslateY = 0; // Start with initial symbols properly positioned

      // Set initial spinning state with long symbol list for animation
      setReelStates(prev => prev.map((state, index) => 
        index === reelIndex 
          ? { symbols: animationSymbols, translateY: startTranslateY, isAnimating: true }
          : state
      ));

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
          // Use easeInOutQuart for realistic deceleration
          const easeInOutQuart = progress < 0.5 
            ? 8 * progress * progress * progress * progress
            : 1 - 8 * (1 - progress) * (1 - progress) * (1 - progress) * (1 - progress);
          
          const currentPosition = startTranslateY + (finalTranslateY - startTranslateY) * easeInOutQuart;
          
          // Update transform position during animation
          setReelStates(prev => prev.map((state, index) => 
            index === reelIndex 
              ? { ...state, translateY: currentPosition }
              : state
          ));
          
          requestAnimationFrame(animate);
        } else {
          // Animation complete - just stop animating, keep the final position
          setReelStates(prev => prev.map((state, index) => 
            index === reelIndex 
              ? { 
                  ...state, // Keep all symbols and translateY exactly as they are
                  isAnimating: false // Just mark as not animating
                }
              : state
          ));
          
          // Update the main reels state to match the actual final symbol
          setReels(prev => prev.map((symbol, idx) => 
            idx === reelIndex ? finalSymbol : symbol
          ));
          
          // Don't do immediate cleanup - let the win result logic handle it
          
          resolve();
        }
      };

      animate();
    });
  };

  const handleSpin = async () => {
    if (isSpinning || disabled || credits < bet) return;

    setIsSpinning(true);
    const newCredits = credits - bet;
    onCreditsChange(newCredits);

    // Generate final symbols
    const finalSymbols = [
      generateWeightedSymbol(),
      generateWeightedSymbol(),
      generateWeightedSymbol(),
    ];

    try {
      // Animate reels with longer duration and staggered stops for more suspense
      const animationPromises = finalSymbols.map((symbol, index) => 
        animateReel(index, symbol, 10000 + (index * 1500)) // Much longer: 10s, 11.5s, 13s
      );

      // Wait for all animations to complete
      await Promise.all(animationPromises);

      // Check for winning combination
      const winResult = checkWinning(finalSymbols);
      const result: SpinResult = {
        symbols: finalSymbols,
        isWin: winResult.isWin,
        payout: winResult.payout,
        winType: winResult.winType,
      };

      // Update credits if win
      if (result.isWin) {
        onCreditsChange(newCredits + result.payout);
      }

      // Update state
      setReels(finalSymbols);
      setLastResult(result);
      onSpinComplete?.(result);

      // Clear win result and cleanup reel states
      if (result.isWin) {
        setTimeout(() => {
          setLastResult(null);
          // Clean up reel states after win display ends
          setTimeout(() => {
            setReelStates(prev => prev.map((state, index) => {
              const symbolIndex = DEFAULT_SYMBOLS.findIndex(s => s.symbol === finalSymbols[index]);
              return {
                symbols: [
                  DEFAULT_SYMBOLS[(symbolIndex - 1 + DEFAULT_SYMBOLS.length) % DEFAULT_SYMBOLS.length].symbol,
                  finalSymbols[index],
                  DEFAULT_SYMBOLS[(symbolIndex + 1) % DEFAULT_SYMBOLS.length].symbol
                ],
                translateY: 0,
                isAnimating: false
              };
            }));
          }, 500); // Small delay after win popup disappears
        }, 10000);
      } else {
        // For non-wins, cleanup after 3 seconds
        setTimeout(() => {
          setReelStates(prev => prev.map((state, index) => {
            const symbolIndex = DEFAULT_SYMBOLS.findIndex(s => s.symbol === finalSymbols[index]);
            return {
              symbols: [
                DEFAULT_SYMBOLS[(symbolIndex - 1 + DEFAULT_SYMBOLS.length) % DEFAULT_SYMBOLS.length].symbol,
                finalSymbols[index],
                DEFAULT_SYMBOLS[(symbolIndex + 1) % DEFAULT_SYMBOLS.length].symbol
              ],
              translateY: 0,
              isAnimating: false
            };
          }));
        }, 3000);
      }
    } catch (error) {
      console.error('Animation error:', error);
      // Fallback: just update the reels without animation
      setReels(finalSymbols);
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6 bg-gradient-to-b from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-xl border-4 border-amber-300 dark:border-amber-700 shadow-2xl">
      {/* Slot Machine Display */}
      <div className="relative bg-gradient-to-b from-gray-800 to-black p-8 rounded-2xl shadow-2xl border-4 border-gray-600">
        {/* Machine Frame */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-gray-700 via-gray-800 to-black shadow-inner"></div>
        
        {/* Single Continuous Yellow Highlight Bar - Perfectly Centered */}
        <div 
          className="absolute z-20 pointer-events-none border-2 border-yellow-400"
          style={{
            top: '112px', // Exactly center of middle row (32px frame + 80px top row = 112px)
            left: '40px',  // Account for frame padding
            right: '40px',
            height: '80px',
            background: 'linear-gradient(90deg, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.3) 20%, rgba(255,215,0,0.4) 50%, rgba(255,215,0,0.3) 80%, rgba(255,215,0,0.1) 100%)',
            borderRadius: '8px',
            boxShadow: 'inset 0 0 15px rgba(255,215,0,0.4), 0 0 10px rgba(255,215,0,0.2)'
          }}
        ></div>

        <div className="relative flex space-x-6">
          {reels.map((symbol, index) => (
            <div key={index} className="relative">
              {/* Reel Window Container */}
              <div 
                className="relative w-24 bg-gradient-to-b from-gray-200 to-gray-100 rounded-lg shadow-2xl border-4 border-gray-400"
                style={{
                  height: '240px', // Show 3 items (80px each)
                  background: 'linear-gradient(to bottom, #e5e7eb, #f3f4f6)',
                  boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.3), inset 0 -4px 8px rgba(0,0,0,0.2)'
                }}
              >
                {/* Top Gradient Mask */}
                <div 
                  className="absolute top-0 left-0 right-0 z-10 pointer-events-none rounded-t-lg"
                  style={{
                    height: '80px',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)'
                  }}
                ></div>
                
                {/* Bottom Gradient Mask */}
                <div 
                  className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none rounded-b-lg"
                  style={{
                    height: '80px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)'
                  }}
                ></div>

                {/* Reel Content */}
                <div 
                  className="absolute top-0 left-0 w-full overflow-hidden"
                  style={{
                    height: '240px',
                    borderRadius: '4px'
                  }}
                >
                  {/* Animated reel content */}
                  <div 
                    className="absolute w-full transition-transform"
                    style={{
                      transform: `translateY(${reelStates[index].translateY}px)`,
                      transitionDuration: reelStates[index].isAnimating ? '0ms' : '300ms',
                      transitionTimingFunction: 'ease-out'
                    }}
                  >
                    {reelStates[index].symbols.length > 0 ? (
                      // Show reel symbols with proper sizing
                      reelStates[index].symbols.map((sym, symIndex) => {
                        // Calculate which symbol is in the middle position (center of yellow highlight bar at 80px)
                        const symbolTopPosition = reelStates[index].translateY + (symIndex * 80);
                        const isInMiddleSlot = !reelStates[index].isAnimating && 
                          (Math.abs(symbolTopPosition - 80) < 10 || (symIndex === 1 && reelStates[index].translateY === 0)); // Handle both animation end and clean states
                        
                        return (
                          <div
                            key={`${symIndex}-${sym}`}
                            className={`absolute flex items-center justify-center font-bold transition-all duration-300 ${
                              isInMiddleSlot ? (lastResult?.isWin ? 'text-3xl animate-pulse' : 'text-3xl') : 'text-2xl'
                            }`}
                            style={{
                              top: `${symIndex * 80}px`,
                              width: '100%',
                              height: '80px',
                              opacity: !reelStates[index].isAnimating ? 
                                (isInMiddleSlot ? 1 : 0.4) : 1,
                              transform: isInMiddleSlot ? 'scale(1.05)' : 'scale(1)',
                              zIndex: isInMiddleSlot ? 10 : 1,
                            }}
                          >
                            {sym}
                          </div>
                        );
                      })
                    ) : (
                      // Default display when no animation symbols - this should match the initialized state  
                      <>
                        <div className="absolute flex items-center justify-center text-xl font-bold opacity-40" 
                             style={{ top: '0px', width: '100%', height: '80px' }}>
                          {reelStates[index].symbols[0] || DEFAULT_SYMBOLS[(DEFAULT_SYMBOLS.findIndex(s => s.symbol === symbol) - 1 + DEFAULT_SYMBOLS.length) % DEFAULT_SYMBOLS.length].symbol}
                        </div>
                        <div className="absolute flex items-center justify-center text-3xl font-bold" 
                             style={{ top: '80px', width: '100%', height: '80px' }}>
                          {reelStates[index].symbols[1] || symbol}
                        </div>
                        <div className="absolute flex items-center justify-center text-xl font-bold opacity-40" 
                             style={{ top: '160px', width: '100%', height: '80px' }}>
                          {reelStates[index].symbols[2] || DEFAULT_SYMBOLS[(DEFAULT_SYMBOLS.findIndex(s => s.symbol === symbol) + 1) % DEFAULT_SYMBOLS.length].symbol}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cylindrical Side Shading */}
                <div 
                  className="absolute inset-0 pointer-events-none rounded-lg"
                  style={{
                    background: 'linear-gradient(90deg, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.3) 100%)'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Win Indicator - moved outside the machine frame */}
      </div>

      {/* Credits Display */}
      <div className="flex items-center space-x-4 text-lg font-semibold">
        <div 
          className="bg-green-100 dark:bg-green-900 px-4 py-2 rounded-lg border-2 border-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-800 transition-colors duration-200 text-green-800 dark:text-green-200"
          onClick={onOpenSettings}
          title="Click to open settings"
        >
          💰 Credits: {credits}
        </div>
        <div 
          className="bg-blue-100 dark:bg-blue-900 px-4 py-2 rounded-lg border-2 border-blue-400 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 text-blue-800 dark:text-blue-200"
          onClick={onOpenSettings}
          title="Click to adjust bet amount"
        >
          🎯 Bet: {bet}
        </div>
      </div>

      {/* Win Indicator - positioned below credits */}
      {lastResult?.isWin && (
        <div className="flex justify-center">
          <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-xl px-8 py-3 animate-pulse shadow-lg border-2 border-yellow-300 rounded-full">
            🎉 {lastResult.winType}! +{lastResult.payout} 🎉
          </Badge>
        </div>
      )}

      {/* Spin Button */}
      <Button
        onClick={handleSpin}
        disabled={isSpinning || disabled || credits < bet}
        className="w-32 h-12 text-lg font-bold bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        style={{
          background: isSpinning 
            ? 'linear-gradient(45deg, #ff6b6b, #ff8e8e)' 
            : 'linear-gradient(45deg, #ff4757, #ff6b7d)'
        }}
      >
        {isSpinning ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>SPINNING</span>
          </div>
        ) : (
          "🎰 SPIN"
        )}
      </Button>

      {credits < bet && (
        <div className="text-red-500 text-sm font-medium">
          Insufficient credits to spin!
        </div>
      )}
    </div>
  );
}