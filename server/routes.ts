import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTastingSchema, insertWhiskySchema, insertRatingSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== PARTICIPANTS =====
  
  app.post("/api/participants", async (req, res) => {
    try {
      const data = insertParticipantSchema.parse(req.body);
      const existing = await storage.getParticipantByName(data.name);
      if (existing) {
        if (data.pin && existing.pin && data.pin !== existing.pin) {
          return res.status(401).json({ message: "Invalid PIN" });
        }
        return res.json(existing);
      }
      const participant = await storage.createParticipant(data);
      res.status(201).json(participant);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/participants/:id", async (req, res) => {
    const participant = await storage.getParticipant(req.params.id);
    if (!participant) return res.status(404).json({ message: "Not found" });
    res.json(participant);
  });

  app.patch("/api/participants/:id/language", async (req, res) => {
    const { language } = req.body;
    const updated = await storage.updateParticipantLanguage(req.params.id, language);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // ===== TASTINGS =====

  app.get("/api/tastings", async (_req, res) => {
    const all = await storage.getAllTastings();
    res.json(all);
  });

  app.get("/api/tastings/:id", async (req, res) => {
    const tasting = await storage.getTasting(req.params.id);
    if (!tasting) return res.status(404).json({ message: "Not found" });
    res.json(tasting);
  });

  app.get("/api/tastings/code/:code", async (req, res) => {
    const tasting = await storage.getTastingByCode(req.params.code);
    if (!tasting) return res.status(404).json({ message: "Not found" });
    res.json(tasting);
  });

  app.post("/api/tastings", async (req, res) => {
    try {
      const data = insertTastingSchema.parse(req.body);
      const tasting = await storage.createTasting(data);
      res.status(201).json(tasting);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/tastings/:id/status", async (req, res) => {
    const { status, currentAct } = req.body;
    const validStatuses = ["draft", "open", "closed", "reveal", "archived"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateTastingStatus(req.params.id, status, currentAct);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.patch("/api/tastings/:id/reflection", async (req, res) => {
    const { reflection } = req.body;
    const updated = await storage.updateTastingReflection(req.params.id, reflection);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // ===== TASTING PARTICIPANTS =====

  app.get("/api/tastings/:id/participants", async (req, res) => {
    const list = await storage.getTastingParticipants(req.params.id);
    res.json(list);
  });

  app.post("/api/tastings/:id/join", async (req, res) => {
    try {
      const { participantId } = req.body;
      const tastingId = req.params.id;

      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const already = await storage.isParticipantInTasting(tastingId, participantId);
      if (already) return res.json({ message: "Already joined" });

      const tp = await storage.addParticipantToTasting({ tastingId, participantId });
      res.status(201).json(tp);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ===== WHISKIES =====

  app.get("/api/tastings/:id/whiskies", async (req, res) => {
    const list = await storage.getWhiskiesForTasting(req.params.id);
    res.json(list);
  });

  app.post("/api/whiskies", async (req, res) => {
    try {
      const data = insertWhiskySchema.parse(req.body);
      const whisky = await storage.createWhisky(data);
      res.status(201).json(whisky);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/whiskies/:id", async (req, res) => {
    const updated = await storage.updateWhisky(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/whiskies/:id", async (req, res) => {
    await storage.deleteWhisky(req.params.id);
    res.status(204).send();
  });

  // ===== RATINGS =====

  app.get("/api/whiskies/:id/ratings", async (req, res) => {
    const list = await storage.getRatingsForWhisky(req.params.id);
    res.json(list);
  });

  app.get("/api/tastings/:id/ratings", async (req, res) => {
    const list = await storage.getRatingsForTasting(req.params.id);
    res.json(list);
  });

  app.get("/api/ratings/:participantId/:whiskyId", async (req, res) => {
    const rating = await storage.getRatingByParticipantAndWhisky(req.params.participantId, req.params.whiskyId);
    if (!rating) return res.status(404).json({ message: "Not found" });
    res.json(rating);
  });

  app.post("/api/ratings", async (req, res) => {
    try {
      const data = insertRatingSchema.parse(req.body);

      // Check if the tasting is still open for ratings
      const tasting = await storage.getTasting(data.tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.status !== "open" && tasting.status !== "draft") {
        return res.status(403).json({ message: "Evaluation is locked" });
      }

      const rating = await storage.upsertRating(data);
      res.json(rating);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ===== ANALYTICS (for Reveal/Insight Mode) =====

  app.get("/api/tastings/:id/analytics", async (req, res) => {
    const tastingId = req.params.id;
    const tasting = await storage.getTasting(tastingId);
    if (!tasting) return res.status(404).json({ message: "Tasting not found" });

    // Only expose analytics when in reveal or archived
    if (tasting.status !== "reveal" && tasting.status !== "archived") {
      return res.status(403).json({ message: "Analytics not available in Ritual Mode" });
    }

    const allRatings = await storage.getRatingsForTasting(tastingId);
    const whiskyList = await storage.getWhiskiesForTasting(tastingId);

    const whiskyAnalytics = whiskyList.map(w => {
      const wr = allRatings.filter(r => r.whiskyId === w.id);
      const count = wr.length;
      if (count === 0) return { whisky: w, count: 0, avg: 0, median: 0, stdDev: 0, categories: {} };

      const overallScores = wr.map(r => r.overall).sort((a, b) => a - b);
      const avg = overallScores.reduce((a, b) => a + b, 0) / count;
      const median = count % 2 === 0 
        ? (overallScores[count / 2 - 1] + overallScores[count / 2]) / 2 
        : overallScores[Math.floor(count / 2)];
      const variance = overallScores.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      const categoryAvg = (key: keyof typeof wr[0]) => {
        const vals = wr.map(r => r[key] as number);
        return vals.reduce((a, b) => a + b, 0) / count;
      };

      return {
        whisky: w,
        count,
        avg: Math.round(avg * 10) / 10,
        median: Math.round(median * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        categories: {
          nose: Math.round(categoryAvg("nose") * 10) / 10,
          taste: Math.round(categoryAvg("taste") * 10) / 10,
          finish: Math.round(categoryAvg("finish") * 10) / 10,
          balance: Math.round(categoryAvg("balance") * 10) / 10,
        },
      };
    });

    // Sort by average for ranking
    const ranking = [...whiskyAnalytics].sort((a, b) => b.avg - a.avg);

    res.json({
      tasting,
      whiskyAnalytics,
      ranking,
      totalRatings: allRatings.length,
      participantCount: new Set(allRatings.map(r => r.participantId)).size,
    });
  });

  return httpServer;
}
