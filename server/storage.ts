import { type User, type InsertUser, type WheelSection, type InsertWheelSection, type SpinResult, type InsertSpinResult, type Campaign, type InsertCampaign } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Campaigns
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  getActiveCampaign(): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(id: string): Promise<void>;
  
  // Wheel sections
  getWheelSections(campaignId?: string): Promise<WheelSection[]>;
  createWheelSection(section: InsertWheelSection): Promise<WheelSection>;
  deleteWheelSection(id: string): Promise<void>;
  clearWheelSections(campaignId?: string): Promise<void>;
  
  // Spin results
  getSpinResults(campaignId?: string): Promise<SpinResult[]>;
  createSpinResult(result: InsertSpinResult): Promise<SpinResult>;
  clearSpinResults(campaignId?: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private campaigns: Map<string, Campaign>;
  private wheelSections: Map<string, WheelSection>;
  private spinResults: Map<string, SpinResult>;

  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.wheelSections = new Map();
    this.spinResults = new Map();
    
    // Initialize with default campaign and wheel sections
    this.initializeDefaults();
  }

  private initializeDefaults() {
    // Create default campaign
    const campaignId = randomUUID();
    const defaultCampaign: Campaign = {
      id: campaignId,
      name: "Default Campaign",
      totalAmount: null,
      totalWinners: 100,
      threshold: null,
      currentSpent: 0,
      currentWinners: 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.campaigns.set(campaignId, defaultCampaign);

    // Create default wheel sections
    const defaultSections = [
      { text: 'Prize A', color: '#ef4444', amount: null, order: 0 },
      { text: 'Prize B', color: '#3b82f6', amount: null, order: 1 },
      { text: 'Prize C', color: '#22c55e', amount: null, order: 2 },
      { text: 'Prize D', color: '#eab308', amount: null, order: 3 },
      { text: 'Prize E', color: '#8b5cf6', amount: null, order: 4 },
      { text: 'Prize F', color: '#ec4899', amount: null, order: 5 },
    ];

    defaultSections.forEach(section => {
      const id = randomUUID();
      const wheelSection: WheelSection = {
        ...section,
        id,
        campaignId,
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

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async getActiveCampaign(): Promise<Campaign | undefined> {
    return Array.from(this.campaigns.values()).find(campaign => campaign.isActive);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      currentSpent: 0,
      currentWinners: 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const existing = this.campaigns.get(id);
    if (!existing) {
      throw new Error(`Campaign with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.campaigns.set(id, updated);
    return updated;
  }

  async deleteCampaign(id: string): Promise<void> {
    this.campaigns.delete(id);
    // Also delete associated wheel sections and spin results
    Array.from(this.wheelSections.entries()).forEach(([sectionId, section]) => {
      if (section.campaignId === id) {
        this.wheelSections.delete(sectionId);
      }
    });
    Array.from(this.spinResults.entries()).forEach(([resultId, result]) => {
      if (result.campaignId === id) {
        this.spinResults.delete(resultId);
      }
    });
  }

  async getWheelSections(campaignId?: string): Promise<WheelSection[]> {
    const sections = Array.from(this.wheelSections.values());
    let targetCampaignId = campaignId;
    
    // If no campaignId provided, use the active campaign
    if (!targetCampaignId) {
      const activeCampaign = await this.getActiveCampaign();
      targetCampaignId = activeCampaign?.id;
    }
    
    const filtered = targetCampaignId 
      ? sections.filter(section => section.campaignId === targetCampaignId)
      : sections;
    return filtered.sort((a, b) => a.order - b.order);
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

  async clearWheelSections(campaignId?: string): Promise<void> {
    if (campaignId) {
      Array.from(this.wheelSections.entries()).forEach(([sectionId, section]) => {
        if (section.campaignId === campaignId) {
          this.wheelSections.delete(sectionId);
        }
      });
    } else {
      this.wheelSections.clear();
    }
  }

  async getSpinResults(campaignId?: string): Promise<SpinResult[]> {
    const results = Array.from(this.spinResults.values());
    let targetCampaignId = campaignId;
    
    // If no campaignId provided, use the active campaign
    if (!targetCampaignId) {
      const activeCampaign = await this.getActiveCampaign();
      targetCampaignId = activeCampaign?.id;
    }
    
    const filtered = targetCampaignId 
      ? results.filter(result => result.campaignId === targetCampaignId)
      : results;
    return filtered.sort(
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
    
    // Update campaign statistics if campaignId is provided
    if (insertResult.campaignId) {
      const campaign = this.campaigns.get(insertResult.campaignId);
      if (campaign) {
        const updatedCampaign = {
          ...campaign,
          currentWinners: campaign.currentWinners + 1,
          currentSpent: campaign.currentSpent + (insertResult.amount || 0),
        };
        this.campaigns.set(insertResult.campaignId, updatedCampaign);
      }
    }
    
    return result;
  }

  async clearSpinResults(campaignId?: string): Promise<void> {
    if (campaignId) {
      Array.from(this.spinResults.entries()).forEach(([resultId, result]) => {
        if (result.campaignId === campaignId) {
          this.spinResults.delete(resultId);
        }
      });
      // Reset campaign statistics
      const campaign = this.campaigns.get(campaignId);
      if (campaign) {
        const updatedCampaign = {
          ...campaign,
          currentWinners: 0,
          currentSpent: 0,
        };
        this.campaigns.set(campaignId, updatedCampaign);
      }
    } else {
      this.spinResults.clear();
    }
  }
}

export const storage = new MemStorage();
