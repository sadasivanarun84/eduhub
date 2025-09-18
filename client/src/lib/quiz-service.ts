import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase-config';

export interface QuizQuestion {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option (0-3)
  assignedTo: string; // email address
  createdBy: string; // admin email
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
  private questionsCollection = 'quizQuestions';
  private resultsCollection = 'quizResults';
  private sessionsCollection = 'quizSessions';

  // Admin functions - only for super admin
  async createQuestion(questionData: Omit<QuizQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.questionsCollection), {
        ...questionData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  async updateQuestion(questionId: string, updates: Partial<QuizQuestion>): Promise<void> {
    try {
      const questionRef = doc(db, this.questionsCollection, questionId);
      await updateDoc(questionRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  }

  async deleteQuestion(questionId: string): Promise<void> {
    try {
      const questionRef = doc(db, this.questionsCollection, questionId);
      await deleteDoc(questionRef);
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }

  async getAllQuestions(): Promise<QuizQuestion[]> {
    try {
      const q = query(
        collection(db, this.questionsCollection),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
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
      const q = query(
        collection(db, this.questionsCollection),
        where('assignedTo', '==', userEmail),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
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
      const docRef = await addDoc(collection(db, this.resultsCollection), {
        ...resultData,
        completedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving quiz result:', error);
      throw error;
    }
  }

  async saveQuizSession(sessionData: Omit<QuizSession, 'id' | 'completedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.sessionsCollection), {
        ...sessionData,
        completedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving quiz session:', error);
      throw error;
    }
  }

  async getUserQuizHistory(userEmail: string): Promise<QuizSession[]> {
    try {
      const q = query(
        collection(db, this.sessionsCollection),
        where('userEmail', '==', userEmail),
        orderBy('completedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
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
      const promises = questions.map(question => this.createQuestion(question));
      return await Promise.all(promises);
    } catch (error) {
      console.error('Error creating multiple questions:', error);
      throw error;
    }
  }

  async getQuestionsByAssignee(assigneeEmail: string): Promise<QuizQuestion[]> {
    try {
      const q = query(
        collection(db, this.questionsCollection),
        where('assignedTo', '==', assigneeEmail),
        orderBy('createdAt', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
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