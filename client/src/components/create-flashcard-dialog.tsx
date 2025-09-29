import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/auth-provider";
import { Upload } from "lucide-react";

interface CreateFlashCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlashCardCreated: () => void;
  subjectId: string | null;
}

export function CreateFlashCardDialog({ open, onOpenChange, onFlashCardCreated, subjectId }: CreateFlashCardDialogProps) {
  const { user, firebaseUser } = useAuth();
  const [frontContent, setFrontContent] = useState("");
  const [backContent, setBackContent] = useState("");
  const [frontImageUrl, setFrontImageUrl] = useState("");
  const [backImageUrl, setBackImageUrl] = useState("");
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'front' | 'back' | null>(null);

  const uploadImage = async (file: File, side: 'front' | 'back'): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const idToken = await firebaseUser.getIdToken();
    const response = await fetch('/api/flashcards/upload-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload image');
    }

    const result = await response.json();
    return result.url;
  };

  const handleImageUpload = async (file: File, side: 'front' | 'back') => {
    setUploadingImage(side);
    try {
      const url = await uploadImage(file, side);
      if (side === 'front') {
        setFrontImageUrl(url);
        setFrontImageFile(null);
      } else {
        setBackImageUrl(url);
        setBackImageFile(null);
      }
    } catch (error) {
      console.error(`Error uploading ${side} image:`, error);
      alert(`Failed to upload ${side} image. Please try again.`);
    } finally {
      setUploadingImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !frontContent.trim() || !backContent.trim() || !subjectId || !firebaseUser) return;

    setLoading(true);
    try {
      // Get Firebase ID token for authentication
      const idToken = await firebaseUser.getIdToken();

      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          subjectId,
          frontContent: frontContent.trim(),
          backContent: backContent.trim(),
          frontImageUrl: frontImageUrl.trim() || null,
          backImageUrl: backImageUrl.trim() || null,
          createdById: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create flash card");
      }

      setFrontContent("");
      setBackContent("");
      setFrontImageUrl("");
      setBackImageUrl("");
      setFrontImageFile(null);
      setBackImageFile(null);
      onFlashCardCreated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating flash card:", error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Flash Card</DialogTitle>
          <DialogDescription>
            Add a new flash card to help students learn this subject.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="frontContent">Front Content</Label>
              <Textarea
                id="frontContent"
                value={frontContent}
                onChange={(e) => setFrontContent(e.target.value)}
                placeholder="Question or term (e.g., What is the symbol for Hydrogen?)"
                rows={3}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="backContent">Back Content</Label>
              <Textarea
                id="backContent"
                value={backContent}
                onChange={(e) => setBackContent(e.target.value)}
                placeholder="Answer or definition (e.g., H)"
                rows={3}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Front Image (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={frontImageUrl}
                  onChange={(e) => setFrontImageUrl(e.target.value)}
                  placeholder="Enter image URL or upload file"
                  type="url"
                  className="flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFrontImageFile(file);
                        handleImageUpload(file, 'front');
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage === 'front'}
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingImage === 'front' ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
              {frontImageUrl && (
                <div className="mt-2">
                  <img
                    src={frontImageUrl}
                    alt="Front preview"
                    className="max-w-32 max-h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Back Image (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={backImageUrl}
                  onChange={(e) => setBackImageUrl(e.target.value)}
                  placeholder="Enter image URL or upload file"
                  type="url"
                  className="flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBackImageFile(file);
                        handleImageUpload(file, 'back');
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage === 'back'}
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingImage === 'back' ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
              {backImageUrl && (
                <div className="mt-2">
                  <img
                    src={backImageUrl}
                    alt="Back preview"
                    className="max-w-32 max-h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !frontContent.trim() || !backContent.trim()}>
              {loading ? "Creating..." : "Create Flash Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}