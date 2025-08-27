import { type User, type InsertUser, type WheelSection, type InsertWheelSection, type SpinResult, type InsertSpinResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Wheel sections
  getWheelSections(): Promise<WheelSection[]>;
  createWheelSection(section: InsertWheelSection): Promise<WheelSection>;
  deleteWheelSection(id: string): Promise<void>;
  clearWheelSections(): Promise<void>;
  
  // Spin results
  getSpinResults(): Promise<SpinResult[]>;
  createSpinResult(result: InsertSpinResult): Promise<SpinResult>;
  clearSpinResults(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private wheelSections: Map<string, WheelSection>;
  private spinResults: Map<string, SpinResult>;

  constructor() {
    this.users = new Map();
    this.wheelSections = new Map();
    this.spinResults = new Map();
    
    // Initialize with default wheel sections
    this.initializeDefaultSections();
  }

  private initializeDefaultSections() {
    const defaultSections = [
      { text: 'Prize A', color: '#ef4444', order: 0 },
      { text: 'Prize B', color: '#3b82f6', order: 1 },
      { text: 'Prize C', color: '#22c55e', order: 2 },
      { text: 'Prize D', color: '#eab308', order: 3 },
      { text: 'Prize E', color: '#8b5cf6', order: 4 },
      { text: 'Prize F', color: '#ec4899', order: 5 },
    ];

    defaultSections.forEach(section => {
      const id = randomUUID();
      const wheelSection: WheelSection = {
        ...section,
        id,
        createdAt: new Date(),
      };
      this.wheelSections.set(id, wheelSection);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getWheelSections(): Promise<WheelSection[]> {
    return Array.from(this.wheelSections.values()).sort((a, b) => a.order - b.order);
  }

  async createWheelSection(insertSection: InsertWheelSection): Promise<WheelSection> {
    const id = randomUUID();
    const section: WheelSection = {
      ...insertSection,
      id,
      createdAt: new Date(),
    };
    this.wheelSections.set(id, section);
    return section;
  }

  async deleteWheelSection(id: string): Promise<void> {
    this.wheelSections.delete(id);
  }

  async clearWheelSections(): Promise<void> {
    this.wheelSections.clear();
  }

  async getSpinResults(): Promise<SpinResult[]> {
    return Array.from(this.spinResults.values()).sort(
      (a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
    );
  }

  async createSpinResult(insertResult: InsertSpinResult): Promise<SpinResult> {
    const id = randomUUID();
    const result: SpinResult = {
      ...insertResult,
      id,
      timestamp: new Date(),
    };
    this.spinResults.set(id, result);
    return result;
  }

  async clearSpinResults(): Promise<void> {
    this.spinResults.clear();
  }
}

export const storage = new MemStorage();
