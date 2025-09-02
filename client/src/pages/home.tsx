import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const games = [
    {
      id: "spinwheel",
      title: "🎯 Spin Wheel",
      description: "Create custom spinning wheels with quota-based campaigns. Perfect for giveaways, contests, and random selections with frequency control.",
      path: "/spinwheel",
      features: ["Quota-based prizes", "Campaign management", "Randomized sequences", "Prize tracking"],
      status: "Available"
    },
    // Future games will be added here
  ];

  return (
    <div className="min-h-screen p-4 lg:p-8" data-testid="home-page">
      {/* Header Section */}
      <header className="text-center mb-8 lg:mb-12">
        <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4">
          🎮 Game Hub
        </h1>
        <p className="text-muted-foreground text-lg lg:text-xl max-w-3xl mx-auto">
          Welcome to our collection of interactive games and tools. Choose from various entertaining options designed for events, contests, and fun activities.
        </p>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50" data-testid={`game-card-${game.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl group-hover:text-primary transition-colors">
                    {game.title}
                  </CardTitle>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                    {game.status}
                  </span>
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {game.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Features List */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Features:</h4>
                  <ul className="space-y-1">
                    {game.features.map((feature, index) => (
                      <li key={index} className="text-sm flex items-center">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Separator />
                
                {/* Action Button */}
                <Link href={game.path}>
                  <Button 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
                    variant="outline"
                    data-testid={`button-play-${game.id}`}
                  >
                    Play Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
          
          {/* Coming Soon Card */}
          <Card className="border-2 border-dashed border-muted-foreground/30 bg-muted/30" data-testid="coming-soon-card">
            <CardHeader>
              <CardTitle className="text-2xl text-muted-foreground">
                🚀 More Games Coming Soon
              </CardTitle>
              <CardDescription className="text-base">
                We're working on exciting new games and interactive tools. Stay tuned for updates!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full mr-2"></span>
                  Trivia Games
                </div>
                <div className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full mr-2"></span>
                  Lucky Draw
                </div>
                <div className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full mr-2"></span>
                  Bingo Cards
                </div>
                <div className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full mr-2"></span>
                  Slot Machine
                </div>
              </div>
              <Button 
                className="w-full mt-4" 
                variant="ghost" 
                disabled
                data-testid="button-coming-soon"
              >
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3">Perfect for Events & Contests</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                All our games are designed with professional event management in mind. Whether you're running a corporate event, 
                community contest, or online giveaway, these tools provide the reliability and features you need.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}