import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, Edit2, Image, Upload } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { quizAPI, type QuizQuestion } from "@/lib/quiz-api";
import { QUIZ_BACKGROUND_IMAGES, getBackgroundsByCategory, getBackgroundById, getAllCategories, updateBackgroundImages, type BackgroundImage } from "@/lib/quiz-backgrounds";

const SUPER_ADMIN_EMAIL = 'sadasivanarun84@gmail.com';

interface QuestionForm {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  assignedTo: string;
  category: string;
  backgroundImage: string;
}

const QUIZ_CATEGORIES = [
  'Traffic',
  'Car',
  'General Knowledge',
  'Science',
  'Math'
] as const;

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

export function QuizAdmin() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<QuestionForm>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    assignedTo: '',
    category: 'Traffic',
    backgroundImage: ''
  });

  const [bulkForm, setBulkForm] = useState({
    assignedTo: '',
    questionsText: ''
  });

  const [imageUpload, setImageUpload] = useState({
    name: '',
    category: 'Traffic' as string,
    description: '',
    file: null as File | null
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImage[]>([]);

  useEffect(() => {
    if (user?.email === SUPER_ADMIN_EMAIL) {
      loadAllQuestions();
      loadBackgroundImages();
    }
  }, [user]);

  const loadAllQuestions = async () => {
    setLoading(true);
    try {
      const allQuestions = await quizAPI.getAllQuestions();
      setQuestions(allQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
      const errorMessage = error.message || 'Failed to load questions';
      if (errorMessage.includes('Backend service is currently unavailable')) {
        alert('Backend service is currently unavailable. The quiz system is being deployed. Please check back in a few minutes.');
      } else {
        alert(`Failed to load questions: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof QuestionForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...form.options] as [string, string, string, string];
    newOptions[index] = value;
    setForm(prev => ({ ...prev, options: newOptions }));
  };

  const validateForm = (): boolean => {
    if (!form.question.trim()) {
      alert('Question is required');
      return false;
    }
    if (form.options.some(opt => !opt.trim())) {
      alert('All options are required');
      return false;
    }
    if (!form.assignedTo.trim() || !form.assignedTo.includes('@')) {
      alert('Valid email address is required');
      return false;
    }
    return true;
  };

  const handleSaveQuestion = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const questionData = {
        question: form.question.trim(),
        options: form.options.map(opt => opt.trim()),
        correctAnswer: form.correctAnswer,
        assignedTo: form.assignedTo.trim().toLowerCase(),
        category: form.category,
        backgroundImage: form.backgroundImage.trim() || undefined
      };

      if (editingId) {
        await quizAPI.updateQuestion(editingId, questionData);
        setEditingId(null);
      } else {
        await quizAPI.createQuestion(questionData);
      }

      // Reset form
      setForm({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        assignedTo: '',
        category: 'Traffic',
        backgroundImage: ''
      });

      // Reload questions
      await loadAllQuestions();

      alert(editingId ? 'Question updated successfully!' : 'Question created successfully!');
    } catch (error) {
      console.error('Failed to save question:', error);
      alert(`Failed to save question: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = (question: QuizQuestion) => {
    setForm({
      question: question.question,
      options: question.options as [string, string, string, string],
      correctAnswer: question.correctAnswer,
      assignedTo: question.assignedTo,
      category: question.category,
      backgroundImage: question.backgroundImage || ''
    });
    setEditingId(question.id!);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await quizAPI.deleteQuestion(questionId);
      await loadAllQuestions();
      alert('Question deleted successfully!');
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert(`Failed to delete question: ${error.message}`);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkForm.assignedTo.trim() || !bulkForm.assignedTo.includes('@')) {
      alert('Valid email address is required');
      return;
    }

    if (!bulkForm.questionsText.trim()) {
      alert('Questions text is required');
      return;
    }

    setSaving(true);
    try {
      const questionsData = parseBulkQuestions(bulkForm.questionsText, bulkForm.assignedTo.trim().toLowerCase());

      if (questionsData.length === 0) {
        alert('No valid questions found. Please check the format.');
        return;
      }

      await quizAPI.createMultipleQuestions(questionsData);

      // Reset bulk form
      setBulkForm({ assignedTo: '', questionsText: '' });

      // Reload questions
      await loadAllQuestions();

      alert(`${questionsData.length} questions created successfully!`);
    } catch (error) {
      console.error('Failed to bulk upload questions:', error);
      alert('Failed to upload questions. Please check the format and try again.');
    } finally {
      setSaving(false);
    }
  };

  const parseBulkQuestions = (text: string, assignedTo: string): Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[] => {
    const questions: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    try {
      // Expected format: {Question, Option1, Option2, Option3, Option4, CorrectAnswerIndex, Category, BackgroundImageName}
      const lines = text.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const content = trimmed.slice(1, -1);
          const parts = content.split(',').map(part => part.trim());

          // Support both old format (7 parts) and new format (8 parts)
          if (parts.length === 7 || parts.length === 8) {
            const [question, opt1, opt2, opt3, opt4, correctStr, category, backgroundImageName = ''] = parts;
            const correctAnswer = parseInt(correctStr) - 1; // Convert 1-based to 0-based

            if (correctAnswer >= 0 && correctAnswer <= 3) {
              // Find background image URL by name
              let backgroundImageUrl = undefined;
              if (backgroundImageName && backgroundImageName.trim()) {
                const bgImage = QUIZ_BACKGROUND_IMAGES.find(img =>
                  img.name.toLowerCase() === backgroundImageName.toLowerCase().trim()
                );
                if (bgImage) {
                  backgroundImageUrl = bgImage.url;
                }
              }

              questions.push({
                question: question,
                options: [opt1, opt2, opt3, opt4],
                correctAnswer: correctAnswer,
                assignedTo: assignedTo,
                createdBy: user!.email,
                category: category,
                backgroundImage: backgroundImageUrl
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error parsing bulk questions:', error);
    }

    return questions;
  };

  const loadBackgroundImages = async () => {
    try {
      const images = await quizAPI.getBackgroundImages();
      setBackgroundImages(images);
      updateBackgroundImages(images);
    } catch (error) {
      console.error('Failed to load background images:', error);
    }
  };

  const handleImageUpload = async () => {
    if (!imageUpload.file || !imageUpload.name.trim()) {
      alert('Please select a file and provide a name');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageUpload.file);
      formData.append('name', imageUpload.name.trim());
      formData.append('category', imageUpload.category);
      formData.append('description', imageUpload.description.trim());

      await quizAPI.uploadBackgroundImage(formData);

      // Reset form
      setImageUpload({
        name: '',
        category: 'Traffic',
        description: '',
        file: null
      });

      // Reload images
      await loadBackgroundImages();

      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await quizAPI.deleteBackgroundImage(imageId);
      await loadBackgroundImages();
      alert('Image deleted successfully!');
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert(`Failed to delete image: ${error.message}`);
    }
  };

  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Access denied. Only super admin can manage quiz questions.</p>
        </CardContent>
      </Card>
    );
  }

  const questionsByUser = questions.reduce((acc, question) => {
    const email = question.assignedTo;
    if (!acc[email]) acc[email] = [];
    acc[email].push(question);
    return acc;
  }, {} as Record<string, QuizQuestion[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl text-purple-700">🧠 Quiz Admin Panel</CardTitle>
          <p className="text-gray-600">Create and manage quiz questions for users</p>
        </CardHeader>
      </Card>

      {/* Single Question Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {editingId ? 'Edit Question' : 'Create New Question'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              placeholder="Enter your quiz question..."
              value={form.question}
              onChange={(e) => handleFormChange('question', e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.options.map((option, index) => (
              <div key={index}>
                <Label htmlFor={`option-${index}`}>
                  Option {String.fromCharCode(65 + index)}
                  {form.correctAnswer === index && (
                    <Badge variant="default" className="ml-2 bg-green-600">Correct</Badge>
                  )}
                </Label>
                <Input
                  id={`option-${index}`}
                  placeholder={`Enter option ${String.fromCharCode(65 + index)}...`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="correct-answer">Correct Answer</Label>
            <select
              id="correct-answer"
              value={form.correctAnswer}
              onChange={(e) => handleFormChange('correctAnswer', parseInt(e.target.value))}
              className="w-full p-2 border rounded-md"
            >
              {form.options.map((_, index) => (
                <option key={index} value={index}>
                  Option {String.fromCharCode(65 + index)} - {form.options[index] || 'Empty'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => handleFormChange('category', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {QUIZ_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="assigned-to">Assign to Email</Label>
            <Input
              id="assigned-to"
              type="email"
              placeholder="user@example.com"
              value={form.assignedTo}
              onChange={(e) => handleFormChange('assignedTo', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="background-image">Background Image (Optional)</Label>
            <select
              id="background-image"
              value={form.backgroundImage}
              onChange={(e) => handleFormChange('backgroundImage', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No Background</option>
              {getAllCategories().map((category) => (
                <optgroup key={category} label={category}>
                  {getBackgroundsByCategory(category).map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.name} - {bg.description}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {form.backgroundImage && getBackgroundById(form.backgroundImage) && (
              <div className="mt-2">
                <img
                  src={getBackgroundById(form.backgroundImage)?.url}
                  alt={getBackgroundById(form.backgroundImage)?.name}
                  className="w-32 h-24 object-cover rounded border"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveQuestion}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : (editingId ? 'Update Question' : 'Create Question')}
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setForm({
                    question: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    assignedTo: '',
                    category: 'Traffic',
                    backgroundImage: ''
                  });
                }}
              >
                Cancel Edit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Upload */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Bulk Upload Questions</CardTitle>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="font-medium text-gray-800">📋 Format Requirements:</div>
            <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-400">
              <div className="font-mono text-xs mb-2">
                {`{Question, Option1, Option2, Option3, Option4, CorrectAnswer, Category, BackgroundImageName}`}
              </div>
              <div className="space-y-1 text-xs">
                <div><strong>CorrectAnswer:</strong> Use numbers 1-4 (1=first option, 2=second option, etc.)</div>
                <div><strong>Category:</strong> Traffic, Car, General Knowledge, Science, Math, or any custom category</div>
                <div><strong>BackgroundImageName:</strong> Image name from uploaded images, or leave empty for no background</div>
              </div>
            </div>
            <div className="font-medium text-gray-800">✅ Examples:</div>
            <div className="bg-green-50 p-3 rounded text-xs font-mono space-y-1">
              <div>{`{What is 2+2?, 3, 4, 5, 6, 2, Math, }`}</div>
              <div>{`{What should you do at a red traffic light?, Go, Stop, Slow down, Honk, 2, Traffic, TestImage}`}</div>
              <div>{`{How many legs does a spider have?, 6, 8, 10, 4, 2, Science, }`}</div>
            </div>
            <div className="text-xs text-amber-600">
              ⚠️ <strong>Important:</strong> Each question must be on a separate line, enclosed in curly braces {`{}`}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bulk-assigned-to">Assign to Email</Label>
            <Input
              id="bulk-assigned-to"
              type="email"
              placeholder="user@example.com"
              value={bulkForm.assignedTo}
              onChange={(e) => setBulkForm(prev => ({ ...prev, assignedTo: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="bulk-questions">Questions (one per line)</Label>
            <Textarea
              id="bulk-questions"
              placeholder={`{What color do you get when you mix red and yellow?, Purple, Orange, Green, Blue, 2, General Knowledge, }\n{How many legs does a spider have?, 6, 8, 10, 4, 2, Science, }\n{What should you do at a red traffic light?, Go, Stop, Slow down, Honk, 2, Traffic, TestImage}`}
              value={bulkForm.questionsText}
              onChange={(e) => setBulkForm(prev => ({ ...prev, questionsText: e.target.value }))}
              className="min-h-[120px]"
            />
          </div>

          <Button
            onClick={handleBulkUpload}
            disabled={saving}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            {saving ? 'Uploading...' : 'Bulk Upload'}
          </Button>
        </CardContent>
      </Card>

      {/* Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Background Images
          </CardTitle>
          <p className="text-sm text-gray-600">
            Upload images that can be used as backgrounds for quiz questions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="image-name">Image Name</Label>
              <Input
                id="image-name"
                placeholder="e.g., Traffic Light Scene"
                value={imageUpload.name}
                onChange={(e) => setImageUpload(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="image-category">Category</Label>
              <select
                id="image-category"
                value={imageUpload.category}
                onChange={(e) => setImageUpload(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-md"
              >
                {QUIZ_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="image-description">Description (Optional)</Label>
            <Input
              id="image-description"
              placeholder="Brief description of the image"
              value={imageUpload.description}
              onChange={(e) => setImageUpload(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="image-file">Select Image File</Label>
            <Input
              id="image-file"
              type="file"
              accept="image/*"
              onChange={(e) => setImageUpload(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
            />
          </div>

          <Button
            onClick={handleImageUpload}
            disabled={uploadingImage || !imageUpload.file || !imageUpload.name.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploadingImage ? 'Uploading...' : 'Upload Image'}
          </Button>
        </CardContent>
      </Card>

      {/* Background Images List */}
      <Card>
        <CardHeader>
          <CardTitle>📸 Background Images ({backgroundImages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {backgroundImages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No background images uploaded yet. Upload your first image above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backgroundImages.map((image) => (
                <div key={image.id} className="border rounded-lg p-3 bg-gray-50">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{image.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryEmoji(image.category)} {image.category}
                      </Badge>
                    </div>
                    {image.description && (
                      <p className="text-xs text-gray-600">{image.description}</p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteImage(image.id)}
                      className="text-red-600 hover:text-red-800 w-full"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>📚 All Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading questions...</div>
          ) : Object.keys(questionsByUser).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No questions created yet. Create your first question above!
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(questionsByUser).map(([email, userQuestions]) => (
                <div key={email} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-purple-700">
                      📧 {email}
                    </h3>
                    <Badge variant="secondary">
                      {userQuestions.length} question{userQuestions.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {userQuestions.map((question, index) => (
                      <div key={question.id} className="border rounded p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {getCategoryEmoji(question.category)} {question.category}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-gray-800">
                              Q{index + 1}: {question.question}
                            </h4>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditQuestion(question)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteQuestion(question.id!)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-2 rounded ${
                                optIndex === question.correctAnswer
                                  ? 'bg-green-100 border-green-300 border'
                                  : 'bg-white border-gray-200 border'
                              }`}
                            >
                              {String.fromCharCode(65 + optIndex)}. {option}
                              {optIndex === question.correctAnswer && (
                                <Badge variant="default" className="ml-2 text-xs bg-green-600">✓</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default QuizAdmin;