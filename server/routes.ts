import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWheelSectionSchema, insertSpinResultSchema, insertCampaignSchema } from "@shared/schema";

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
      const nextWinner = await storage.getNextWinnerFromSequence(req.params.id);
      res.json(nextWinner);
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

  const httpServer = createServer(app);
  return httpServer;
}
