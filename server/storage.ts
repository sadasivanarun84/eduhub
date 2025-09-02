import { 
  type User, type InsertUser, type WheelSection, type InsertWheelSection, type SpinResult, type InsertSpinResult, 
  type Campaign, type InsertCampaign, type DiceCampaign, type DiceFace, type DiceResult, 
  type InsertDiceCampaign, type InsertDiceFace, type InsertDiceResult 
} from "@shared/schema";
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
  getNextWinnerFromSequence(campaignId: string): Promise<{ section: WheelSection; visualIndex: number } | null>;
  advanceSequenceIndex(campaignId: string): Promise<void>;
  
  // Campaign reset
  resetCampaign(campaignId: string): Promise<Campaign>;
  
  // Dice Game Methods
  getDiceCampaigns(): Promise<DiceCampaign[]>;
  getDiceCampaign(id: string): Promise<DiceCampaign | undefined>;
  getActiveDiceCampaign(): Promise<DiceCampaign | undefined>;
  createDiceCampaign(campaign: InsertDiceCampaign): Promise<DiceCampaign>;
  updateDiceCampaign(id: string, updates: Partial<DiceCampaign>): Promise<DiceCampaign>;
  deleteDiceCampaign(id: string): Promise<void>;
  
  getDiceFaces(campaignId?: string): Promise<DiceFace[]>;
  createDiceFace(face: InsertDiceFace): Promise<DiceFace>;
  updateDiceFace(id: string, updates: Partial<DiceFace>): Promise<DiceFace>;
  deleteDiceFace(id: string): Promise<void>;
  clearDiceFaces(campaignId?: string): Promise<void>;
  
  getDiceResults(campaignId?: string): Promise<DiceResult[]>;
  createDiceResult(result: InsertDiceResult): Promise<DiceResult>;
  clearDiceResults(campaignId?: string): Promise<void>;
  
  getNextDiceWinnerFromSequence(campaignId: string): Promise<{ face: DiceFace; faceNumber: number } | null>;
  advanceDiceSequenceIndex(campaignId: string): Promise<void>;
  resetDiceCampaign(campaignId: string): Promise<DiceCampaign>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private campaigns: Map<string, Campaign>;
  private wheelSections: Map<string, WheelSection>;
  private spinResults: Map<string, SpinResult>;
  
  // Dice Game Storage
  private diceCampaigns: Map<string, DiceCampaign>;
  private diceFaces: Map<string, DiceFace>;
  private diceResults: Map<string, DiceResult>;

  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.wheelSections = new Map();
    this.spinResults = new Map();
    
    // Dice Game Storage
    this.diceCampaigns = new Map();
    this.diceFaces = new Map();
    this.diceResults = new Map();
    
    // Initialize with default data
    this.initializeDefaults();
    this.initializeDiceDefaults();
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

  private initializeDiceDefaults() {
    // Create default dice campaign
    const diceCampaignId = randomUUID();
    const defaultDiceCampaign: DiceCampaign = {
      id: diceCampaignId,
      name: "Default Dice Campaign",
      totalAmount: null,
      totalWinners: 100,
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: [],
      currentSequenceIndex: 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.diceCampaigns.set(diceCampaignId, defaultDiceCampaign);

    // Create default dice faces with standard colors
    const defaultColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];
    const defaultPrizes = ["$10", "$20", "$50", "$100", "$500", "$1000"];
    
    for (let i = 1; i <= 6; i++) {
      const faceId = randomUUID();
      const diceFace: DiceFace = {
        id: faceId,
        campaignId: diceCampaignId,
        faceNumber: i,
        text: defaultPrizes[i - 1],
        color: defaultColors[i - 1],
        amount: parseInt(defaultPrizes[i - 1].replace('$', '')),
        maxWins: 0, // No quota by default
        currentWins: 0,
        createdAt: new Date(),
      };
      this.diceFaces.set(faceId, diceFace);
    }
  }

  // Generate rotation sequence based on wheel sections and their quotas
  private generateRotationSequence(wheelSections: WheelSection[]): number[] {
    const sequence: number[] = [];
    
    // Sort sections by order to get correct visual positions
    const sortedSections = [...wheelSections].sort((a, b) => a.order - b.order);
    
    // Filter sections that have quotas set
    const sectionsWithQuotas = sortedSections.filter(section => 
      section.maxWins && section.maxWins > 0
    );
    
    if (sectionsWithQuotas.length === 0) {
      // No quotas configured, return empty sequence
      return [];
    }
    
    // Create array with section indexes repeated according to their quotas
    const sectionPool: number[] = [];
    sectionsWithQuotas.forEach(section => {
      // Find the visual index of this section in the sorted array
      const visualIndex = sortedSections.findIndex(s => s.id === section.id);
      const quota = section.maxWins || 0;
      for (let i = 0; i < quota; i++) {
        sectionPool.push(visualIndex);
      }
    });
    
    // Shuffle the pool to create a random but quota-compliant sequence
    const shuffled = [...sectionPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    console.log('Generated rotation sequence:', shuffled);
    console.log('Sequence corresponds to sections:', shuffled.map(index => {
      const section = sortedSections[index];
      return section ? `${section.text}(${section.amount || 'no amount'})` : 'invalid';
    }));
    
    return shuffled;
  }

  // Get the next winner from the rotation sequence
  async getNextWinnerFromSequence(campaignId: string): Promise<{ section: WheelSection; visualIndex: number } | null> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || !campaign.rotationSequence || campaign.rotationSequence.length === 0) {
      return null;
    }

    // Check if we've reached the end of the sequence
    const currentIndex = campaign.currentSequenceIndex || 0;
    if (currentIndex >= campaign.rotationSequence.length) {
      return null; // All prizes have been distributed
    }

    const visualIndex = campaign.rotationSequence[currentIndex];
    
    // Get all sections for this campaign, sorted by order
    const wheelSections = await this.getWheelSections(campaignId);
    const nextSection = wheelSections[visualIndex];

    if (!nextSection) {
      // Section was deleted, advance the sequence index
      await this.advanceSequenceIndex(campaignId);
      return this.getNextWinnerFromSequence(campaignId);
    }

    console.log(`Next from sequence: ${nextSection.text}(${nextSection.amount || 'no amount'}) at visual index ${visualIndex}`);
    return { section: nextSection, visualIndex };
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

  // ===============================
  // DICE GAME METHODS
  // ===============================

  // Generate dice rotation sequence based on face quotas
  private generateDiceRotationSequence(diceFaces: DiceFace[]): number[] {
    const sequence: number[] = [];
    
    // Sort faces by face number (1-6)
    const sortedFaces = [...diceFaces].sort((a, b) => a.faceNumber - b.faceNumber);
    
    // Filter faces that have quotas set
    const facesWithQuotas = sortedFaces.filter(face => 
      face.maxWins && face.maxWins > 0
    );
    
    if (facesWithQuotas.length === 0) {
      return [];
    }
    
    // Create array with face numbers repeated according to their quotas
    const facePool: number[] = [];
    facesWithQuotas.forEach(face => {
      const quota = face.maxWins || 0;
      for (let i = 0; i < quota; i++) {
        facePool.push(face.faceNumber);
      }
    });
    
    // Shuffle the pool to create a random but quota-compliant sequence
    const shuffled = [...facePool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    console.log('Generated dice sequence:', shuffled);
    console.log('Sequence corresponds to faces:', shuffled.map(faceNum => {
      const face = sortedFaces.find(f => f.faceNumber === faceNum);
      return face ? `${face.text}(${face.amount || 'no amount'})` : 'invalid';
    }));
    
    return shuffled;
  }

  // Dice Campaigns
  async getDiceCampaigns(): Promise<DiceCampaign[]> {
    return Array.from(this.diceCampaigns.values());
  }

  async getDiceCampaign(id: string): Promise<DiceCampaign | undefined> {
    return this.diceCampaigns.get(id);
  }

  async getActiveDiceCampaign(): Promise<DiceCampaign | undefined> {
    return Array.from(this.diceCampaigns.values()).find(campaign => campaign.isActive);
  }

  async createDiceCampaign(campaign: InsertDiceCampaign): Promise<DiceCampaign> {
    const id = randomUUID();
    const newCampaign: DiceCampaign = {
      id,
      ...campaign,
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: [],
      currentSequenceIndex: 0,
      isActive: true,
      createdAt: new Date(),
    };

    // Deactivate other campaigns
    for (const existingCampaign of this.diceCampaigns.values()) {
      existingCampaign.isActive = false;
    }

    this.diceCampaigns.set(id, newCampaign);
    return newCampaign;
  }

  async updateDiceCampaign(id: string, updates: Partial<DiceCampaign>): Promise<DiceCampaign> {
    const campaign = this.diceCampaigns.get(id);
    if (!campaign) {
      throw new Error("Dice campaign not found");
    }

    const updatedCampaign = { ...campaign, ...updates };
    this.diceCampaigns.set(id, updatedCampaign);

    // Regenerate sequence if needed
    if (updates.name || updates.totalWinners) {
      const diceFaces = await this.getDiceFaces(id);
      updatedCampaign.rotationSequence = this.generateDiceRotationSequence(diceFaces);
      updatedCampaign.currentSequenceIndex = 0;
      this.diceCampaigns.set(id, updatedCampaign);
    }

    return updatedCampaign;
  }

  async deleteDiceCampaign(id: string): Promise<void> {
    this.diceCampaigns.delete(id);
    // Also delete associated dice faces and results
    for (const [faceId, face] of this.diceFaces.entries()) {
      if (face.campaignId === id) {
        this.diceFaces.delete(faceId);
      }
    }
    for (const [resultId, result] of this.diceResults.entries()) {
      if (result.campaignId === id) {
        this.diceResults.delete(resultId);
      }
    }
  }

  // Dice Faces
  async getDiceFaces(campaignId?: string): Promise<DiceFace[]> {
    const faces = Array.from(this.diceFaces.values());
    if (campaignId) {
      return faces.filter(face => face.campaignId === campaignId).sort((a, b) => a.faceNumber - b.faceNumber);
    }
    return faces.sort((a, b) => a.faceNumber - b.faceNumber);
  }

  async createDiceFace(face: InsertDiceFace): Promise<DiceFace> {
    const id = randomUUID();
    const newFace: DiceFace = {
      id,
      ...face,
      currentWins: 0,
      createdAt: new Date(),
    };

    this.diceFaces.set(id, newFace);

    // Regenerate sequence for the campaign
    if (face.campaignId) {
      const campaign = this.diceCampaigns.get(face.campaignId);
      if (campaign) {
        const diceFaces = await this.getDiceFaces(face.campaignId);
        campaign.rotationSequence = this.generateDiceRotationSequence(diceFaces);
        campaign.currentSequenceIndex = 0;
        this.diceCampaigns.set(face.campaignId, campaign);
      }
    }

    return newFace;
  }

  async updateDiceFace(id: string, updates: Partial<DiceFace>): Promise<DiceFace> {
    const face = this.diceFaces.get(id);
    if (!face) {
      throw new Error("Dice face not found");
    }

    const updatedFace = { ...face, ...updates };
    this.diceFaces.set(id, updatedFace);

    // Regenerate sequence for the campaign
    if (face.campaignId) {
      const campaign = this.diceCampaigns.get(face.campaignId);
      if (campaign) {
        const diceFaces = await this.getDiceFaces(face.campaignId);
        campaign.rotationSequence = this.generateDiceRotationSequence(diceFaces);
        campaign.currentSequenceIndex = 0;
        this.diceCampaigns.set(face.campaignId, campaign);
      }
    }

    return updatedFace;
  }

  async deleteDiceFace(id: string): Promise<void> {
    const face = this.diceFaces.get(id);
    if (face) {
      this.diceFaces.delete(id);
      
      // Regenerate sequence for the campaign
      if (face.campaignId) {
        const campaign = this.diceCampaigns.get(face.campaignId);
        if (campaign) {
          const diceFaces = await this.getDiceFaces(face.campaignId);
          campaign.rotationSequence = this.generateDiceRotationSequence(diceFaces);
          campaign.currentSequenceIndex = 0;
          this.diceCampaigns.set(face.campaignId, campaign);
        }
      }
    }
  }

  async clearDiceFaces(campaignId?: string): Promise<void> {
    if (campaignId) {
      for (const [id, face] of this.diceFaces.entries()) {
        if (face.campaignId === campaignId) {
          this.diceFaces.delete(id);
        }
      }
    } else {
      this.diceFaces.clear();
    }
  }

  // Dice Results
  async getDiceResults(campaignId?: string): Promise<DiceResult[]> {
    const results = Array.from(this.diceResults.values());
    if (campaignId) {
      return results.filter(result => result.campaignId === campaignId).sort((a, b) => 
        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );
    }
    return results.sort((a, b) => 
      new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
    );
  }

  async createDiceResult(result: InsertDiceResult): Promise<DiceResult> {
    const id = randomUUID();
    const newResult: DiceResult = {
      id,
      ...result,
      timestamp: new Date(),
    };

    this.diceResults.set(id, newResult);

    // Update campaign counters
    if (result.campaignId) {
      const campaign = this.diceCampaigns.get(result.campaignId);
      if (campaign) {
        campaign.currentWinners = (campaign.currentWinners || 0) + 1;
        campaign.currentSpent = (campaign.currentSpent || 0) + (result.amount || 0);
        this.diceCampaigns.set(result.campaignId, campaign);
      }

      // Update face win counter
      const face = Array.from(this.diceFaces.values()).find(f => 
        f.campaignId === result.campaignId && f.faceNumber === result.faceNumber
      );
      if (face) {
        face.currentWins = (face.currentWins || 0) + 1;
        this.diceFaces.set(face.id, face);
      }
    }

    return newResult;
  }

  async clearDiceResults(campaignId?: string): Promise<void> {
    if (campaignId) {
      for (const [id, result] of this.diceResults.entries()) {
        if (result.campaignId === campaignId) {
          this.diceResults.delete(id);
        }
      }
    } else {
      this.diceResults.clear();
    }
  }

  // Dice Sequence Management
  async getNextDiceWinnerFromSequence(campaignId: string): Promise<{ face: DiceFace; faceNumber: number } | null> {
    const campaign = this.diceCampaigns.get(campaignId);
    if (!campaign || !campaign.rotationSequence || campaign.rotationSequence.length === 0) {
      return null;
    }

    const currentIndex = campaign.currentSequenceIndex || 0;
    if (currentIndex >= campaign.rotationSequence.length) {
      return null; // All prizes have been distributed
    }

    const faceNumber = campaign.rotationSequence[currentIndex];
    const diceFaces = await this.getDiceFaces(campaignId);
    const face = diceFaces.find(f => f.faceNumber === faceNumber);

    if (!face) {
      await this.advanceDiceSequenceIndex(campaignId);
      return this.getNextDiceWinnerFromSequence(campaignId);
    }

    console.log(`Next dice from sequence: ${face.text}(${face.amount || 'no amount'}) on face ${faceNumber}`);
    return { face, faceNumber };
  }

  async advanceDiceSequenceIndex(campaignId: string): Promise<void> {
    const campaign = this.diceCampaigns.get(campaignId);
    if (!campaign) {
      throw new Error("Dice campaign not found");
    }

    campaign.currentSequenceIndex = (campaign.currentSequenceIndex || 0) + 1;
    this.diceCampaigns.set(campaignId, campaign);
  }

  async resetDiceCampaign(campaignId: string): Promise<DiceCampaign> {
    const campaign = this.diceCampaigns.get(campaignId);
    if (!campaign) {
      throw new Error("Dice campaign not found");
    }

    // Reset campaign counters
    campaign.currentSpent = 0;
    campaign.currentWinners = 0;
    campaign.currentSequenceIndex = 0;

    // Clear all dice results for this campaign
    await this.clearDiceResults(campaignId);

    // Reset face counters and regenerate sequence
    const diceFaces = await this.getDiceFaces(campaignId);
    diceFaces.forEach(face => {
      face.currentWins = 0;
      this.diceFaces.set(face.id, face);
    });

    // Regenerate rotation sequence
    campaign.rotationSequence = this.generateDiceRotationSequence(diceFaces);
    
    const updatedCampaign = { ...campaign };
    this.diceCampaigns.set(campaignId, updatedCampaign);
    return updatedCampaign;
  }
}

export const storage = new MemStorage();
