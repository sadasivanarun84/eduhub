import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AuthButton } from "@/components/auth-button";

export default function HomePage() {
  const educationalActivities = [
    {
      id: "popquiz",
      title: "🧠 Knowledge Quiz",
      description: "Comprehensive quiz platform for students and educators! Create custom questions, assign them to learners, and track educational progress across subjects. Build engaging assessments, monitor student performance, and enhance learning outcomes.",
      path: "/popquiz",
      features: ["Multi-subject questions", "Student progress tracking", "Performance analytics", "Educator dashboard", "Customizable categories", "Real-time feedback"],
      status: "Available"
    },
    {
      id: "periodic-table",
      title: "⚛️ Periodic Table",
      description: "Interactive chemistry learning platform with flash cards! Master the periodic table through engaging flash card exercises. Features classroom management, subject organization, and progress tracking for comprehensive chemistry education.",
      path: "/periodic-table",
      features: ["Interactive flash cards", "Classroom management", "Subject organization", "Admin dashboard", "Student progress", "Chemistry mastery"],
      status: "Available"
    },
    // Additional educational content will be added here
  ];

  return (
    <div className="min-h-screen p-4 lg:p-8" data-testid="home-page">
      {/* Header Section */}
      <header className="text-center mb-8 lg:mb-12">
        <div className="flex justify-end mb-4">
          <AuthButton />
        </div>
        <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-4">
          📚 EduHub
        </h1>
        <p className="text-muted-foreground text-lg lg:text-xl max-w-3xl mx-auto">
          Your comprehensive educational quiz platform. Create, manage, and track student assessments with our powerful Knowledge Quiz system designed for modern educators.
        </p>
      </header>

      <div className="max-w-6xl mx-auto">
        {/* Main Educational Tool */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-2xl">
            {educationalActivities.map((activity) => (
              <Card key={activity.id} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 bg-gradient-to-br from-background to-muted/20" data-testid={`activity-card-${activity.id}`}>
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <span className="text-6xl">{activity.title.split(' ')[0]}</span>
                  </div>
                  <CardTitle className="text-3xl group-hover:text-primary transition-colors">
                    {activity.title.substring(2)}
                  </CardTitle>
                  <CardDescription className="text-lg leading-relaxed mt-4">
                    {activity.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Features Grid */}
                  <div>
                    <h4 className="text-base font-semibold text-center mb-4">Platform Features:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {activity.features.map((feature, index) => (
                        <div key={index} className="flex items-center p-2 bg-primary/5 rounded-lg">
                          <span className="w-2 h-2 bg-primary rounded-full mr-3 flex-shrink-0"></span>
                          <span className="text-sm font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Action Button */}
                  <Link href={activity.path}>
                    <Button
                      className="w-full h-12 text-lg font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      variant="default"
                      data-testid={`button-start-${activity.id}`}
                    >
                      🚀 Start Teaching & Learning
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Educational Content Expansion */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-dashed border-primary/30 bg-primary/5" data-testid="expansion-card-1">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-primary">
                📝 Advanced Assessments
              </CardTitle>
              <CardDescription>
                Multi-format questions, timed tests, and comprehensive evaluation tools
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 border-dashed border-secondary/30 bg-secondary/5" data-testid="expansion-card-2">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-secondary">
                📊 Learning Analytics
              </CardTitle>
              <CardDescription>
                Detailed progress reports, performance insights, and learning outcome tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 border-dashed border-accent/30 bg-accent/5" data-testid="expansion-card-3">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-accent">
                🎯 Adaptive Learning
              </CardTitle>
              <CardDescription>
                Personalized question difficulty and intelligent content recommendations
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-3">Empowering Educators, Engaging Students</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                EduHub's Knowledge Quiz platform is designed with modern educational practices in mind. Create meaningful assessments,
                track student progress, and enhance learning outcomes with our comprehensive quiz management system.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}