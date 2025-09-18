import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth-provider";
import { AuthButton } from "@/components/auth-button";
import { quizAPI, type QuizQuestion } from "@/lib/quiz-api";
import { QuizAdmin } from "@/components/quiz-admin";
import { Settings } from "lucide-react";
import { getBackgroundById, updateBackgroundImages } from "@/lib/quiz-backgrounds";

const getCategoryEmoji = (category: string): string => {
  const emojiMap: Record<string, string> = {
    'Traffic': '🚦',
    'Car': '🚗',
    'General Knowledge': '🧠',
    'Science': '🔬',
    'Math': '🔢'
  };
  return emojiMap[category] || '📝';
};

const SUPER_ADMIN_EMAIL = 'sadasivanarun84@gmail.com';

// Default background image
const DEFAULT_BACKGROUND = 'https://storage.googleapis.com/gamehub-61b0e.firebasestorage.app/quiz-images/488154a9-0c1c-41f7-874d-1e055a0f3b43.jpg';

// Function to get the appropriate background image
const getBackgroundImage = (currentQuestion?: QuizQuestion): string => {
  console.log('getBackgroundImage called with:', currentQuestion);

  // If question has a direct backgroundImage URL, use it
  if (currentQuestion?.backgroundImage) {
    console.log('Using direct backgroundImage URL:', currentQuestion.backgroundImage);
    return currentQuestion.backgroundImage;
  }

  console.log('Using default background');
  return DEFAULT_BACKGROUND;
};

interface QuizSession {
  currentQuestion: number;
  score: number;
  answered: boolean[];
  userAnswers: (number | null)[];
  sessionQuestions: QuizQuestion[];
}

type QuizState = 'welcome' | 'playing' | 'congratulations';

