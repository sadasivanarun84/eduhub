import { auth } from './firebase';
import type { BackgroundImage } from './quiz-backgrounds';

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option (0-3)
  assignedTo: string; // email address
  createdBy: string; // admin email
  category: string; // question category (e.g., Traffic, Car)
  backgroundImage?: string; // optional background image URL
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizResult {
  id?: string;
  userEmail: string;
  questionId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  completedAt: Date;
}

export interface QuizSession {
  id?: string;
  userEmail: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number; // percentage
  completedAt: Date;
}

class QuizAPI {
  private baseURL = import.meta.env.PROD ? 'https://game-hub-430919671903.us-central1.run.app' : 'http://localhost:3000';

  private async getAuthHeaders(): Promise<HeadersInit> {
    if (!auth?.currentUser) {
      throw new Error('User not authenticated');
    }

    const token = await auth.currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.baseURL}${endpoint}`;

      const response = await fetch(url, {
        headers,
        ...options
      });

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');

          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
          } else {
            const text = await response.text();
            console.error('Non-JSON error response:', text.substring(0, 200));
            errorMessage = `API request failed. Received HTML instead of JSON. Backend may be unavailable.`;
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
        }
        throw new Error(errorMessage);
      }

      try {
        const result = await response.json();
        return result;
      } catch (parseError) {
        console.error('[QuizAPI] Failed to parse JSON response - response body already consumed');
        throw new Error('Invalid JSON response from server');
      }
    } catch (networkError) {
      console.error('[QuizAPI] Network error:', networkError);
      // If it's a connection error and we're in production, provide a fallback
      if (import.meta.env.PROD && (networkError.message.includes('fetch') || networkError.message.includes('Failed to'))) {
        throw new Error('Backend service is currently unavailable. Please try again later.');
      }
      throw networkError;
    }
  }

  // Admin functions - only for super admin
  async createQuestion(questionData: {
    question: string;
    options: string[];
    correctAnswer: number;
    assignedTo: string;
    category: string;
    backgroundImage?: string;
  }): Promise<{ id: string; message: string }> {
    return this.request('/api/quiz/questions', {
      method: 'POST',
      body: JSON.stringify(questionData)
    });
  }

  async updateQuestion(questionId: string, updates: Partial<QuizQuestion>): Promise<{ message: string }> {
    return this.request(`/api/quiz/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteQuestion(questionId: string): Promise<{ message: string }> {
    return this.request(`/api/quiz/questions/${questionId}`, {
      method: 'DELETE'
    });
  }

  async getAllQuestions(): Promise<QuizQuestion[]> {
    const questions = await this.request<QuizQuestion[]>('/api/quiz/questions');
    return questions.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      updatedAt: new Date(q.updatedAt)
    }));
  }

  // User functions
  async getMyQuestions(): Promise<QuizQuestion[]> {
    const questions = await this.request<QuizQuestion[]>('/api/quiz/my-questions');
    return questions.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      updatedAt: new Date(q.updatedAt)
    }));
  }

  async getUserQuestions(email: string): Promise<QuizQuestion[]> {
    const questions = await this.request<QuizQuestion[]>(`/api/quiz/questions/user/${encodeURIComponent(email)}`);
    return questions.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      updatedAt: new Date(q.updatedAt)
    }));
  }

  async saveQuizResult(resultData: {
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
  }): Promise<{ id: string; message: string }> {
    return this.request('/api/quiz/results', {
      method: 'POST',
      body: JSON.stringify(resultData)
    });
  }

  async saveQuizSession(sessionData: {
    totalQuestions: number;
    correctAnswers: number;
    score: number;
  }): Promise<{ id: string; message: string }> {
    return this.request('/api/quiz/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  }

  async getQuizHistory(): Promise<QuizSession[]> {
    const sessions = await this.request<QuizSession[]>('/api/quiz/history');
    return sessions.map(s => ({
      ...s,
      completedAt: new Date(s.completedAt)
    }));
  }

  // Image management for admin
  async uploadBackgroundImage(formData: FormData): Promise<{ id: string; url: string; message: string }> {
    try {
      const headers = await this.getAuthHeaders();
      // Remove Content-Type to let browser set it with boundary for FormData
      delete (headers as any)['Content-Type'];

      const url = `${this.baseURL}/api/quiz/images/upload`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[QuizAPI] Image upload error:', error);
      throw error;
    }
  }

  async getBackgroundImages(): Promise<BackgroundImage[]> {
    return this.request('/api/quiz/background-images');
  }

  async deleteBackgroundImage(imageId: string): Promise<{ message: string }> {
    return this.request(`/api/quiz/images/${imageId}`, {
      method: 'DELETE'
    });
  }

  // Bulk operations for admin
  async createMultipleQuestions(questions: {
    question: string;
    options: string[];
    correctAnswer: number;
    assignedTo: string;
    createdBy: string;
    category: string;
    backgroundImage?: string;
  }[]): Promise<{ ids: string[]; count: number; message: string }> {
    return this.request('/api/quiz/questions/bulk', {
      method: 'POST',
      body: JSON.stringify({ questions })
    });
  }
}

export const quizAPI = new QuizAPI();
export default quizAPI;