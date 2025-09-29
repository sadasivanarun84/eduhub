import { db, COLLECTIONS } from './firebase-config';
import { IStorage } from './storage';
import type {
  User, InsertUser, WheelSection, InsertWheelSection, SpinResult, InsertSpinResult,
  Campaign, InsertCampaign, DiceCampaign, DiceFace, DiceResult,
  InsertDiceCampaign, InsertDiceFace, InsertDiceResult,
  ThreeDiceCampaign, ThreeDiceFace, ThreeDiceResult,
  InsertThreeDiceCampaign, InsertThreeDiceFace, InsertThreeDiceResult,
  Classroom, InsertClassroom, Subject, InsertSubject, FlashCard, InsertFlashCard,
  ClassroomAdmin, ClassroomStudent, StudentProgress, InsertStudentProgress
} from "@shared/schema";
import { FieldValue, FieldPath } from 'firebase-admin/firestore';

export class FirebaseStorage implements IStorage {
  
  // ===============================
  // USER MANAGEMENT
  // ===============================
  
  async getUser(id: string): Promise<User | undefined> {
    const doc = await db.collection(COLLECTIONS.USERS).doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as User;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('username', '==', username)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userData = {
      ...insertUser,
      role: insertUser.email === 'sadasivanarun84@gmail.com' ? 'super_admin' : 'user',
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection(COLLECTIONS.USERS).add(userData);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const updateData = {
      ...updates,
      lastLoginAt: FieldValue.serverTimestamp()
    };
    
    await db.collection(COLLECTIONS.USERS).doc(id).update(updateData);
    const doc = await db.collection(COLLECTIONS.USERS).doc(id).get();
    
    if (!doc.exists) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return { id: doc.id, ...doc.data() } as User;
  }

  // ===============================
  // CAMPAIGN MANAGEMENT
  // ===============================

  async getCampaigns(): Promise<Campaign[]> {
    const snapshot = await db.collection(COLLECTIONS.CAMPAIGNS)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const doc = await db.collection(COLLECTIONS.CAMPAIGNS).doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as Campaign;
  }

  async getActiveCampaign(): Promise<Campaign | undefined> {
    const snapshot = await db.collection(COLLECTIONS.CAMPAIGNS)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Campaign;
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const campaignData = {
      name: insertCampaign.name,
      totalAmount: insertCampaign.totalAmount ?? null,
      totalWinners: insertCampaign.totalWinners,
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: [],
      currentSequenceIndex: 0,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTIONS.CAMPAIGNS).add(campaignData);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as Campaign;
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    await db.collection(COLLECTIONS.CAMPAIGNS).doc(id).update(updates);
    
    if (updates.totalWinners !== undefined) {
      const wheelSections = await this.getWheelSections(id);
      const rotationSequence = this.generateRotationSequence(wheelSections);
      await db.collection(COLLECTIONS.CAMPAIGNS).doc(id).update({
        rotationSequence,
        currentSequenceIndex: 0
      });
    }
    
    const doc = await db.collection(COLLECTIONS.CAMPAIGNS).doc(id).get();
    if (!doc.exists) throw new Error(`Campaign with id ${id} not found`);
    return { id: doc.id, ...doc.data() } as Campaign;
  }

  async deleteCampaign(id: string): Promise<void> {
    // Delete campaign
    await db.collection(COLLECTIONS.CAMPAIGNS).doc(id).delete();
    
    // Delete associated wheel sections
    const sectionsSnapshot = await db.collection(COLLECTIONS.WHEEL_SECTIONS)
      .where('campaignId', '==', id)
      .get();
    
    const batch = db.batch();
    sectionsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete associated spin results
    const resultsSnapshot = await db.collection(COLLECTIONS.SPIN_RESULTS)
      .where('campaignId', '==', id)
      .get();
    
    resultsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  async resetCampaign(campaignId: string): Promise<Campaign> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    // Clear all spin results
    await this.clearSpinResults(campaignId);

    // Get current wheel sections to regenerate sequence
    const wheelSections = await this.getWheelSections(campaignId);
    const newSequence = this.generateRotationSequence(wheelSections);

    // Reset campaign progress
    const resetData = {
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: newSequence,
      currentSequenceIndex: 0,
    };

    await db.collection(COLLECTIONS.CAMPAIGNS).doc(campaignId).update(resetData);
    return this.getCampaign(campaignId) as Promise<Campaign>;
  }

  // ===============================
  // WHEEL SECTIONS
  // ===============================

  async getWheelSections(campaignId?: string): Promise<WheelSection[]> {
    let query = db.collection(COLLECTIONS.WHEEL_SECTIONS).orderBy('order', 'asc');
    
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    } else {
      // Get active campaign if no campaignId provided
      const activeCampaign = await this.getActiveCampaign();
      if (activeCampaign) {
        query = query.where('campaignId', '==', activeCampaign.id) as any;
      }
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WheelSection));
  }

  async createWheelSection(insertSection: InsertWheelSection): Promise<WheelSection> {
    const sectionData = {
      campaignId: insertSection.campaignId || null,
      text: insertSection.text,
      color: insertSection.color,
      amount: insertSection.amount || null,
      maxWins: insertSection.maxWins || null,
      currentWins: 0,
      order: insertSection.order,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTIONS.WHEEL_SECTIONS).add(sectionData);
    
    // Regenerate rotation sequence for the campaign
    if (sectionData.campaignId) {
      const allSections = await this.getWheelSections(sectionData.campaignId);
      const newSequence = this.generateRotationSequence(allSections);
      await db.collection(COLLECTIONS.CAMPAIGNS).doc(sectionData.campaignId).update({
        rotationSequence: newSequence,
        currentSequenceIndex: 0
      });
    }
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as WheelSection;
  }

  async updateWheelSection(id: string, updates: Partial<WheelSection>): Promise<WheelSection> {
    await db.collection(COLLECTIONS.WHEEL_SECTIONS).doc(id).update(updates);
    
    const doc = await db.collection(COLLECTIONS.WHEEL_SECTIONS).doc(id).get();
    if (!doc.exists) throw new Error(`Wheel section with id ${id} not found`);
    
    const updated = { id: doc.id, ...doc.data() } as WheelSection;
    
    // Regenerate rotation sequence if needed
    if (updated.campaignId && (updates.maxWins !== undefined || updates.amount !== undefined)) {
      const allSections = await this.getWheelSections(updated.campaignId);
      const newSequence = this.generateRotationSequence(allSections);
      await db.collection(COLLECTIONS.CAMPAIGNS).doc(updated.campaignId).update({
        rotationSequence: newSequence,
        currentSequenceIndex: 0
      });
    }
    
    return updated;
  }

  async deleteWheelSection(id: string): Promise<void> {
    await db.collection(COLLECTIONS.WHEEL_SECTIONS).doc(id).delete();
  }

  async clearWheelSections(campaignId?: string): Promise<void> {
    let query = db.collection(COLLECTIONS.WHEEL_SECTIONS);
    
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    
    const snapshot = await query.get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  // ===============================
  // SPIN RESULTS
  // ===============================

  async getSpinResults(campaignId?: string): Promise<SpinResult[]> {
    let query = db.collection(COLLECTIONS.SPIN_RESULTS).orderBy('timestamp', 'desc');
    
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    } else {
      const activeCampaign = await this.getActiveCampaign();
      if (activeCampaign) {
        query = query.where('campaignId', '==', activeCampaign.id) as any;
      }
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpinResult));
  }

  async createSpinResult(insertResult: InsertSpinResult): Promise<SpinResult> {
    const resultData = {
      campaignId: insertResult.campaignId || null,
      amount: insertResult.amount || null,
      winner: insertResult.winner,
      timestamp: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTIONS.SPIN_RESULTS).add(resultData);
    
    // Update campaign statistics
    if (insertResult.campaignId) {
      const campaignRef = db.collection(COLLECTIONS.CAMPAIGNS).doc(insertResult.campaignId);
      await campaignRef.update({
        currentWinners: FieldValue.increment(1),
        currentSpent: FieldValue.increment(insertResult.amount || 0)
      });

      // Update wheel section current wins count
      const sectionsSnapshot = await db.collection(COLLECTIONS.WHEEL_SECTIONS)
        .where('campaignId', '==', insertResult.campaignId)
        .where('text', '==', insertResult.winner)
        .where('amount', '==', insertResult.amount)
        .get();

      if (!sectionsSnapshot.empty) {
        const sectionDoc = sectionsSnapshot.docs[0];
        await sectionDoc.ref.update({
          currentWins: FieldValue.increment(1)
        });
      }
    }
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as SpinResult;
  }

  async clearSpinResults(campaignId?: string): Promise<void> {
    let query = db.collection(COLLECTIONS.SPIN_RESULTS);
    
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    
    const snapshot = await query.get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Reset campaign and section statistics
    if (campaignId) {
      await db.collection(COLLECTIONS.CAMPAIGNS).doc(campaignId).update({
        currentWinners: 0,
        currentSpent: 0
      });
      
      const sectionsSnapshot = await db.collection(COLLECTIONS.WHEEL_SECTIONS)
        .where('campaignId', '==', campaignId)
        .get();
      
      const sectionBatch = db.batch();
      sectionsSnapshot.docs.forEach(doc => {
        sectionBatch.update(doc.ref, { currentWins: 0 });
      });
      await sectionBatch.commit();
    }
  }

  // ===============================
  // ROTATION SEQUENCE MANAGEMENT
  // ===============================

  private generateRotationSequence(wheelSections: WheelSection[]): number[] {
    const sequence: number[] = [];
    
    const sortedSections = [...wheelSections].sort((a, b) => a.order - b.order);
    const sectionsWithQuotas = sortedSections.filter(section => 
      section.maxWins && section.maxWins > 0
    );
    
    if (sectionsWithQuotas.length === 0) {
      return [];
    }
    
    const sectionPool: number[] = [];
    sectionsWithQuotas.forEach(section => {
      const visualIndex = sortedSections.findIndex(s => s.id === section.id);
      const quota = section.maxWins || 0;
      for (let i = 0; i < quota; i++) {
        sectionPool.push(visualIndex);
      }
    });
    
    // Shuffle the pool
    const shuffled = [...sectionPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  async getNextWinnerFromSequence(campaignId: string): Promise<{ section: WheelSection; visualIndex: number } | null> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign || !campaign.rotationSequence || campaign.rotationSequence.length === 0) {
      return null;
    }

    const currentIndex = campaign.currentSequenceIndex || 0;
    if (currentIndex >= campaign.rotationSequence.length) {
      return null;
    }

    const visualIndex = campaign.rotationSequence[currentIndex];
    const wheelSections = await this.getWheelSections(campaignId);
    const nextSection = wheelSections[visualIndex];

    if (!nextSection) {
      await this.advanceSequenceIndex(campaignId);
      return this.getNextWinnerFromSequence(campaignId);
    }

    return { section: nextSection, visualIndex };
  }

  async advanceSequenceIndex(campaignId: string): Promise<void> {
    const campaign = await this.getCampaign(campaignId);
    if (campaign) {
      const currentIndex = campaign.currentSequenceIndex || 0;
      await db.collection(COLLECTIONS.CAMPAIGNS).doc(campaignId).update({
        currentSequenceIndex: currentIndex + 1
      });
    }
  }

  // ===============================
  // DICE GAME METHODS (Simplified for brevity)
  // ===============================

  async getDiceCampaigns(): Promise<DiceCampaign[]> {
    const snapshot = await db.collection(COLLECTIONS.DICE_CAMPAIGNS).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiceCampaign));
  }

  async getDiceCampaign(id: string): Promise<DiceCampaign | undefined> {
    const doc = await db.collection(COLLECTIONS.DICE_CAMPAIGNS).doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as DiceCampaign;
  }

  async getActiveDiceCampaign(): Promise<DiceCampaign | undefined> {
    const snapshot = await db.collection(COLLECTIONS.DICE_CAMPAIGNS)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as DiceCampaign;
  }

  async createDiceCampaign(campaign: InsertDiceCampaign): Promise<DiceCampaign> {
    const campaignData = {
      ...campaign,
      currentSpent: 0,
      currentWinners: 0,
      rotationSequence: [],
      currentSequenceIndex: 0,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    };

    // Deactivate other campaigns
    const activeSnapshot = await db.collection(COLLECTIONS.DICE_CAMPAIGNS)
      .where('isActive', '==', true)
      .get();
    
    const batch = db.batch();
    activeSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isActive: false });
    });
    
    const docRef = await db.collection(COLLECTIONS.DICE_CAMPAIGNS).add(campaignData);
    await batch.commit();
    
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as DiceCampaign;
  }

  // Implement other dice methods similarly...
  async updateDiceCampaign(id: string, updates: Partial<DiceCampaign>): Promise<DiceCampaign> {
    await db.collection(COLLECTIONS.DICE_CAMPAIGNS).doc(id).update(updates);
    const doc = await db.collection(COLLECTIONS.DICE_CAMPAIGNS).doc(id).get();
    if (!doc.exists) throw new Error("Dice campaign not found");
    return { id: doc.id, ...doc.data() } as DiceCampaign;
  }

  async deleteDiceCampaign(id: string): Promise<void> {
    await db.collection(COLLECTIONS.DICE_CAMPAIGNS).doc(id).delete();
  }

  async getDiceFaces(campaignId?: string): Promise<DiceFace[]> {
    let query = db.collection(COLLECTIONS.DICE_FACES).orderBy('faceNumber', 'asc');
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiceFace));
  }

  async createDiceFace(face: InsertDiceFace): Promise<DiceFace> {
    const faceData = { ...face, currentWins: 0, createdAt: FieldValue.serverTimestamp() };
    const docRef = await db.collection(COLLECTIONS.DICE_FACES).add(faceData);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as DiceFace;
  }

  async updateDiceFace(id: string, updates: Partial<DiceFace>): Promise<DiceFace> {
    await db.collection(COLLECTIONS.DICE_FACES).doc(id).update(updates);
    const doc = await db.collection(COLLECTIONS.DICE_FACES).doc(id).get();
    if (!doc.exists) throw new Error("Dice face not found");
    return { id: doc.id, ...doc.data() } as DiceFace;
  }

  async deleteDiceFace(id: string): Promise<void> {
    await db.collection(COLLECTIONS.DICE_FACES).doc(id).delete();
  }

  async clearDiceFaces(campaignId?: string): Promise<void> {
    let query = db.collection(COLLECTIONS.DICE_FACES);
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    const snapshot = await query.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async getDiceResults(campaignId?: string): Promise<DiceResult[]> {
    let query = db.collection(COLLECTIONS.DICE_RESULTS).orderBy('timestamp', 'desc');
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiceResult));
  }

  async createDiceResult(result: InsertDiceResult): Promise<DiceResult> {
    const resultData = { ...result, timestamp: FieldValue.serverTimestamp() };
    const docRef = await db.collection(COLLECTIONS.DICE_RESULTS).add(resultData);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as DiceResult;
  }

  async clearDiceResults(campaignId?: string): Promise<void> {
    let query = db.collection(COLLECTIONS.DICE_RESULTS);
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    const snapshot = await query.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async getNextDiceWinnerFromSequence(campaignId: string): Promise<{ face: DiceFace; faceNumber: number } | null> {
    // Simplified implementation
    return null;
  }

  async advanceDiceSequenceIndex(campaignId: string): Promise<void> {
    // Simplified implementation
  }

  async resetDiceCampaign(campaignId: string): Promise<DiceCampaign> {
    const campaign = await this.getDiceCampaign(campaignId);
    if (!campaign) throw new Error("Dice campaign not found");
    
    await db.collection(COLLECTIONS.DICE_CAMPAIGNS).doc(campaignId).update({
      currentSpent: 0,
      currentWinners: 0,
      currentSequenceIndex: 0
    });
    
    return this.getDiceCampaign(campaignId) as Promise<DiceCampaign>;
  }

  // ===============================
  // THREE DICE GAME METHODS (Simplified)
  // ===============================

  async getThreeDiceCampaigns(): Promise<ThreeDiceCampaign[]> {
    const snapshot = await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreeDiceCampaign));
  }

  async getThreeDiceCampaign(id: string): Promise<ThreeDiceCampaign | undefined> {
    const doc = await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS).doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as ThreeDiceCampaign;
  }

  async getActiveThreeDiceCampaign(): Promise<ThreeDiceCampaign | undefined> {
    const snapshot = await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (snapshot.empty) return undefined;
    const doc = snapshot.docs[0];
    const campaign = { id: doc.id, ...doc.data() } as ThreeDiceCampaign;
    
    // Ensure default values
    if (campaign.totalRolls === undefined) campaign.totalRolls = 100;
    if (campaign.currentRolls === undefined) campaign.currentRolls = 0;
    
    return campaign;
  }

  async createThreeDiceCampaign(campaign: InsertThreeDiceCampaign): Promise<ThreeDiceCampaign> {
    const campaignData = {
      ...campaign,
      currentSpent: 0,
      currentWinners: 0,
      totalRolls: campaign.totalRolls || 100,
      currentRolls: 0,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS).add(campaignData);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ThreeDiceCampaign;
  }

  async updateThreeDiceCampaign(id: string, updates: Partial<ThreeDiceCampaign>): Promise<ThreeDiceCampaign> {
    await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS).doc(id).update(updates);
    const doc = await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS).doc(id).get();
    if (!doc.exists) throw new Error("Three dice campaign not found");
    return { id: doc.id, ...doc.data() } as ThreeDiceCampaign;
  }

  async deleteThreeDiceCampaign(id: string): Promise<void> {
    await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS).doc(id).delete();
  }

  async getThreeDiceFaces(campaignId?: string): Promise<ThreeDiceFace[]> {
    let query = db.collection(COLLECTIONS.THREE_DICE_FACES)
      .orderBy('diceNumber', 'asc')
      .orderBy('faceNumber', 'asc');
    
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreeDiceFace));
  }

  async createThreeDiceFace(face: InsertThreeDiceFace): Promise<ThreeDiceFace> {
    const faceData = { ...face, currentWins: 0, createdAt: FieldValue.serverTimestamp() };
    const docRef = await db.collection(COLLECTIONS.THREE_DICE_FACES).add(faceData);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ThreeDiceFace;
  }

  async updateThreeDiceFace(id: string, updates: Partial<ThreeDiceFace>): Promise<ThreeDiceFace> {
    await db.collection(COLLECTIONS.THREE_DICE_FACES).doc(id).update(updates);
    const doc = await db.collection(COLLECTIONS.THREE_DICE_FACES).doc(id).get();
    if (!doc.exists) throw new Error("Three dice face not found");
    return { id: doc.id, ...doc.data() } as ThreeDiceFace;
  }

  async deleteThreeDiceFace(id: string): Promise<void> {
    await db.collection(COLLECTIONS.THREE_DICE_FACES).doc(id).delete();
  }

  async clearThreeDiceFaces(campaignId?: string): Promise<void> {
    let query = db.collection(COLLECTIONS.THREE_DICE_FACES);
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    const snapshot = await query.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async getThreeDiceResults(campaignId?: string): Promise<ThreeDiceResult[]> {
    let query = db.collection(COLLECTIONS.THREE_DICE_RESULTS).orderBy('timestamp', 'desc');
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ThreeDiceResult));
  }

  async createThreeDiceResult(result: InsertThreeDiceResult): Promise<ThreeDiceResult> {
    const resultData = { ...result, timestamp: FieldValue.serverTimestamp() };
    const docRef = await db.collection(COLLECTIONS.THREE_DICE_RESULTS).add(resultData);
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ThreeDiceResult;
  }

  async clearThreeDiceResults(campaignId?: string): Promise<void> {
    let query = db.collection(COLLECTIONS.THREE_DICE_RESULTS);
    if (campaignId) {
      query = query.where('campaignId', '==', campaignId) as any;
    }
    const snapshot = await query.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async resetThreeDiceCampaign(campaignId: string): Promise<ThreeDiceCampaign> {
    const campaign = await this.getThreeDiceCampaign(campaignId);
    if (!campaign) throw new Error("Three dice campaign not found");
    
    await db.collection(COLLECTIONS.THREE_DICE_CAMPAIGNS).doc(campaignId).update({
      currentSpent: 0,
      currentWinners: 0,
      currentRolls: 0,
      totalRolls: 100
    });
    
    await this.clearThreeDiceResults(campaignId);
    
    return this.getThreeDiceCampaign(campaignId) as Promise<ThreeDiceCampaign>;
  }

  // ===============================
  // PERIODIC TABLE LEARNING SYSTEM
  // ===============================

  // Classroom methods
  async getClassrooms(): Promise<Classroom[]> {
    console.log("=== Firebase Storage getClassrooms ===");
    console.log("Collection name:", COLLECTIONS.CLASSROOMS);

    try {
      const snapshot = await db.collection(COLLECTIONS.CLASSROOMS).get();
      console.log("Snapshot size:", snapshot.size);
      console.log("Snapshot empty:", snapshot.empty);

      const classrooms = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() } as Classroom;
        console.log("Found classroom:", JSON.stringify(data, null, 2));
        return data;
      });

      console.log("Total classrooms retrieved:", classrooms.length);
      return classrooms;
    } catch (error) {
      console.error("Error in getClassrooms:", error);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }

  async getClassroom(id: string): Promise<Classroom | undefined> {
    const doc = await db.collection(COLLECTIONS.CLASSROOMS).doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as Classroom;
  }

  async createClassroom(classroom: InsertClassroom): Promise<Classroom> {
    console.log("=== Firebase Storage createClassroom ===");
    console.log("Collection name:", COLLECTIONS.CLASSROOMS);
    console.log("Input classroom data:", JSON.stringify(classroom, null, 2));

    const documentData = {
      ...classroom,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    console.log("Document data to save:", JSON.stringify(documentData, null, 2));

    try {
      console.log("Adding document to collection...");
      const docRef = await db.collection(COLLECTIONS.CLASSROOMS).add(documentData);
      console.log("Document added with ID:", docRef.id);

      console.log("Retrieving created classroom...");
      const createdClassroom = await this.getClassroom(docRef.id) as Classroom;
      console.log("Retrieved classroom:", JSON.stringify(createdClassroom, null, 2));

      return createdClassroom;
    } catch (error) {
      console.error("Error in createClassroom:", error);
      console.error("Error stack:", error.stack);
      throw error;
    }
  }

  async updateClassroom(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    await db.collection(COLLECTIONS.CLASSROOMS).doc(id).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.getClassroom(id) as Promise<Classroom>;
  }

  async deleteClassroom(id: string): Promise<void> {
    await db.collection(COLLECTIONS.CLASSROOMS).doc(id).delete();
  }

  // Classroom admin methods (stub implementations)
  async addClassroomAdmin(classroomId: string, adminId: string): Promise<ClassroomAdmin> {
    const docRef = await db.collection(COLLECTIONS.CLASSROOM_ADMINS).add({
      classroomId,
      adminId,
      assignedAt: FieldValue.serverTimestamp(),
    });

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ClassroomAdmin;
  }

  async removeClassroomAdmin(classroomId: string, adminId: string): Promise<void> {
    const snapshot = await db.collection(COLLECTIONS.CLASSROOM_ADMINS)
      .where('classroomId', '==', classroomId)
      .where('adminId', '==', adminId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async getClassroomAdmins(classroomId: string): Promise<ClassroomAdmin[]> {
    const snapshot = await db.collection(COLLECTIONS.CLASSROOM_ADMINS)
      .where('classroomId', '==', classroomId)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassroomAdmin));
  }

  // Classroom student methods (stub implementations)
  async addClassroomStudent(classroomId: string, studentId: string): Promise<ClassroomStudent> {
    const docRef = await db.collection(COLLECTIONS.CLASSROOM_STUDENTS).add({
      classroomId,
      studentId,
      enrolledAt: FieldValue.serverTimestamp(),
    });

    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() } as ClassroomStudent;
  }

  async removeClassroomStudent(classroomId: string, studentId: string): Promise<void> {
    const snapshot = await db.collection(COLLECTIONS.CLASSROOM_STUDENTS)
      .where('classroomId', '==', classroomId)
      .where('studentId', '==', studentId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  async getClassroomStudents(classroomId: string): Promise<ClassroomStudent[]> {
    const snapshot = await db.collection(COLLECTIONS.CLASSROOM_STUDENTS)
      .where('classroomId', '==', classroomId)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassroomStudent));
  }

  // Subject methods
  async getSubjects(classroomId?: string): Promise<Subject[]> {
    if (classroomId) {
      // If classroomId is provided, get subjects associated with that classroom
      // through the classroomSubjects junction table
      const classroomSubjectsSnapshot = await db
        .collection(COLLECTIONS.CLASSROOM_SUBJECTS)
        .where('classroomId', '==', classroomId)
        .get();

      const subjectIds = classroomSubjectsSnapshot.docs.map(doc => doc.data().subjectId);

      if (subjectIds.length === 0) {
        return [];
      }

      // Firebase 'in' query limit is 10, so we need to batch if there are more
      const subjects: Subject[] = [];
      for (let i = 0; i < subjectIds.length; i += 10) {
        const batch = subjectIds.slice(i, i + 10);
        const batchSnapshot = await db
          .collection(COLLECTIONS.SUBJECTS)
          .where(FieldPath.documentId(), 'in', batch)
          .get();

        subjects.push(...batchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));
      }

      return subjects;
    } else {
      // If no classroomId provided, return all subjects
      const snapshot = await db.collection(COLLECTIONS.SUBJECTS).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
    }
  }

  async getSubject(id: string): Promise<Subject | undefined> {
    const doc = await db.collection(COLLECTIONS.SUBJECTS).doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as Subject;
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const docRef = await db.collection(COLLECTIONS.SUBJECTS).add({
      ...subject,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return this.getSubject(docRef.id) as Promise<Subject>;
  }

  async updateSubject(id: string, updates: Partial<Subject>): Promise<Subject> {
    await db.collection(COLLECTIONS.SUBJECTS).doc(id).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.getSubject(id) as Promise<Subject>;
  }

  async deleteSubject(id: string): Promise<void> {
    await db.collection(COLLECTIONS.SUBJECTS).doc(id).delete();
  }

  // Flash card methods (stub implementations)
  async getFlashCards(subjectId?: string): Promise<FlashCard[]> {
    let query: any = db.collection(COLLECTIONS.FLASH_CARDS);

    if (subjectId) {
      query = query.where('subjectId', '==', subjectId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlashCard));
  }

  async getFlashCard(id: string): Promise<FlashCard | undefined> {
    const doc = await db.collection(COLLECTIONS.FLASH_CARDS).doc(id).get();
    if (!doc.exists) return undefined;
    return { id: doc.id, ...doc.data() } as FlashCard;
  }

  async createFlashCard(flashCard: InsertFlashCard): Promise<FlashCard> {
    const docRef = await db.collection(COLLECTIONS.FLASH_CARDS).add({
      ...flashCard,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return this.getFlashCard(docRef.id) as Promise<FlashCard>;
  }

  async updateFlashCard(id: string, updates: Partial<FlashCard>): Promise<FlashCard> {
    await db.collection(COLLECTIONS.FLASH_CARDS).doc(id).update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return this.getFlashCard(id) as Promise<FlashCard>;
  }

  async deleteFlashCard(id: string): Promise<void> {
    await db.collection(COLLECTIONS.FLASH_CARDS).doc(id).delete();
  }

  // Student progress methods (stub implementations)
  async getStudentProgress(studentId: string, subjectId?: string): Promise<StudentProgress[]> {
    let query: any = db.collection(COLLECTIONS.STUDENT_PROGRESS)
      .where('studentId', '==', studentId);

    if (subjectId) {
      // We'd need to join with flash cards to filter by subject, for now return all
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentProgress));
  }

  async updateStudentProgress(studentId: string, flashCardId: string, progress: InsertStudentProgress): Promise<StudentProgress> {
    const existingSnapshot = await db.collection(COLLECTIONS.STUDENT_PROGRESS)
      .where('studentId', '==', studentId)
      .where('flashCardId', '==', flashCardId)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      const doc = existingSnapshot.docs[0];
      await doc.ref.update({
        ...progress,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const updatedDoc = await doc.ref.get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as StudentProgress;
    } else {
      const docRef = await db.collection(COLLECTIONS.STUDENT_PROGRESS).add({
        ...progress,
        studentId,
        flashCardId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() } as StudentProgress;
    }
  }

  // Subject-Classroom association methods
  async linkSubjectToClassroom(subjectId: string, classroomId: string): Promise<void> {
    await db.collection(COLLECTIONS.CLASSROOM_SUBJECTS).add({
      classroomId,
      subjectId,
      assignedAt: FieldValue.serverTimestamp(),
    });
  }

  async unlinkSubjectFromClassroom(subjectId: string, classroomId: string): Promise<void> {
    const snapshot = await db.collection(COLLECTIONS.CLASSROOM_SUBJECTS)
      .where('classroomId', '==', classroomId)
      .where('subjectId', '==', subjectId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  async isSubjectLinkedToClassroom(subjectId: string, classroomId: string): Promise<boolean> {
    const snapshot = await db.collection(COLLECTIONS.CLASSROOM_SUBJECTS)
      .where('classroomId', '==', classroomId)
      .where('subjectId', '==', subjectId)
      .limit(1)
      .get();

    return !snapshot.empty;
  }
}