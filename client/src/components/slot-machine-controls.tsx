import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Coins, Plus, Minus, RotateCcw, TrendingUp } from "lucide-react";

interface SlotMachineControlsProps {
  credits: number;
  bet: number;
  onCreditsChange: (credits: number) => void;
  onBetChange: (bet: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

const BET_PRESETS = [1, 5, 10, 25, 50, 100];

export function SlotMachineControls({
  credits,
  bet,
  onCreditsChange,
  onBetChange,
  onReset,
  disabled = false
}: SlotMachineControlsProps) {
  const [customBet, setCustomBet] = useState(bet.toString());

  const handleBetChange = (newBet: number) => {
    if (newBet >= 1 && newBet <= credits) {
      onBetChange(newBet);
      setCustomBet(newBet.toString());
    }
  };

  const handleCustomBetSubmit = () => {
    const newBet = parseInt(customBet);
    if (!isNaN(newBet) && newBet >= 1 && newBet <= credits) {
      onBetChange(newBet);
    } else {
      setCustomBet(bet.toString());
    }
  };

  const addCredits = (amount: number) => {
    onCreditsChange(credits + amount);
  };

  const maxBet = () => {
    handleBetChange(Math.min(credits, 100));
  };

  return (
    <div className="space-y-6">
      {/* Credits Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Credit Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">
              Current Credits: <Badge variant="secondary" className="ml-2">{credits}</Badge>
            </div>
            <Button
              onClick={onReset}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Game
            </Button>
          </div>

          {/* Add Credits Buttons */}
          <div className="space-y-2">
            <Label>Add Credits</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => addCredits(100)} variant="outline" size="sm">
                +100
              </Button>
              <Button onClick={() => addCredits(500)} variant="outline" size="sm">
                +500
              </Button>
              <Button onClick={() => addCredits(1000)} variant="outline" size="sm">
                +1000
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Betting Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Betting Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Bet Display */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Current Bet</div>
            <div className="text-2xl font-bold text-blue-600">{bet} Credits</div>
          </div>

          {/* Bet Adjustment Slider */}
          <div className="space-y-2">
            <Label>Bet Amount</Label>
            <div className="space-y-2">
              <Slider
                value={[bet]}
                onValueChange={([value]) => handleBetChange(value)}
                min={1}
                max={Math.min(credits, 100)}
                step={1}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>{Math.min(credits, 100)}</span>
              </div>
            </div>
          </div>

          {/* Bet Preset Buttons */}
          <div className="space-y-2">
            <Label>Quick Bet</Label>
            <div className="grid grid-cols-3 gap-2">
              {BET_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  onClick={() => handleBetChange(preset)}
                  variant={bet === preset ? "default" : "outline"}
                  size="sm"
                  disabled={disabled || preset > credits}
                  className="text-sm"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Fine Bet Controls */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handleBetChange(Math.max(1, bet - 1))}
              variant="outline"
              size="sm"
              disabled={disabled || bet <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <Input
                type="number"
                value={customBet}
                onChange={(e) => setCustomBet(e.target.value)}
                onBlur={handleCustomBetSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomBetSubmit()}
                min={1}
                max={credits}
                disabled={disabled}
                className="text-center"
                placeholder="Custom bet"
              />
            </div>
            <Button
              onClick={() => handleBetChange(Math.min(credits, bet + 1))}
              variant="outline"
              size="sm"
              disabled={disabled || bet >= credits}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Max Bet Button */}
          <Button
            onClick={maxBet}
            variant="destructive"
            className="w-full"
            disabled={disabled || bet >= Math.min(credits, 100)}
          >
            Max Bet ({Math.min(credits, 100)})
          </Button>
        </CardContent>
      </Card>

      {/* Paytable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💰 Paytable</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>🍒🍒🍒</span>
                  <span className="font-medium">300x</span>
                </div>
                <div className="flex justify-between">
                  <span>🍋🍋🍋</span>
                  <span className="font-medium">450x</span>
                </div>
                <div className="flex justify-between">
                  <span>🍊🍊🍊</span>
                  <span className="font-medium">600x</span>
                </div>
                <div className="flex justify-between">
                  <span>🍇🍇🍇</span>
                  <span className="font-medium">750x</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>🔔🔔🔔</span>
                  <span className="font-medium">1500x</span>
                </div>
                <div className="flex justify-between">
                  <span>⭐⭐⭐</span>
                  <span className="font-medium">3000x</span>
                </div>
                <div className="flex justify-between">
                  <span>💎💎💎</span>
                  <span className="font-medium text-yellow-500">10000x</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Any 2 of a kind</span>
                  <span>50x-1250x</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}