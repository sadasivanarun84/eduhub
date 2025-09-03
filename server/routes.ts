import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWheelSectionSchema, insertSpinResultSchema, insertCampaignSchema, insertDiceCampaignSchema, insertDiceFaceSchema, insertDiceResultSchema, insertThreeDiceCampaignSchema, insertThreeDiceFaceSchema, insertThreeDiceResultSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
      await storage.updateThreeDiceCampaign(activeCampaign.id, {
        currentWinners,
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

  const httpServer = createServer(app);
  return httpServer;
}
