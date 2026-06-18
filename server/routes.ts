import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertPlayerSchema, insertUserSchema, insertStaffSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { addMonths, format } from "date-fns";
import jwt from "jsonwebtoken";
import cors from "cors";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "usp_dev_secret";
const BACKEND_URL = process.env.BACKEND_URL || "";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // CORS — allow any origin (needed for Vercel frontend)
  app.use(cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }));

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  // JWT Auth middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const token = authHeader.split(" ")[1];
      req.user = jwt.verify(token, JWT_SECRET) as any;
      next();
    } catch {
      res.status(401).json({ message: "Token invalide ou expiré" });
    }
  };

  // --- Auth Routes ---

  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ message: "Cet email existe déjà" });
      }
      const user = await storage.createUser(input);
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.status(201).json({ ...user, token });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    const { email, password } = req.body;
    const user = await storage.getUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Identifiants incorrects" });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(200).json({ ...user, token });
  });

  app.post(api.auth.logout.path, (req, res) => {
    res.status(200).json({ message: "Déconnecté" });
  });

  app.get(api.auth.me.path, (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      res.status(200).json(decoded);
    } catch {
      res.status(401).json({ message: "Token invalide" });
    }
  });

  // --- Players Routes ---

  app.get(api.players.list.path, requireAuth, async (req, res) => {
    const players = await storage.getPlayers(req.user.id);
    res.json(players);
  });

  app.get("/api/players/all", async (_req, res) => {
    const allPlayers = await storage.getAllPlayers();
    res.json(allPlayers);
  });

  app.get(api.players.get.path, requireAuth, async (req, res) => {
    const player = await storage.getPlayer(Number(req.params.id));
    if (!player || player.userId !== req.user.id) {
      return res.status(404).json({ message: "Joueur introuvable" });
    }
    res.json(player);
  });

  app.post(api.players.create.path, requireAuth, async (req, res) => {
    try {
      const bodySchema = api.players.create.input.extend({
        goalsScored: z.coerce.number().optional().default(0),
        goalsConceded: z.coerce.number().optional().default(0),
        yellowCards: z.coerce.number().optional().default(0),
        redCards: z.coerce.number().optional().default(0),
        contractDurationMonths: z.coerce.number(),
        matchesPlayed: z.coerce.number().optional().default(0),
        salaryBase: z.coerce.number().optional().default(0),
        salaryBonus: z.coerce.number().optional().default(0),
        passportCopyUrl: z.string().optional(),
        contractCopyUrl: z.string().optional(),
        birthCertificateUrl: z.string().optional(),
        documents: z.array(z.string()).optional().default([]),
        jerseyNumber: z.coerce.number().min(1).max(99).optional().nullable(),
      });
      const input = bodySchema.parse(req.body);
      const startDate = new Date(input.contractStartDate);
      const contractEndDate = format(addMonths(startDate, input.contractDurationMonths), "yyyy-MM-dd");
      const player = await storage.createPlayer(req.user.id, { ...input, contractEndDate });
      res.status(201).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.put(api.players.update.path, requireAuth, async (req, res) => {
    try {
      const playerId = Number(req.params.id);
      const existingPlayer = await storage.getPlayer(playerId);
      if (!existingPlayer || existingPlayer.userId !== req.user.id) {
        return res.status(404).json({ message: "Joueur introuvable" });
      }
      const bodySchema = api.players.update.input.extend({
        goalsScored: z.coerce.number().optional(),
        goalsConceded: z.coerce.number().optional(),
        yellowCards: z.coerce.number().optional(),
        redCards: z.coerce.number().optional(),
        contractDurationMonths: z.coerce.number().optional(),
        matchesPlayed: z.coerce.number().optional(),
        salaryBase: z.coerce.number().optional(),
        salaryBonus: z.coerce.number().optional(),
        passportCopyUrl: z.string().optional(),
        contractCopyUrl: z.string().optional(),
        birthCertificateUrl: z.string().optional(),
        documents: z.array(z.string()).optional(),
        jerseyNumber: z.coerce.number().min(1).max(99).optional().nullable(),
      });
      const input = bodySchema.parse(req.body);
      let contractEndDate = existingPlayer.contractEndDate;
      if (input.contractStartDate || input.contractDurationMonths !== undefined) {
        const startDate = input.contractStartDate ? new Date(input.contractStartDate) : new Date(existingPlayer.contractStartDate);
        const duration = input.contractDurationMonths !== undefined ? input.contractDurationMonths : existingPlayer.contractDurationMonths;
        contractEndDate = format(addMonths(startDate, duration), "yyyy-MM-dd");
      }
      const player = await storage.updatePlayer(playerId, { ...input, contractEndDate });
      res.status(200).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.delete(api.players.delete.path, requireAuth, async (req, res) => {
    const playerId = Number(req.params.id);
    const existingPlayer = await storage.getPlayer(playerId);
    if (!existingPlayer || existingPlayer.userId !== req.user.id) {
      return res.status(404).json({ message: "Joueur introuvable" });
    }
    await storage.deletePlayer(playerId);
    res.status(204).send();
  });

  // --- Upload Route ---

  app.post(api.upload.create.path, requireAuth, upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier reçu" });
    }
    const url = `${BACKEND_URL}/uploads/${req.file.filename}`;
    res.status(200).json({ url });
  });

  // --- Setup Route ---

  app.post("/api/setup", async (req, res) => {
    const adminExists = await storage.hasAdmin();
    if (adminExists) {
      return res.status(403).json({ message: "Configuration déjà effectuée" });
    }
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }
    try {
      const admin = await storage.forceSetAdmin(email.trim(), password);
      res.json({ message: `Compte admin configuré : ${admin.email}` });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erreur de configuration" });
    }
  });

  // --- Admin Management Routes ---

  app.get("/api/admin/users", requireAuth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Accès refusé" });
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(u => ({ id: u.id, email: u.email, role: u.role })));
  });

  app.post("/api/admin/users/:id/promote", requireAuth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Accès refusé" });
    try {
      const updated = await storage.setUserRole(Number(req.params.id), "admin");
      res.json({ id: updated.id, email: updated.email, role: updated.role });
    } catch {
      res.status(500).json({ message: "Erreur lors de la promotion" });
    }
  });

  app.post("/api/admin/users/:id/revoke", requireAuth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Accès refusé" });
    const id = Number(req.params.id);
    if (id === req.user.id) return res.status(400).json({ message: "Vous ne pouvez pas révoquer vos propres droits" });
    try {
      const updated = await storage.setUserRole(id, "user");
      res.json({ id: updated.id, email: updated.email, role: updated.role });
    } catch {
      res.status(500).json({ message: "Erreur lors de la révocation" });
    }
  });

  app.post("/api/admin/users/create", requireAuth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Accès refusé" });
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email et mot de passe requis" });
    try {
      const user = await storage.createAdminUser(email.trim().toLowerCase(), password);
      res.status(201).json({ id: user.id, email: user.email, role: user.role });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Erreur de création" });
    }
  });

  app.post("/api/admin/transfer-role", requireAuth, async (req, res) => {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Accès refusé" });
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis" });
    try {
      await storage.transferAdminRole(email.trim().toLowerCase());
      res.json({ message: `Rôle admin transféré à ${email.trim()}` });
    } catch (err: any) {
      res.status(404).json({ message: err.message || "Erreur lors du transfert" });
    }
  });

  // --- Settings Routes ---

  app.get("/api/settings/season", async (_req, res) => {
    const setting = await storage.getSetting("season");
    res.json({ season: setting?.value || "2025 - 2026" });
  });

  app.put("/api/settings/season", requireAuth, async (req, res) => {
    const { season } = req.body;
    if (!season || typeof season !== "string") {
      return res.status(400).json({ message: "Saison invalide" });
    }
    const updated = await storage.setSetting("season", season.trim());
    res.json({ season: updated.value });
  });

  // --- Staff Routes ---

  app.get("/api/staff", requireAuth, async (req, res) => {
    const members = await storage.getStaff(req.user.id);
    res.json(members);
  });

  app.get("/api/staff/all", async (_req, res) => {
    const members = await storage.getAllStaff();
    res.json(members);
  });

  app.post("/api/staff", requireAuth, async (req, res) => {
    try {
      const bodySchema = insertStaffSchema.extend({
        contractDurationMonths: z.coerce.number(),
        salaryBase: z.coerce.number().optional().default(0),
        salaryBonus: z.coerce.number().optional().default(0),
        documents: z.array(z.string()).optional().default([]),
      });
      const input = bodySchema.parse(req.body);
      const startDate = new Date(input.contractStartDate);
      const contractEndDate = format(addMonths(startDate, input.contractDurationMonths), "yyyy-MM-dd");
      const member = await storage.createStaffMember(req.user.id, { ...input, contractEndDate });
      res.status(201).json(member);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.put("/api/staff/:id", requireAuth, async (req, res) => {
    try {
      const memberId = Number(req.params.id);
      const existing = await storage.getStaffMember(memberId);
      if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ message: "Membre introuvable" });
      }
      const bodySchema = insertStaffSchema.partial().extend({
        contractDurationMonths: z.coerce.number().optional(),
        salaryBase: z.coerce.number().optional(),
        salaryBonus: z.coerce.number().optional(),
        documents: z.array(z.string()).optional(),
      });
      const input = bodySchema.parse(req.body);
      let contractEndDate = existing.contractEndDate;
      if (input.contractStartDate || input.contractDurationMonths !== undefined) {
        const startDate = input.contractStartDate ? new Date(input.contractStartDate) : new Date(existing.contractStartDate);
        const duration = input.contractDurationMonths !== undefined ? input.contractDurationMonths : existing.contractDurationMonths;
        contractEndDate = format(addMonths(startDate, duration), "yyyy-MM-dd");
      }
      const updated = await storage.updateStaffMember(memberId, { ...input, contractEndDate });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  app.delete("/api/staff/:id", requireAuth, async (req, res) => {
    const memberId = Number(req.params.id);
    const existing = await storage.getStaffMember(memberId);
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Membre introuvable" });
    }
    await storage.deleteStaffMember(memberId);
    res.status(204).send();
  });

  // --- News Feed Route ---
  app.get("/api/news", async (req, res) => {
    try {
      const query = (req.query.q as string) || "football Africa";
      const lang = "fr";
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&max=20&apikey=free`;

      // Use GNews free tier — fallback to NewsData.io if needed
      let articles: any[] = [];

      try {
        const r = await fetch(
          `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&max=20&token=9dc57ba7c2d77c01b2f66e1b6dc84e87`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const json = await r.json();
          articles = (json.articles || []).map((a: any) => ({
            title: a.title,
            description: a.description,
            url: a.url,
            image: a.image,
            publishedAt: a.publishedAt,
            source: a.source?.name || "GNews",
          }));
        }
      } catch { /* GNews failed, use fallback */ }

      // Fallback: NewsData.io (free, no key for basic)
      if (!articles.length) {
        try {
          const r2 = await fetch(
            `https://newsdata.io/api/1/news?q=${encodeURIComponent(query)}&language=fr&category=sports`,
            { signal: AbortSignal.timeout(5000) }
          );
          if (r2.ok) {
            const json2 = await r2.json();
            articles = (json2.results || []).slice(0, 20).map((a: any) => ({
              title: a.title,
              description: a.description,
              url: a.link,
              image: a.image_url,
              publishedAt: a.pubDate,
              source: a.source_id || "NewsData",
            }));
          }
        } catch { /* both failed */ }
      }

      // Last fallback: curated static football news
      if (!articles.length) {
        articles = [
          {
            title: "Coupe d'Afrique des Nations 2025 — les qualifications en cours",
            description: "Les équipes africaines s'affrontent pour décrocher leur ticket pour la CAN 2025.",
            url: "https://www.cafonline.com",
            image: null,
            publishedAt: new Date().toISOString(),
            source: "CAF",
          },
          {
            title: "Ligue 1 : les transferts du mercato hivernal",
            description: "Plusieurs joueurs africains évoluant en Ligue 1 font l'objet d'intérêt de clubs européens.",
            url: "https://www.lequipe.fr",
            image: null,
            publishedAt: new Date().toISOString(),
            source: "L'Équipe",
          },
          {
            title: "Football féminin : l'Afrique en plein essor",
            description: "Le football féminin africain connaît une progression remarquable avec de nouveaux investissements.",
            url: "https://www.cafonline.com",
            image: null,
            publishedAt: new Date().toISOString(),
            source: "CAF",
          },
        ];
      }

      res.json({ articles, total: articles.length, fetchedAt: new Date().toISOString() });
    } catch (err: any) {
      res.status(500).json({ articles: [], error: err.message });
    }
  });

  app.post(api.visitors.request.path, async (req, res) => {
    try {
      api.visitors.request.input.parse(req.body);
      res.status(201).json({ message: "Votre demande d'accès a été enregistrée" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  return httpServer;
}
