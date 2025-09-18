import { db, COLLECTIONS } from './firebase-config';

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

class QuizService {
  private questionsCollection = COLLECTIONS.QUIZ_QUESTIONS;
  private resultsCollection = COLLECTIONS.QUIZ_RESULTS;
  private sessionsCollection = COLLECTIONS.QUIZ_SESSIONS;

  // Admin functions - only for super admin
  async createQuestion(questionData: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('[QuizService] Creating question:', questionData);
      const docRef = await db.collection(this.questionsCollection).add({
        ...questionData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('[QuizService] Question created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[QuizService] Error creating question:', error);
      throw error;
    }
  }

  async updateQuestion(questionId: string, updates: Partial<QuizQuestion>): Promise<void> {
    try {
      await db.collection(this.questionsCollection).doc(questionId).update({
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  }

  async deleteQuestion(questionId: string): Promise<void> {
    try {
      await db.collection(this.questionsCollection).doc(questionId).delete();
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }

  async getAllQuestions(): Promise<QuizQuestion[]> {
    try {
      const snapshot = await db.collection(this.questionsCollection)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as QuizQuestion[];
    } catch (error) {
      console.error('Error getting all questions:', error);
      throw error;
    }
  }

  // User functions
  async getQuestionsForUser(userEmail: string): Promise<QuizQuestion[]> {
    try {
      const snapshot = await db.collection(this.questionsCollection)
        .where('assignedTo', '==', userEmail)
        .orderBy('createdAt', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as QuizQuestion[];
    } catch (error) {
      console.error('Error getting questions for user:', error);
      throw error;
    }
  }

  async saveQuizResult(resultData: Omit<QuizResult, 'id' | 'completedAt'>): Promise<string> {
    try {
      const docRef = await db.collection(this.resultsCollection).add({
        ...resultData,
        completedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving quiz result:', error);
      throw error;
    }
  }

  async saveQuizSession(sessionData: Omit<QuizSession, 'id' | 'completedAt'>): Promise<string> {
    try {
      const docRef = await db.collection(this.sessionsCollection).add({
        ...sessionData,
        completedAt: new Date(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving quiz session:', error);
      throw error;
    }
  }

  async getUserQuizHistory(userEmail: string): Promise<QuizSession[]> {
    try {
      const snapshot = await db.collection(this.sessionsCollection)
        .where('userEmail', '==', userEmail)
        .orderBy('completedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || new Date(),
      })) as QuizSession[];
    } catch (error) {
      console.error('Error getting user quiz history:', error);
      throw error;
    }
  }

  // Bulk operations for admin
  async createMultipleQuestions(questions: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<string[]> {
    try {
      const batch = db.batch();
      const docRefs: string[] = [];

      questions.forEach((question) => {
        const docRef = db.collection(this.questionsCollection).doc();
        batch.set(docRef, {
          ...question,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        docRefs.push(docRef.id);
      });

      await batch.commit();
      return docRefs;
    } catch (error) {
      console.error('Error creating multiple questions:', error);
      throw error;
    }
  }

  async getQuestionsByAssignee(assigneeEmail: string): Promise<QuizQuestion[]> {
    try {
      const snapshot = await db.collection(this.questionsCollection)
        .where('assignedTo', '==', assigneeEmail)
        .orderBy('createdAt', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as QuizQuestion[];
    } catch (error) {
      console.error('Error getting questions by assignee:', error);
      throw error;
    }
  }
}

export const quizService = new QuizService();
export default quizService;