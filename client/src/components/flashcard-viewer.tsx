import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import { ArrowLeft, ArrowRight, RotateCcw, BookOpen } from "lucide-react";

interface FlashCard {
  id: string;
  frontContent: string;
  backContent: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  subjectId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface FlashCardViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string | null;
  subjectName: string;
}

export function FlashCardViewer({ open, onOpenChange, subjectId, subjectName }: FlashCardViewerProps) {
  const { firebaseUser } = useAuth();
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (open && subjectId) {
      loadFlashCards();
    }
  }, [open, subjectId]);

  useEffect(() => {
    // Reset state when dialog opens
    if (open) {
      setCurrentIndex(0);
      setShowBack(false);
    }
  }, [open]);

  const loadFlashCards = async () => {
    if (!subjectId || !firebaseUser) return;

    setLoading(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`/api/flashcards?subjectId=${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load flash cards");
      }

      const data = await response.json();
      setFlashCards(data);
    } catch (error) {
      console.error("Error loading flash cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentCard = flashCards[currentIndex];

  const nextCard = () => {
    setShowBack(false);
    setCurrentIndex((prev) => (prev + 1) % flashCards.length);
  };

  const previousCard = () => {
    setShowBack(false);
    setCurrentIndex((prev) => (prev - 1 + flashCards.length) % flashCards.length);
  };

  const flipCard = () => {
    setShowBack(!showBack);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex items-center justify-center py-8">
            <div className="text-lg">Loading flash cards...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (flashCards.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {subjectName} Flash Cards
            </DialogTitle>
            <DialogDescription>
              Study flash cards for this subject
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="text-lg font-medium">No flash cards available</h3>
              <p className="text-sm text-muted-foreground">
                There are no flash cards for this subject yet.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {subjectName} Flash Cards
            </div>
            <Badge variant="outline">
              {currentIndex + 1} of {flashCards.length}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Study flash cards for this subject. Click the card to flip it!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Flash Card */}
          <div className="flex justify-center">
            <Card
              className="w-full max-w-md h-80 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center"
              onClick={flipCard}
            >
              <CardContent className="p-6 text-center space-y-4 h-full flex flex-col justify-center">
                <div className="flex-1 flex items-center justify-center">
                  <div className="space-y-4">
                    {/* Show image if available */}
                    {(showBack ? currentCard?.backImageUrl : currentCard?.frontImageUrl) && (
                      <div className="flex justify-center">
                        <img
                          src={showBack ? currentCard.backImageUrl : currentCard.frontImageUrl}
                          alt={showBack ? "Back of card" : "Front of card"}
                          className="max-w-32 max-h-32 object-contain rounded"
                        />
                      </div>
                    )}

                    {/* Show content */}
                    <div className="text-lg font-medium">
                      {showBack ? currentCard?.backContent : currentCard?.frontContent}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Click to {showBack ? 'show question' : 'reveal answer'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={previousCard}
              disabled={flashCards.length <= 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button
              variant="outline"
              onClick={flipCard}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {showBack ? 'Show Question' : 'Reveal Answer'}
            </Button>

            <Button
              variant="outline"
              onClick={nextCard}
              disabled={flashCards.length <= 1}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Progress indicator */}
          {flashCards.length > 1 && (
            <div className="flex justify-center space-x-2">
              {flashCards.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}