export function PopQuizPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [session, setSession] = useState<QuizSession>({
    currentQuestion: 0,
    score: 0,
    answered: [],
    userAnswers: [],
    sessionQuestions: []
  });
  const [quizState, setQuizState] = useState<QuizState>('welcome');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [congratsTimer, setCongratTimer] = useState(0);

  useEffect(() => {
    // Load background images when component mounts
    const loadBackgroundImages = async () => {
      try {
        const images = await quizAPI.getBackgroundImages();
        updateBackgroundImages(images);
      } catch (error) {
        console.error('Failed to load background images:', error);
      }
    };

    loadBackgroundImages();
  }, []);

  useEffect(() => {
    if (user) {
      // Super admin gets admin interface by default, regular users load their questions
      if (user.email === SUPER_ADMIN_EMAIL) {
        setShowAdmin(true);
      } else {
        loadQuestions();
      }
    }
  }, [user]);

  // Reset button styles when question changes
  useEffect(() => {
    // Clear any inline styles from previous question's hover effects
    const buttons = document.querySelectorAll('[data-answer-button]');
    buttons.forEach((button) => {
      (button as HTMLElement).style.backgroundColor = '';
    });
  }, [session.currentQuestion]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      if (!user?.email) return;

      const userQuestions = await quizAPI.getMyQuestions();

      setQuestions(userQuestions);
      // Questions are loaded, but we start with welcome screen
      setQuizState('welcome');
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const startQuizSession = () => {
    // Select 2 questions: 1 from Car category, 1 from Traffic category
    const carQuestions = questions.filter(q => q.category === 'Car');
    const trafficQuestions = questions.filter(q => q.category === 'Traffic');

    const sessionQuestions: QuizQuestion[] = [];

    // Add one random car question if available
    if (carQuestions.length > 0) {
      const randomCar = carQuestions[Math.floor(Math.random() * carQuestions.length)];
      sessionQuestions.push(randomCar);
    }

    // Add one random traffic question if available
    if (trafficQuestions.length > 0) {
      const randomTraffic = trafficQuestions[Math.floor(Math.random() * trafficQuestions.length)];
      sessionQuestions.push(randomTraffic);
    }

    // If we don't have both categories, fill with any available questions
    if (sessionQuestions.length < 2 && questions.length > 0) {
      const remainingQuestions = questions.filter(q => !sessionQuestions.includes(q));
      while (sessionQuestions.length < 2 && remainingQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
        sessionQuestions.push(remainingQuestions.splice(randomIndex, 1)[0]);
      }
    }

    setSession({
      currentQuestion: 0,
      score: 0,
      answered: new Array(sessionQuestions.length).fill(false),
      userAnswers: new Array(sessionQuestions.length).fill(null),
      sessionQuestions: sessionQuestions
    });

    setQuizState('playing');
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !user?.email) return;

    const currentQ = session.sessionQuestions[session.currentQuestion];
    const isCorrect = selectedOption === currentQ.correctAnswer;

    const newAnswered = [...session.answered];
    const newUserAnswers = [...session.userAnswers];

    newAnswered[session.currentQuestion] = true;
    newUserAnswers[session.currentQuestion] = selectedOption;

    const newScore = isCorrect ? session.score + 1 : session.score;

    setSession(prev => ({
      ...prev,
      score: newScore,
      answered: newAnswered,
      userAnswers: newUserAnswers
    }));

    // Save result to backend
    try {
      await quizAPI.saveQuizResult({
        questionId: currentQ.id!,
        selectedAnswer: selectedOption,
        isCorrect: isCorrect
      });
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }

    // Show result for 2 seconds, then move to next question or finish
    setTimeout(async () => {
      if (session.currentQuestion < session.sessionQuestions.length - 1) {
        setSession(prev => ({
          ...prev,
          currentQuestion: prev.currentQuestion + 1
        }));
        setSelectedOption(null);
      } else {
        // Save complete quiz session
        try {
          const finalScore = Math.round((newScore / session.sessionQuestions.length) * 100);
          await quizAPI.saveQuizSession({
            totalQuestions: session.sessionQuestions.length,
            correctAnswers: newScore,
            score: finalScore
          });
        } catch (error) {
          console.error('Failed to save quiz session:', error);
        }

        // Show congratulations screen
        setQuizState('congratulations');
        setCongratTimer(10);

        // Start countdown timer
        const timer = setInterval(() => {
          setCongratTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setQuizState('welcome'); // Return to welcome screen
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 2000);
  };

  const resetToWelcome = () => {
    setQuizState('welcome');
    setSelectedOption(null);
    setCongratTimer(0);
  };

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative"
        style={{
          backgroundImage: `url("${getBackgroundImage()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]"></div>
        <div className="relative z-10">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-700">🧠 The Pop Quiz! 🎯</CardTitle>
            <p className="text-gray-600">Please sign in to start your quiz adventure!</p>
          </CardHeader>
          <CardContent className="text-center">
            <AuthButton />
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Show admin interface for super admin
  if (showAdmin && user.email === SUPER_ADMIN_EMAIL) {
    return (
      <div
        className="min-h-screen p-4 relative"
        style={{
          backgroundImage: `url("${getBackgroundImage()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]"></div>
        <div className="relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-4xl font-bold text-white">🧠 Quiz Administration</h1>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setShowAdmin(false);
                  await loadQuestions();
                }}
                variant="outline"
                className="bg-white"
              >
                Take Quiz
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="bg-white"
              >
                Back to Home
              </Button>
            </div>
          </div>
          <QuizAdmin />
        </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen relative"
        style={{
          backgroundImage: `url("${getBackgroundImage()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your quiz questions...</p>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen relative"
        style={{
          backgroundImage: `url("${getBackgroundImage()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-700">🧠 The Pop Quiz! 🎯</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">No quiz questions assigned to your account yet!</p>
            <p className="text-sm text-gray-500">Check back later or contact your teacher.</p>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (quizState === 'welcome') {
    return (
      <div className="min-h-screen relative"
        style={{
          backgroundImage: `url("${getBackgroundImage()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Button
            onClick={startQuizSession}
            className="text-white text-2xl w-32 h-32 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105 animate-pulse"
            style={{ backgroundColor: 'rgb(157, 3, 44)' }}
            size="lg"
          >
            ✨ GO! ✨
          </Button>
        </div>
      </div>
    );
  }

  // Congratulations Screen
  if (quizState === 'congratulations') {
    return (
      <div className="min-h-screen relative"
        style={{
          backgroundImage: `url("${getBackgroundImage()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-purple-700">🎉 Congratulations! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <div className="text-8xl animate-bounce">🏆</div>
              <div>
                <p className="text-3xl font-bold text-gray-800 mb-2">
                  Great Job!
                </p>
                <p className="text-xl text-gray-600 mb-4">
                  You scored {session.score} out of {session.sessionQuestions.length}!
                </p>
                <p className="text-2xl font-bold text-green-600">
                  You can go to the next round!
                </p>
              </div>
              <div className="bg-yellow-100 border-yellow-400 border rounded-lg p-4">
                <p className="text-lg font-medium text-yellow-800">
                  Next player's turn in: {congratsTimer} seconds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Only show quiz playing screen if we're in playing state
  if (quizState !== 'playing' || session.sessionQuestions.length === 0) {
    return null;
  }

  const currentQuestion = session.sessionQuestions[session.currentQuestion];
  const progress = ((session.currentQuestion + 1) / session.sessionQuestions.length) * 100;
  const hasAnswered = session.answered[session.currentQuestion];


  return (
    <div className="min-h-screen relative"
        style={{
          backgroundImage: `url("${getBackgroundImage(currentQuestion)}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.5px]"></div>
        <div className="relative z-10 min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Admin button only for super admin */}
        {user.email === SUPER_ADMIN_EMAIL && (
          <div className="absolute top-4 right-4 z-20">
            <Button
              onClick={() => setShowAdmin(true)}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </div>
        )}


        {/* Question */}
        <Card className="mb-6" style={{ backgroundColor: 'rgb(157, 3, 44)' }}>
          <CardHeader>
            <CardTitle className="text-2xl text-center text-white">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => {
                let buttonClass = "h-16 text-lg font-medium transition-all duration-200 ";

                if (hasAnswered) {
                  if (index === currentQuestion.correctAnswer) {
                    buttonClass += "bg-green-500 hover:bg-green-600 text-white border-green-600";
                  } else if (index === selectedOption && index !== currentQuestion.correctAnswer) {
                    buttonClass += "bg-red-500 hover:bg-red-600 text-white border-red-600";
                  } else {
                    buttonClass += "bg-gray-200 text-gray-600 cursor-not-allowed";
                  }
                } else {
                  if (index === selectedOption) {
                    buttonClass += "bg-purple-600 hover:bg-purple-700 text-white border-purple-600";
                  } else {
                    buttonClass += "bg-white text-black border-gray-200 hover:text-white";
                  }
                }

                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={buttonClass}
                    onClick={() => !hasAnswered && handleOptionSelect(index)}
                    disabled={hasAnswered}
                    data-answer-button
                    style={
                      !hasAnswered && index !== selectedOption
                        ? {
                            transition: 'all 0.2s',
                          }
                        : {}
                    }
                    onMouseEnter={(e) => {
                      if (!hasAnswered && index !== selectedOption) {
                        e.currentTarget.style.backgroundColor = 'rgb(157, 3, 44)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!hasAnswered) {
                        if (index === selectedOption) {
                          e.currentTarget.style.backgroundColor = 'rgb(147, 51, 234)'; // purple-600
                        } else {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }
                    }}
                  >
                    {String.fromCharCode(65 + index)}. {option}
                  </Button>
                );
              })}
            </div>

            {selectedOption !== null && !hasAnswered && (
              <div className="text-center mt-6">
                <Button
                  onClick={handleSubmitAnswer}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                >
                  Submit Answer ✓
                </Button>
              </div>
            )}

            {hasAnswered && (
              <div className="text-center mt-6">
                <p className="text-lg font-medium">
                  {selectedOption === currentQuestion.correctAnswer ? (
                    <span className="text-white">🎉 Correct! Well done!</span>
                  ) : (
                    <span className="text-white">❌ Oops! The correct answer was {String.fromCharCode(65 + currentQuestion.correctAnswer)}</span>
                  )}
                </p>
                {session.currentQuestion < session.sessionQuestions.length - 1 ? (
                  <p className="text-white mt-2">Next question coming up...</p>
                ) : (
                  <p className="text-white mt-2">Calculating your final score...</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}

export default PopQuizPage;