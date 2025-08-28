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
  
  // Rotation sequence
  getNextWinnerFromSequence(campaignId: string): Promise<WheelSection | null>;
  advanceSequenceIndex(campaignId: string): Promise<void>;
  
  // Campaign reset
  resetCampaign(campaignId: string): Promise<Campaign>;
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
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: [],
      currentSequenceIndex: 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.campaigns.set(campaignId, defaultCampaign);

    // Start with empty wheel - no default sections
  }

  // Generate rotation sequence based on wheel sections and their quotas
  private generateRotationSequence(wheelSections: WheelSection[]): string[] {
    const sequence: string[] = [];
    
    // Filter sections that have quotas set
    const sectionsWithQuotas = wheelSections.filter(section => 
      section.maxWins && section.maxWins > 0
    );
    
    if (sectionsWithQuotas.length === 0) {
      // No quotas configured, return empty sequence
      return [];
    }
    
    // Create array with section IDs repeated according to their quotas
    const sectionPool: string[] = [];
    sectionsWithQuotas.forEach(section => {
      const quota = section.maxWins || 0;
      for (let i = 0; i < quota; i++) {
        sectionPool.push(section.id);
      }
    });
    
    // Shuffle the pool to create a random but quota-compliant sequence
    const shuffled = [...sectionPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  // Get the next winner from the rotation sequence
  async getNextWinnerFromSequence(campaignId: string): Promise<WheelSection | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || !campaign.rotationSequence || campaign.rotationSequence.length === 0) {
      return null;
    }

    // Check if we've reached the end of the sequence
    const currentIndex = campaign.currentSequenceIndex || 0;
    if (currentIndex >= campaign.rotationSequence.length) {
      return null; // All prizes have been distributed
    }

    const nextSectionId = campaign.rotationSequence[currentIndex];
    const nextSection = this.wheelSections.get(nextSectionId);

    if (!nextSection) {
      // Section was deleted, advance the sequence index
      await this.advanceSequenceIndex(campaignId);
      return this.getNextWinnerFromSequence(campaignId);
    }

    return nextSection;
  }

  // Advance the sequence index after a spin
  async advanceSequenceIndex(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      const currentIndex = campaign.currentSequenceIndex || 0;
      const updated = {
        ...campaign,
        currentSequenceIndex: currentIndex + 1
      };
      this.campaigns.set(campaignId, updated);
    }
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
      id,
      name: insertCampaign.name,
      totalAmount: insertCampaign.totalAmount ?? null,
      totalWinners: insertCampaign.totalWinners,
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: [],
      currentSequenceIndex: 0,
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
    
    // Regenerate rotation sequence if wheel sections changed
    if (updates.totalWinners !== undefined) {
      const wheelSections = await this.getWheelSections(id);
      updated.rotationSequence = this.generateRotationSequence(wheelSections);
      updated.currentSequenceIndex = 0;
    }
    
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

  async resetCampaign(campaignId: string): Promise<Campaign> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Clear all spin results for this campaign
    await this.clearSpinResults(campaignId);

    // Get current wheel sections to regenerate sequence
    const wheelSections = await this.getWheelSections(campaignId);
    const newSequence = this.generateRotationSequence(wheelSections);

    // Reset campaign progress
    const resetCampaign: Campaign = {
      ...campaign,
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: newSequence,
      currentSequenceIndex: 0,
    };

    this.campaigns.set(campaignId, resetCampaign);
    return resetCampaign;
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
      id,
      campaignId: insertSection.campaignId || null,
      text: insertSection.text,
      color: insertSection.color,
      amount: insertSection.amount || null,
      maxWins: insertSection.maxWins || null,
      currentWins: 0,
      order: insertSection.order,
      createdAt: new Date(),
    };
    this.wheelSections.set(id, section);
    
    // Regenerate rotation sequence for the campaign when new sections are added
    if (section.campaignId) {
      const campaign = this.campaigns.get(section.campaignId);
      if (campaign) {
        const allSections = await this.getWheelSections(section.campaignId);
        const newSequence = this.generateRotationSequence(allSections);
        const updatedCampaign = {
          ...campaign,
          rotationSequence: newSequence,
          currentSequenceIndex: 0
        };
        this.campaigns.set(section.campaignId, updatedCampaign);
      }
    }
    
    return section;
  }

  async updateWheelSection(id: string, updates: Partial<WheelSection>): Promise<WheelSection> {
    const existing = this.wheelSections.get(id);
    if (!existing) {
      throw new Error(`Wheel section with id ${id} not found`);
    }
    const updated = { ...existing, ...updates };
    this.wheelSections.set(id, updated);
    
    // Regenerate rotation sequence for the campaign when wheel sections change
    if (updated.campaignId && (updates.maxWins !== undefined || updates.amount !== undefined)) {
      const campaign = this.campaigns.get(updated.campaignId);
      if (campaign) {
        const allSections = await this.getWheelSections(updated.campaignId);
        const newSequence = this.generateRotationSequence(allSections);
        const updatedCampaign = {
          ...campaign,
          rotationSequence: newSequence,
          currentSequenceIndex: 0
        };
        this.campaigns.set(updated.campaignId, updatedCampaign);
      }
    }
    
    return updated;
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
      id,
      campaignId: insertResult.campaignId || null,
      amount: insertResult.amount || null,
      winner: insertResult.winner,
      timestamp: new Date(),
    };
    this.spinResults.set(id, result);
    
    // Update campaign statistics if campaignId is provided
    if (insertResult.campaignId) {
      const campaign = this.campaigns.get(insertResult.campaignId);
      if (campaign) {
        const updatedCampaign = {
          ...campaign,
          currentWinners: (campaign.currentWinners || 0) + 1,
          currentSpent: (campaign.currentSpent || 0) + (insertResult.amount || 0),
        };
        this.campaigns.set(insertResult.campaignId, updatedCampaign);
      }

      // Update wheel section current wins count
      const wheelSections = Array.from(this.wheelSections.values());
      const matchingSection = wheelSections.find(section => 
        section.campaignId === insertResult.campaignId &&
        section.text === insertResult.winner &&
        section.amount === insertResult.amount
      );

      if (matchingSection) {
        const updatedSection = {
          ...matchingSection,
          currentWins: (matchingSection.currentWins || 0) + 1,
        };
        this.wheelSections.set(matchingSection.id, updatedSection);
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
      // Reset wheel section current wins
      Array.from(this.wheelSections.entries()).forEach(([sectionId, section]) => {
        if (section.campaignId === campaignId) {
          const updatedSection = {
            ...section,
            currentWins: 0,
          };
          this.wheelSections.set(sectionId, updatedSection);
        }
      });
    } else {
      this.spinResults.clear();
    }
  }
}

export const storage = new MemStorage();
