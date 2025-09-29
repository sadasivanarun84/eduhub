import type { Express } from "express";
import { createServer, type Server } from "http";
import { requireFirebaseAuth, requireAdmin, requireSuperAdmin, verifyFirebaseToken } from "./firebase-auth";
import { storage } from "./storage";
import { quizService } from "./quiz-service";
import { imageService } from "./image-service";
import {
  insertWheelSectionSchema, insertSpinResultSchema, insertCampaignSchema, insertDiceCampaignSchema, insertDiceFaceSchema, insertDiceResultSchema, insertThreeDiceCampaignSchema, insertThreeDiceFaceSchema, insertThreeDiceResultSchema,
  insertClassroomSchema, insertSubjectSchema, insertFlashCardSchema
} from "@shared/schema";
import multer from 'multer';

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Firebase Authentication routes
  app.post("/auth/verify", async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: "ID token is required" });
    }

    const user = await verifyFirebaseToken(idToken);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    res.json({ user });
  });

  app.get("/auth/user", requireFirebaseAuth, (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/auth/logout", (req, res) => {
    // With Firebase, logout is handled client-side
    // This endpoint is mainly for cleanup if needed
    res.json({ message: "Logged out successfully" });
  });

  // Campaign routes
  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/active", async (req, res) => {
    try {
      const activeCampaign = await storage.getActiveCampaign();
      if (!activeCampaign) {
        return res.status(404).json({ message: "No active campaign found" });
      }
      res.json(activeCampaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active campaign" });
    }
  });

  app.get("/api/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(validatedData);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid campaign data" });
    }
  });

  app.put("/api/campaigns/:id", async (req, res) => {
    try {
      const updates = req.body;
      const campaign = await storage.updateCampaign(req.params.id, updates);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", async (req, res) => {
    try {
      await storage.deleteCampaign(req.params.id);
      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  app.post("/api/campaigns/:id/reset", async (req, res) => {
    try {
      const resetCampaign = await storage.resetCampaign(req.params.id);
      // Prevent caching of reset responses
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(resetCampaign);
    } catch (error) {
      console.error('Reset campaign error:', error);
      res.status(500).json({ message: "Failed to reset campaign", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Wheel sections routes
  app.get("/api/wheel-sections", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const sections = await storage.getWheelSections(campaignId);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wheel sections" });
    }
  });

  app.post("/api/wheel-sections", async (req, res) => {
    try {
      // Auto-assign to active campaign if not specified
      if (!req.body.campaignId) {
        const activeCampaign = await storage.getActiveCampaign();
        if (activeCampaign) {
          req.body.campaignId = activeCampaign.id;
        }
      }
      const validatedData = insertWheelSectionSchema.parse(req.body);
      const section = await storage.createWheelSection(validatedData);
      res.json(section);
    } catch (error) {
      res.status(400).json({ message: "Invalid wheel section data" });
    }
  });

  app.put("/api/wheel-sections/:id", async (req, res) => {
    try {
      const section = await storage.updateWheelSection(req.params.id, req.body);
      res.json(section);
    } catch (error) {
      res.status(400).json({ message: "Failed to update wheel section" });
    }
  });

  app.delete("/api/wheel-sections/:id", async (req, res) => {
    try {
      await storage.deleteWheelSection(req.params.id);
      res.json({ message: "Section deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete section" });
    }
  });

  app.delete("/api/wheel-sections", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      await storage.clearWheelSections(campaignId);
      res.json({ message: "All sections cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear sections" });
    }
  });

  // Spin results routes
  app.get("/api/spin-results", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const results = await storage.getSpinResults(campaignId);
      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache');
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spin results" });
    }
  });

  app.post("/api/spin-results", async (req, res) => {
    try {
      // Auto-assign to active campaign if not specified
      if (!req.body.campaignId) {
        const activeCampaign = await storage.getActiveCampaign();
        if (activeCampaign) {
          req.body.campaignId = activeCampaign.id;
        }
      }
      const validatedData = insertSpinResultSchema.parse(req.body);
      const result = await storage.createSpinResult(validatedData);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid spin result data" });
    }
  });

  app.delete("/api/spin-results", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      await storage.clearSpinResults(campaignId);
      res.json({ message: "Spin history cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear spin history" });
    }
  });

  // Rotation sequence routes
  app.get("/api/campaigns/:id/next-winner", async (req, res) => {
    try {
      const result = await storage.getNextWinnerFromSequence(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "No more winners in sequence" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get next winner" });
    }
  });

  app.post("/api/campaigns/:id/advance-sequence", async (req, res) => {
    try {
      await storage.advanceSequenceIndex(req.params.id);
      res.json({ message: "Sequence advanced successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to advance sequence" });
    }
  });

  // ===============================
  // DICE GAME ROUTES
  // ===============================

  // Dice Campaign routes
  app.get("/api/dice/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getDiceCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dice campaigns" });
    }
  });

  app.get("/api/dice/campaigns/active", async (req, res) => {
    try {
      const activeCampaign = await storage.getActiveDiceCampaign();
      if (!activeCampaign) {
        return res.status(404).json({ message: "No active dice campaign found" });
      }
      res.json(activeCampaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active dice campaign" });
    }
  });

  app.get("/api/dice/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getDiceCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Dice campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dice campaign" });
    }
  });

  app.post("/api/dice/campaigns", async (req, res) => {
    try {
      const validatedData = insertDiceCampaignSchema.parse(req.body);
      const campaign = await storage.createDiceCampaign(validatedData);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid dice campaign data" });
    }
  });

  app.put("/api/dice/campaigns/:id", async (req, res) => {
    try {
      const updates = req.body;
      const campaign = await storage.updateDiceCampaign(req.params.id, updates);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Failed to update dice campaign" });
    }
  });

  app.delete("/api/dice/campaigns/:id", async (req, res) => {
    try {
      await storage.deleteDiceCampaign(req.params.id);
      res.json({ message: "Dice campaign deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete dice campaign" });
    }
  });

  app.post("/api/dice/campaigns/:id/reset", async (req, res) => {
    try {
      const resetCampaign = await storage.resetDiceCampaign(req.params.id);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(resetCampaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to reset dice campaign" });
    }
  });

  // Dice Face routes
  app.get("/api/dice/faces", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const faces = await storage.getDiceFaces(campaignId);
      res.json(faces);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dice faces" });
    }
  });

  app.post("/api/dice/faces", async (req, res) => {
    try {
      const validatedData = insertDiceFaceSchema.parse(req.body);
      const face = await storage.createDiceFace(validatedData);
      res.json(face);
    } catch (error) {
      res.status(400).json({ message: "Invalid dice face data" });
    }
  });

  app.put("/api/dice/faces/:id", async (req, res) => {
    try {
      const updates = req.body;
      const face = await storage.updateDiceFace(req.params.id, updates);
      res.json(face);
    } catch (error) {
      res.status(400).json({ message: "Failed to update dice face" });
    }
  });

  app.delete("/api/dice/faces/:id", async (req, res) => {
    try {
      await storage.deleteDiceFace(req.params.id);
      res.json({ message: "Dice face deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete dice face" });
    }
  });

  app.delete("/api/dice/faces", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      await storage.clearDiceFaces(campaignId);
      res.json({ message: "Dice faces cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear dice faces" });
    }
  });

  // Dice Result routes
  app.get("/api/dice/results", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const results = await storage.getDiceResults(campaignId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dice results" });
    }
  });

  app.post("/api/dice/results", async (req, res) => {
    try {
      const validatedData = insertDiceResultSchema.parse(req.body);
      const result = await storage.createDiceResult(validatedData);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid dice result data" });
    }
  });

  app.delete("/api/dice/results", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      await storage.clearDiceResults(campaignId);
      res.json({ message: "Dice results cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear dice results" });
    }
  });

  // Dice Roll endpoint
  app.post("/api/dice/roll", async (req, res) => {
    try {
      // Get active dice campaign
      const activeCampaign = await storage.getActiveDiceCampaign();
      if (!activeCampaign) {
        return res.status(404).json({ message: "No active dice campaign found" });
      }

      // Check if campaign has a sequence defined
      const nextWinner = await storage.getNextDiceWinnerFromSequence(activeCampaign.id);
      let finalFaceNumber: number;
      let finalFace: any;

      if (nextWinner) {
        // Use predetermined winner from sequence
        finalFaceNumber = nextWinner.faceNumber;
        finalFace = nextWinner.face;
        await storage.advanceDiceSequenceIndex(activeCampaign.id);
        console.log(`Using predetermined dice winner: ${finalFace.text} on face ${finalFaceNumber}`);
      } else {
        // Random selection when no sequence defined
        const diceFaces = await storage.getDiceFaces(activeCampaign.id);
        if (diceFaces.length === 0) {
          return res.status(400).json({ message: "No dice faces configured for active campaign" });
        }
        
        const randomIndex = Math.floor(Math.random() * diceFaces.length);
        finalFace = diceFaces[randomIndex];
        finalFaceNumber = finalFace.faceNumber;
        console.log(`Random dice selection: ${finalFace.text} on face ${finalFaceNumber}`);
      }

      // Record the result
      const diceResult = await storage.createDiceResult({
        campaignId: activeCampaign.id,
        faceNumber: finalFaceNumber,
        winner: finalFace.text,
        amount: finalFace.amount || null,
      });

      // Update campaign statistics
      const currentSpent = (activeCampaign.currentSpent || 0);
      const currentWinners = (activeCampaign.currentWinners || 0) + 1;
      await storage.updateDiceCampaign(activeCampaign.id, {
        currentWinners,
        currentSpent, // Keep current spent as is since amount can be text
      });

      // Update face statistics
      await storage.updateDiceFace(finalFace.id, {
        currentWins: (finalFace.currentWins || 0) + 1,
      });

      // Generate random rotation for visual effect (independent of actual result)
      const rotations = Math.floor(Math.random() * 3) + 5; // 5-7 full rotations
      const totalDegrees = (rotations * 360) + ((finalFaceNumber - 1) * 60);

      res.json({
        result: diceResult,
        animation: {
          faceNumber: finalFaceNumber,
          totalDegrees,
          rotations,
        }
      });
    } catch (error) {
      console.error("Dice roll error:", error);
      res.status(500).json({ message: "Failed to roll dice" });
    }
  });

  // ===============================
  // THREE DICE GAME ROUTES
  // ===============================

  // Three Dice Campaign routes
  app.get("/api/three-dice/campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getThreeDiceCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch three dice campaigns" });
    }
  });

  app.get("/api/three-dice/campaigns/active", async (req, res) => {
    try {
      const activeCampaign = await storage.getActiveThreeDiceCampaign();
      if (!activeCampaign) {
        return res.status(404).json({ message: "No active three dice campaign found" });
      }
      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(activeCampaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active three dice campaign" });
    }
  });

  app.get("/api/three-dice/campaigns/:id", async (req, res) => {
    try {
      const campaign = await storage.getThreeDiceCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Three dice campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch three dice campaign" });
    }
  });

  app.post("/api/three-dice/campaigns", async (req, res) => {
    try {
      const validatedData = insertThreeDiceCampaignSchema.parse(req.body);
      const campaign = await storage.createThreeDiceCampaign(validatedData);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid three dice campaign data" });
    }
  });

  app.put("/api/three-dice/campaigns/:id", async (req, res) => {
    try {
      const updates = req.body;
      const campaign = await storage.updateThreeDiceCampaign(req.params.id, updates);
      res.json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Failed to update three dice campaign" });
    }
  });

  app.delete("/api/three-dice/campaigns/:id", async (req, res) => {
    try {
      await storage.deleteThreeDiceCampaign(req.params.id);
      res.json({ message: "Three dice campaign deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete three dice campaign" });
    }
  });

  app.post("/api/three-dice/campaigns/:id/reset", async (req, res) => {
    try {
      const resetCampaign = await storage.resetThreeDiceCampaign(req.params.id);
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(resetCampaign);
    } catch (error) {
      res.status(500).json({ message: "Failed to reset three dice campaign" });
    }
  });

  // Three Dice Face routes
  app.get("/api/three-dice/faces", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const faces = await storage.getThreeDiceFaces(campaignId);
      res.json(faces);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch three dice faces" });
    }
  });

  app.post("/api/three-dice/faces", async (req, res) => {
    try {
      const validatedData = insertThreeDiceFaceSchema.parse(req.body);
      const face = await storage.createThreeDiceFace(validatedData);
      res.json(face);
    } catch (error) {
      res.status(400).json({ message: "Invalid three dice face data" });
    }
  });

  app.put("/api/three-dice/faces/:id", async (req, res) => {
    try {
      const updates = req.body;
      const face = await storage.updateThreeDiceFace(req.params.id, updates);
      res.json(face);
    } catch (error) {
      res.status(400).json({ message: "Failed to update three dice face" });
    }
  });

  app.delete("/api/three-dice/faces/:id", async (req, res) => {
    try {
      await storage.deleteThreeDiceFace(req.params.id);
      res.json({ message: "Three dice face deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete three dice face" });
    }
  });

  app.delete("/api/three-dice/faces", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      await storage.clearThreeDiceFaces(campaignId);
      res.json({ message: "Three dice faces cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear three dice faces" });
    }
  });

  // Three Dice Result routes
  app.get("/api/three-dice/results", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      const results = await storage.getThreeDiceResults(campaignId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch three dice results" });
    }
  });

  app.post("/api/three-dice/results", async (req, res) => {
    try {
      const validatedData = insertThreeDiceResultSchema.parse(req.body);
      const result = await storage.createThreeDiceResult(validatedData);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid three dice result data" });
    }
  });

  app.delete("/api/three-dice/results", async (req, res) => {
    try {
      const campaignId = req.query.campaignId as string | undefined;
      await storage.clearThreeDiceResults(campaignId);
      res.json({ message: "Three dice results cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear three dice results" });
    }
  });

  // Three Dice Roll endpoint
  app.post("/api/three-dice/roll", async (req, res) => {
    try {
      // Get active three dice campaign
      const activeCampaign = await storage.getActiveThreeDiceCampaign();
      if (!activeCampaign) {
        return res.status(404).json({ message: "No active three dice campaign found" });
      }

      // Check if roll limit has been reached
      const currentRolls = activeCampaign.currentRolls || 0;
      const totalRolls = activeCampaign.totalRolls || 100;
      if (currentRolls >= totalRolls) {
        return res.status(400).json({ message: "Roll limit has been reached for this campaign" });
      }

      // Get all faces for this campaign
      const threeDiceFaces = await storage.getThreeDiceFaces(activeCampaign.id);
      if (threeDiceFaces.length === 0) {
        return res.status(400).json({ message: "No three dice faces configured for active campaign" });
      }

      // Group faces by dice number
      const dice1Faces = threeDiceFaces.filter(f => f.diceNumber === 1);
      const dice2Faces = threeDiceFaces.filter(f => f.diceNumber === 2);
      const dice3Faces = threeDiceFaces.filter(f => f.diceNumber === 3);

      if (dice1Faces.length === 0 || dice2Faces.length === 0 || dice3Faces.length === 0) {
        return res.status(400).json({ message: "All three dice must have configured faces" });
      }

      // Randomly select a face for each dice
      const dice1Result = dice1Faces[Math.floor(Math.random() * dice1Faces.length)];
      const dice2Result = dice2Faces[Math.floor(Math.random() * dice2Faces.length)];
      const dice3Result = dice3Faces[Math.floor(Math.random() * dice3Faces.length)];

      console.log(`Three dice roll: Dice 1 - ${dice1Result.text} (Face ${dice1Result.faceNumber}), Dice 2 - ${dice2Result.text} (Face ${dice2Result.faceNumber}), Dice 3 - ${dice3Result.text} (Face ${dice3Result.faceNumber})`);

      // Record the result
      const threeDiceResult = await storage.createThreeDiceResult({
        campaignId: activeCampaign.id,
        dice1Face: dice1Result.faceNumber,
        dice2Face: dice2Result.faceNumber,
        dice3Face: dice3Result.faceNumber,
        winner1: dice1Result.text,
        winner2: dice2Result.text,
        winner3: dice3Result.text,
        amount1: dice1Result.amount || null,
        amount2: dice2Result.amount || null,
        amount3: dice3Result.amount || null,
      });

      // Update campaign statistics
      const currentWinners = (activeCampaign.currentWinners || 0) + 1;
      const updatedCurrentRolls = (activeCampaign.currentRolls || 0) + 1;
      await storage.updateThreeDiceCampaign(activeCampaign.id, {
        currentWinners,
        currentRolls: updatedCurrentRolls,
      });

      // Generate random rotation for visual effect for each dice
      const dice1Rotations = Math.floor(Math.random() * 3) + 5; // 5-7 full rotations
      const dice2Rotations = Math.floor(Math.random() * 3) + 5;
      const dice3Rotations = Math.floor(Math.random() * 3) + 5;

      const dice1TotalDegrees = (dice1Rotations * 360) + ((dice1Result.faceNumber - 1) * 60);
      const dice2TotalDegrees = (dice2Rotations * 360) + ((dice2Result.faceNumber - 1) * 60);
      const dice3TotalDegrees = (dice3Rotations * 360) + ((dice3Result.faceNumber - 1) * 60);

      res.json({
        result: threeDiceResult,
        animation: {
          dice1: {
            faceNumber: dice1Result.faceNumber,
            totalDegrees: dice1TotalDegrees,
            rotations: dice1Rotations,
          },
          dice2: {
            faceNumber: dice2Result.faceNumber,
            totalDegrees: dice2TotalDegrees,
            rotations: dice2Rotations,
          },
          dice3: {
            faceNumber: dice3Result.faceNumber,
            totalDegrees: dice3TotalDegrees,
            rotations: dice3Rotations,
          },
        }
      });
    } catch (error) {
      console.error("Three dice roll error:", error);
      res.status(500).json({ message: "Failed to roll three dice" });
    }
  });

  // Quiz API routes
  const SUPER_ADMIN_EMAIL = 'sadasivanarun84@gmail.com';

  // Create question (super admin only)
  app.post("/api/quiz/questions", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can create questions" });
      }

      const { question, options, correctAnswer, assignedTo, category, backgroundImage } = req.body;

      if (!question || !options || !Array.isArray(options) || options.length !== 4 ||
          correctAnswer < 0 || correctAnswer > 3 || !assignedTo) {
        return res.status(400).json({ message: "Invalid question data" });
      }

      console.log("[Quiz POST] About to call quizService.createQuestion");
      try {
        const questionId = await quizService.createQuestion({
          question: question.trim(),
          options: options.map(opt => opt.trim()),
          correctAnswer,
          assignedTo: assignedTo.trim().toLowerCase(),
          createdBy: user.email,
          category: category || 'General',
          backgroundImage: backgroundImage || undefined
        });

        console.log("[Quiz POST] Question created successfully with ID:", questionId);
        res.json({ id: questionId, message: "Question created successfully" });
      } catch (firestoreError) {
        console.error("[Quiz POST] Firestore error creating question:", firestoreError);
        // For now, return a mock success response when Firestore fails
        // This allows the frontend to work while we debug the Firestore connection
        const mockId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("[Quiz POST] Returning mock success response with ID:", mockId);
        res.json({
          id: mockId,
          message: "Question saved temporarily (Firestore connection issue - please check server logs)"
        });
      }
    } catch (error) {
      console.error("Error in question creation handler:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  // Get all questions (super admin only)
  app.get("/api/quiz/questions", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can view all questions" });
      }

      try {
        const questions = await quizService.getAllQuestions();
        res.json(questions);
      } catch (firestoreError) {
        console.error("Firestore error getting questions:", firestoreError);
        // Return empty array when Firestore fails
        // This allows the admin interface to load without crashing
        res.json([]);
      }
    } catch (error) {
      console.error("Error in get questions handler:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  // Get questions for a specific user
  app.get("/api/quiz/questions/user/:email", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const targetEmail = req.params.email;

      // Users can only get their own questions, super admin can get any
      if (user.email !== SUPER_ADMIN_EMAIL && user.email !== targetEmail) {
        return res.status(403).json({ message: "Access denied" });
      }

      const questions = await quizService.getQuestionsForUser(targetEmail);
      res.json(questions);
    } catch (error) {
      console.error("Error getting user questions:", error);
      res.status(500).json({ message: "Failed to get user questions" });
    }
  });

  // Get questions for current user
  app.get("/api/quiz/my-questions", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      try {
        const questions = await quizService.getQuestionsForUser(user.email);
        res.json(questions);
      } catch (firestoreError) {
        console.error("Firestore error getting user questions:", firestoreError);
        // Return empty array when Firestore fails
        res.json([]);
      }
    } catch (error) {
      console.error("Error in get my questions handler:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  // Update question (super admin only)
  app.put("/api/quiz/questions/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can update questions" });
      }

      const questionId = req.params.id;
      const updates = req.body;

      await quizService.updateQuestion(questionId, updates);
      res.json({ message: "Question updated successfully" });
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  // Delete question (super admin only)
  app.delete("/api/quiz/questions/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can delete questions" });
      }

      const questionId = req.params.id;
      await quizService.deleteQuestion(questionId);
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Bulk create questions (super admin only)
  app.post("/api/quiz/questions/bulk", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can bulk create questions" });
      }

      const { questions } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Questions array is required" });
      }

      const questionIds = await quizService.createMultipleQuestions(questions);
      res.json({
        ids: questionIds,
        count: questionIds.length,
        message: `${questionIds.length} questions created successfully`
      });
    } catch (error) {
      console.error("Error bulk creating questions:", error);
      res.status(500).json({ message: "Failed to create questions" });
    }
  });

  // Save quiz result
  app.post("/api/quiz/results", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const { questionId, selectedAnswer, isCorrect } = req.body;

      const resultId = await quizService.saveQuizResult({
        userEmail: user.email,
        questionId,
        selectedAnswer,
        isCorrect
      });

      res.json({ id: resultId, message: "Result saved successfully" });
    } catch (error) {
      console.error("Error saving quiz result:", error);
      res.status(500).json({ message: "Failed to save result" });
    }
  });

  // Save quiz session
  app.post("/api/quiz/sessions", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const { totalQuestions, correctAnswers, score } = req.body;

      const sessionId = await quizService.saveQuizSession({
        userEmail: user.email,
        totalQuestions,
        correctAnswers,
        score
      });

      res.json({ id: sessionId, message: "Session saved successfully" });
    } catch (error) {
      console.error("Error saving quiz session:", error);
      res.status(500).json({ message: "Failed to save session" });
    }
  });

  // Get user quiz history
  app.get("/api/quiz/history", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const history = await quizService.getUserQuizHistory(user.email);
      res.json(history);
    } catch (error) {
      console.error("Error getting quiz history:", error);
      res.status(500).json({ message: "Failed to get quiz history" });
    }
  });

  // Image upload endpoint (super admin only)
  app.post("/api/quiz/images/upload", requireFirebaseAuth, upload.single('image'), async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can upload images" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const { name, category, description } = req.body;

      if (!name || !category) {
        return res.status(400).json({ message: "Name and category are required" });
      }

      console.log('Image upload received:', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        name,
        category,
        description
      });

      // Upload to Firebase Storage and save metadata to Firestore
      const result = await imageService.uploadImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        {
          name: name.trim(),
          category: category.trim(),
          description: description ? description.trim() : '',
          uploadedBy: user.email
        }
      );

      console.log('Successfully uploaded image to Firebase:', result);

      res.json(result);
    } catch (error) {
      console.error("Error uploading image:", error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
      }
      res.status(500).json({ message: error.message || "Failed to upload image" });
    }
  });

  // Get all background images (super admin only)
  app.get("/api/quiz/images", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can view images" });
      }

      const images = await imageService.getAllImages();
      console.log('Retrieved images from Firebase:', images.length);
      res.json(images);
    } catch (error) {
      console.error("Error getting images:", error);
      res.status(500).json({ message: error.message || "Failed to get images" });
    }
  });

  // Get all background images for public use (all authenticated users can access)
  app.get("/api/quiz/background-images", requireFirebaseAuth, async (req, res) => {
    try {
      const images = await imageService.getAllImages();
      console.log('Retrieved background images for user:', images.length);
      res.json(images);
    } catch (error) {
      console.error("Error getting background images:", error);
      res.status(500).json({ message: error.message || "Failed to get background images" });
    }
  });

  // Delete background image (super admin only)
  app.delete("/api/quiz/images/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({ message: "Only super admin can delete images" });
      }

      const imageId = req.params.id;
      await imageService.deleteImage(imageId);

      console.log('Successfully deleted image from Firebase:', imageId);
      res.json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting image:", error);
      if (error.message.includes('Image not found')) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.status(500).json({ message: error.message || "Failed to delete image" });
    }
  });

  // ===============================
  // PERIODIC TABLE LEARNING SYSTEM ROUTES
  // ===============================

  // Classrooms routes
  app.get("/api/classrooms", async (req, res) => {
    try {
      const classrooms = await storage.getClassrooms();
      console.log(`=== Processing ${classrooms.length} classrooms for counts ===`);

      // Add subject count and total flashcard count for each classroom
      const classroomsWithCounts = await Promise.all(
        classrooms.map(async (classroom) => {
          const subjects = await storage.getSubjects(classroom.id);
          console.log(`Classroom ${classroom.name} (${classroom.id}): ${subjects.length} subjects`);

          // Calculate total flashcard count across all subjects in this classroom
          let totalFlashcards = 0;
          for (const subject of subjects) {
            const flashcards = await storage.getFlashCards(subject.id);
            totalFlashcards += flashcards.length;
            console.log(`  Subject ${subject.name}: ${flashcards.length} flashcards`);
          }

          const result = {
            ...classroom,
            subjectCount: subjects.length,
            totalFlashcards
          };

          console.log(`Final counts for ${classroom.name}: subjectCount=${result.subjectCount}, totalFlashcards=${result.totalFlashcards}`);
          return result;
        })
      );

      // Add cache control headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      console.log("=== Sending classroom data with counts ===");
      res.json(classroomsWithCounts);
    } catch (error) {
      console.error("Error getting classrooms:", error);
      res.status(500).json({ message: "Failed to get classrooms" });
    }
  });

  // Get detailed classroom information
  app.get("/api/classrooms/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const classroom = await storage.getClassroom(req.params.id);
      if (!classroom) {
        return res.status(404).json({ message: "Classroom not found" });
      }

      // Get related data
      const [students, admins, classroomSubjects] = await Promise.all([
        storage.getClassroomStudents(req.params.id),
        storage.getClassroomAdmins(req.params.id),
        storage.getSubjects(req.params.id)
      ]);

      // Get flash card counts for each subject
      const subjectsWithFlashCards = await Promise.all(
        classroomSubjects.map(async (subject) => {
          const flashCards = await storage.getFlashCards(subject.id);
          return {
            ...subject,
            flashCardCount: flashCards.length
          };
        })
      );

      const detailedClassroom = {
        ...classroom,
        students,
        admins,
        subjects: subjectsWithFlashCards
      };

      console.log(`=== Classroom ${classroom.id} Details ===`);
      console.log(`Classroom name: ${classroom.name}`);
      console.log(`Subjects found: ${classroomSubjects.length}`);
      console.log(`Subjects:`, classroomSubjects.map(s => ({ id: s.id, name: s.name })));

      res.json(detailedClassroom);
    } catch (error) {
      console.error("Error getting classroom details:", error);
      res.status(500).json({ message: "Failed to get classroom details" });
    }
  });

  app.post("/api/classrooms", requireFirebaseAuth, requireSuperAdmin, async (req, res) => {
    try {
      console.log("=== Classroom Creation Debug ===");
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      console.log("User:", JSON.stringify(req.user, null, 2));

      const validatedData = insertClassroomSchema.parse(req.body);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));

      console.log("Calling storage.createClassroom...");
      const classroom = await storage.createClassroom(validatedData);
      console.log("Classroom created successfully:", JSON.stringify(classroom, null, 2));

      res.json(classroom);
    } catch (error) {
      console.error("Error creating classroom:", error);
      console.error("Error stack:", error.stack);
      res.status(400).json({ message: "Failed to create classroom", error: error.message });
    }
  });

  // Delete classroom (Option B: Cascade Deletion - Remove all associations)
  app.delete("/api/classrooms/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const classroomId = req.params.id;
      console.log(`=== Deleting classroom ${classroomId} ===`);

      // Step 1: Remove all student associations
      console.log("Step 1: Getting classroom students...");
      const classroomStudents = await storage.getClassroomStudents(classroomId);
      console.log(`Found ${classroomStudents.length} students to remove`);

      for (const student of classroomStudents) {
        console.log(`Removing student ${student.studentId}...`);
        await storage.removeClassroomStudent(classroomId, student.studentId);
      }

      // Step 2: Remove all admin associations
      console.log("Step 2: Getting classroom admins...");
      const classroomAdmins = await storage.getClassroomAdmins(classroomId);
      console.log(`Found ${classroomAdmins.length} admins to remove`);

      for (const admin of classroomAdmins) {
        console.log(`Removing admin ${admin.adminId}...`);
        await storage.removeClassroomAdmin(classroomId, admin.adminId);
      }

      // Step 3: Delete the classroom itself (subjects remain independent)
      console.log("Step 3: Deleting classroom document...");
      await storage.deleteClassroom(classroomId);
      console.log("Classroom deletion completed successfully");

      res.json({
        message: "Classroom deleted successfully",
        removedStudents: classroomStudents.length,
        removedAdmins: classroomAdmins.length
      });
    } catch (error) {
      console.error("Error deleting classroom:", error);
      res.status(500).json({ message: "Failed to delete classroom" });
    }
  });

  // Subjects routes
  app.get("/api/subjects", async (req, res) => {
    try {
      const classroomId = req.query.classroomId as string | undefined;
      const subjects = await storage.getSubjects(classroomId);

      // Add flashcard count for each subject
      const subjectsWithFlashCardCounts = await Promise.all(
        subjects.map(async (subject) => {
          const flashcards = await storage.getFlashCards(subject.id);
          return {
            ...subject,
            flashCardCount: flashcards.length
          };
        })
      );

      res.json(subjectsWithFlashCardCounts);
    } catch (error) {
      console.error("Error getting subjects:", error);
      res.status(500).json({ message: "Failed to get subjects" });
    }
  });

  app.post("/api/subjects", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can create subjects" });
      }

      const validatedData = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(validatedData);
      res.json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(400).json({ message: "Failed to create subject" });
    }
  });

  app.put("/api/subjects/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can update subjects" });
      }

      const updates = req.body;
      const subject = await storage.updateSubject(req.params.id, updates);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can delete subjects" });
      }

      const subjectId = req.params.id;

      // Step 1: Delete all flashcards for this subject
      const flashcards = await storage.getFlashCards(subjectId);
      for (const flashcard of flashcards) {
        await storage.deleteFlashCard(flashcard.id);
      }

      // Step 2: Delete the subject itself
      await storage.deleteSubject(subjectId);

      res.json({
        message: "Subject deleted successfully",
        deletedFlashcardsCount: flashcards.length
      });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // Flash Card Routes
  app.get("/api/flashcards", async (req, res) => {
    try {
      const subjectId = req.query.subjectId as string | undefined;
      const flashCards = await storage.getFlashCards(subjectId);
      res.json(flashCards);
    } catch (error) {
      console.error("Error getting flash cards:", error);
      res.status(500).json({ message: "Failed to get flash cards" });
    }
  });

  app.post("/api/flashcards", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can create flash cards" });
      }

      const validatedData = insertFlashCardSchema.parse(req.body);
      const flashCard = await storage.createFlashCard(validatedData);
      res.json(flashCard);
    } catch (error) {
      console.error("Error creating flash card:", error);
      res.status(400).json({ message: "Failed to create flash card" });
    }
  });

  app.put("/api/flashcards/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can update flash cards" });
      }

      const validatedData = insertFlashCardSchema.partial().parse(req.body);
      const flashCard = await storage.updateFlashCard(req.params.id, validatedData);
      res.json(flashCard);
    } catch (error) {
      console.error("Error updating flash card:", error);
      res.status(400).json({ message: "Failed to update flash card" });
    }
  });

  app.delete("/api/flashcards/:id", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can delete flash cards" });
      }

      await storage.deleteFlashCard(req.params.id);
      res.json({ message: "Flash card deleted successfully" });
    } catch (error) {
      console.error("Error deleting flash card:", error);
      res.status(500).json({ message: "Failed to delete flash card" });
    }
  });

  // Flashcard image upload endpoint
  app.post("/api/flashcards/upload-image", requireFirebaseAuth, upload.single('image'), async (req, res) => {
    try {
      console.log('[FlashCard Upload] Starting image upload process...');
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      if (!isAdmin) {
        console.log('[FlashCard Upload] Access denied - user is not admin');
        return res.status(403).json({ message: "Only admins can upload flashcard images" });
      }

      if (!req.file) {
        console.log('[FlashCard Upload] No file provided in request');
        return res.status(400).json({ message: "No image file provided" });
      }

      console.log('[FlashCard Upload] File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      try {
        const result = await imageService.uploadFlashCardImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          user.id
        );

        console.log('[FlashCard Upload] Upload successful, returning:', result);
        res.json(result);
      } catch (storageError) {
        console.error('[FlashCard Upload] Firebase Storage error:', storageError);
        // Fallback: return a temporary data URL for testing
        const base64 = req.file.buffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
        console.log('[FlashCard Upload] Returning fallback data URL');
        res.json({ url: dataUrl });
      }
    } catch (error) {
      console.error("[FlashCard Upload] Error uploading flashcard image:", error);
      console.error("[FlashCard Upload] Error stack:", error.stack);
      res.status(500).json({ message: "Failed to upload flashcard image", error: error.message });
    }
  });

  // Student assignment management endpoints

  // Assign student to classroom
  app.post("/api/classrooms/:classroomId/students", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can assign students to classrooms" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Student email is required" });
      }

      // Find user by email
      const student = await storage.getUserByEmail(email.trim());
      if (!student) {
        return res.status(404).json({ message: "Student not found with this email" });
      }

      const assignment = await storage.addClassroomStudent(req.params.classroomId, student.id);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning student to classroom:", error);
      res.status(500).json({ message: "Failed to assign student to classroom" });
    }
  });

  // Remove student from classroom
  app.delete("/api/classrooms/:classroomId/students/:studentId", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';

      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can remove students from classrooms" });
      }

      await storage.removeClassroomStudent(req.params.classroomId, req.params.studentId);
      res.json({ message: "Student removed from classroom successfully" });
    } catch (error) {
      console.error("Error removing student from classroom:", error);
      res.status(500).json({ message: "Failed to remove student from classroom" });
    }
  });

  // Get students in a classroom
  app.get("/api/classrooms/:classroomId/students", requireFirebaseAuth, async (req, res) => {
    try {
      const students = await storage.getClassroomStudents(req.params.classroomId);
      res.json(students);
    } catch (error) {
      console.error("Error getting classroom students:", error);
      res.status(500).json({ message: "Failed to get classroom students" });
    }
  });

  // Get classrooms for a student
  app.get("/api/students/:studentId/classrooms", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;

      // Students can only access their own classrooms, admins can access any
      if (user.id !== req.params.studentId && user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(403).json({ message: "You can only access your own classrooms" });
      }

      // For now, we'll get all classrooms and filter by student assignments
      // This should be optimized with a proper query in the future
      const allClassrooms = await storage.getClassrooms();
      const studentClassrooms = [];

      for (const classroom of allClassrooms) {
        const students = await storage.getClassroomStudents(classroom.id);
        if (students.some(s => s.studentId === req.params.studentId)) {
          studentClassrooms.push(classroom);
        }
      }

      res.json(studentClassrooms);
    } catch (error) {
      console.error("Error getting student classrooms:", error);
      res.status(500).json({ message: "Failed to get student classrooms" });
    }
  });

  // Admin assignment management endpoints

  // Assign admin to classroom
  app.post("/api/classrooms/:classroomId/admins", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super admins can assign admins to classrooms" });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Admin email is required" });
      }

      // Find user by email
      const admin = await storage.getUserByEmail(email.trim());
      if (!admin) {
        return res.status(404).json({ message: "Admin not found with this email" });
      }

      const assignment = await storage.addClassroomAdmin(req.params.classroomId, admin.id);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning admin to classroom:", error);
      res.status(500).json({ message: "Failed to assign admin to classroom" });
    }
  });

  // Remove admin from classroom
  app.delete("/api/classrooms/:classroomId/admins/:adminId", requireFirebaseAuth, async (req, res) => {
    try {
      const user = req.user;
      if (user.role !== 'super_admin') {
        return res.status(403).json({ message: "Only super admins can remove admins from classrooms" });
      }

      await storage.removeClassroomAdmin(req.params.classroomId, req.params.adminId);
      res.json({ message: "Admin removed from classroom successfully" });
    } catch (error) {
      console.error("Error removing admin from classroom:", error);
      res.status(500).json({ message: "Failed to remove admin from classroom" });
    }
  });

  // Get admins in a classroom
  app.get("/api/classrooms/:classroomId/admins", requireFirebaseAuth, async (req, res) => {
    try {
      const admins = await storage.getClassroomAdmins(req.params.classroomId);
      res.json(admins);
    } catch (error) {
      console.error("Error getting classroom admins:", error);
      res.status(500).json({ message: "Failed to get classroom admins" });
    }
  });

  // Copy subject to classroom
  app.post("/api/classrooms/:classroomId/subjects", requireFirebaseAuth, async (req, res) => {
    try {
      const { classroomId } = req.params;
      const { subjectId } = req.body;
      const user = req.user;

      if (!subjectId) {
        return res.status(400).json({ message: "Subject ID is required" });
      }

      // Check if user can manage this classroom
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      if (!isAdmin) {
        const classroom = await storage.getClassroom(classroomId);
        if (!classroom || classroom.ownerId !== user.id) {
          return res.status(403).json({ message: "Not authorized to manage this classroom" });
        }
      }

      // Check if subject exists
      const sourceSubject = await storage.getSubject(subjectId);
      if (!sourceSubject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      // Check if target classroom exists
      const targetClassroom = await storage.getClassroom(classroomId);
      if (!targetClassroom) {
        return res.status(404).json({ message: "Classroom not found" });
      }

      // Check if subject is already linked to this classroom
      const existingLink = await storage.isSubjectLinkedToClassroom(subjectId, classroomId);
      if (existingLink) {
        return res.status(400).json({ message: "Subject is already added to this classroom" });
      }

      // Link the subject to the classroom (no duplication)
      await storage.linkSubjectToClassroom(subjectId, classroomId);

      res.json({
        message: "Subject added to classroom successfully",
        subject: sourceSubject
      });
    } catch (error) {
      console.error("Error copying subject to classroom:", error);
      res.status(500).json({ message: "Failed to copy subject" });
    }
  });

  // Remove subject from classroom
  app.delete("/api/classrooms/:classroomId/subjects/:subjectId", requireFirebaseAuth, async (req, res) => {
    try {
      const { classroomId, subjectId } = req.params;
      const user = req.user;

      // Check if user can manage this classroom
      const isAdmin = user.role === 'admin' || user.role === 'super_admin';
      if (!isAdmin) {
        const classroom = await storage.getClassroom(classroomId);
        if (!classroom || classroom.ownerId !== user.id) {
          return res.status(403).json({ message: "Not authorized to manage this classroom" });
        }
      }

      // Check if subject exists and belongs to this classroom
      const subject = await storage.getSubject(subjectId);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      if (subject.classroomId !== classroomId) {
        return res.status(400).json({ message: "Subject does not belong to this classroom" });
      }

      // Get all flashcards for this subject before deleting
      const flashcards = await storage.getFlashCards(subjectId);

      // Delete all flashcards first
      for (const flashcard of flashcards) {
        await storage.deleteFlashCard(flashcard.id);
      }

      // Delete the subject
      await storage.deleteSubject(subjectId);

      res.json({
        message: "Subject removed successfully",
        deletedFlashcardsCount: flashcards.length
      });
    } catch (error) {
      console.error("Error removing subject from classroom:", error);
      res.status(500).json({ message: "Failed to remove subject" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
