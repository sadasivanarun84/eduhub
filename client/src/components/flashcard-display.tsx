import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, RotateCcw } from "lucide-react";
import { CreateFlashCardDialog } from "./create-flashcard-dialog";
import { useAuth } from "./auth-provider";

interface FlashCard {
  id: string;
  frontContent: string;
  backContent: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

interface FlashCardDisplayProps {
  subjectId: string | null;
  subjectName: string;
}

export function FlashCardDisplay({ subjectId, subjectName }: FlashCardDisplayProps) {
  const { user, firebaseUser } = useAuth();
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const fetchFlashCards = async () => {
    if (!subjectId) return;

    try {
      const response = await fetch(`/api/flashcards?subjectId=${subjectId}`);
      if (response.ok) {
        const data = await response.json();
        setFlashCards(data.sort((a: FlashCard, b: FlashCard) => a.order - b.order));
      }
    } catch (error) {
      console.error("Error fetching flash cards:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashCards();
  }, [subjectId]);

  const handleDeleteFlashCard = async (id: string) => {
    if (!firebaseUser || !confirm("Are you sure you want to delete this flash card?")) return;

    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`/api/flashcards/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        await fetchFlashCards();
      }
    } catch (error) {
      console.error("Error deleting flash card:", error);
    }
  };

  const toggleFlip = (cardId: string) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const resetFlips = () => {
    setFlippedCards(new Set());
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  if (loading) {
    return <div className="text-center py-8">Loading flash cards...</div>;
  }

  if (!subjectId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Select a subject to view flash cards
      </div>
    );
  }

  if (studyMode && flashCards.length > 0) {
    const currentCard = flashCards[currentCardIndex];
    const isFlipped = flippedCards.has(currentCard.id);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Study Mode: {subjectName}</h2>
            <p className="text-gray-600">Card {currentCardIndex + 1} of {flashCards.length}</p>
          </div>
          <Button variant="outline" onClick={() => setStudyMode(false)}>
            Exit Study Mode
          </Button>
        </div>

        <Card className="min-h-[400px] cursor-pointer transform hover:scale-105 transition-transform duration-200" onClick={() => toggleFlip(currentCard.id)}>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
            {!isFlipped ? (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">Question</h3>
                {currentCard.frontImageUrl && (
                  <img src={currentCard.frontImageUrl} alt="Front" className="max-w-full max-h-48 mx-auto rounded" />
                )}
                <p className="text-lg">{currentCard.frontContent}</p>
                <p className="text-sm text-gray-500">Click to reveal answer</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-green-600">Answer</h3>
                {currentCard.backImageUrl && (
                  <img src={currentCard.backImageUrl} alt="Back" className="max-w-full max-h-48 mx-auto rounded" />
                )}
                <p className="text-lg">{currentCard.backContent}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentCardIndex === 0}
            onClick={() => {
              setCurrentCardIndex(prev => Math.max(0, prev - 1));
              setFlippedCards(new Set());
            }}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentCardIndex === flashCards.length - 1}
            onClick={() => {
              setCurrentCardIndex(prev => Math.min(flashCards.length - 1, prev + 1));
              setFlippedCards(new Set());
            }}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Flash Cards: {subjectName}</h2>
          <p className="text-gray-600">{flashCards.length} cards available</p>
        </div>
        <div className="space-x-2">
          {flashCards.length > 0 && (
            <>
              <Button onClick={() => setStudyMode(true)}>
                Start Study Mode
              </Button>
              <Button variant="outline" onClick={resetFlips}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Flips
              </Button>
            </>
          )}
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Flash Card
            </Button>
          )}
        </div>
      </div>

      {flashCards.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No flash cards available for this subject.</p>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Flash Card
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashCards.map((card, index) => {
            const isFlipped = flippedCards.has(card.id);
            return (
              <Card key={card.id} className="cursor-pointer transform hover:scale-105 transition-transform duration-200">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">#{index + 1}</Badge>
                    {isAdmin && (
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement edit functionality
                        }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFlashCard(card.id);
                        }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent
                  className="min-h-[200px] flex flex-col justify-center"
                  onClick={() => toggleFlip(card.id)}
                >
                  {!isFlipped ? (
                    <div className="text-center space-y-2">
                      <h4 className="font-medium text-sm text-gray-600">Question</h4>
                      {card.frontImageUrl && (
                        <img src={card.frontImageUrl} alt="Front" className="max-w-full max-h-24 mx-auto rounded" />
                      )}
                      <p className="text-sm">{card.frontContent}</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <h4 className="font-medium text-sm text-green-600">Answer</h4>
                      {card.backImageUrl && (
                        <img src={card.backImageUrl} alt="Back" className="max-w-full max-h-24 mx-auto rounded" />
                      )}
                      <p className="text-sm">{card.backContent}</p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="text-xs text-gray-500 pt-2">
                  Click to {isFlipped ? 'hide' : 'reveal'} answer
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <CreateFlashCardDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onFlashCardCreated={fetchFlashCards}
        subjectId={subjectId}
      />
    </div>
  );
}