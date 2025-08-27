import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWheelSectionSchema, insertSpinResultSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Wheel sections routes
  app.get("/api/wheel-sections", async (req, res) => {
    try {
      const sections = await storage.getWheelSections();
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch wheel sections" });
    }
  });

  app.post("/api/wheel-sections", async (req, res) => {
    try {
      const validatedData = insertWheelSectionSchema.parse(req.body);
      const section = await storage.createWheelSection(validatedData);
      res.json(section);
    } catch (error) {
      res.status(400).json({ message: "Invalid wheel section data" });
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
      await storage.clearWheelSections();
      res.json({ message: "All sections cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear sections" });
    }
  });

  // Spin results routes
  app.get("/api/spin-results", async (req, res) => {
    try {
      const results = await storage.getSpinResults();
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch spin results" });
    }
  });

  app.post("/api/spin-results", async (req, res) => {
    try {
      const validatedData = insertSpinResultSchema.parse(req.body);
      const result = await storage.createSpinResult(validatedData);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid spin result data" });
    }
  });

  app.delete("/api/spin-results", async (req, res) => {
    try {
      await storage.clearSpinResults();
      res.json({ message: "Spin history cleared successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear spin history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
