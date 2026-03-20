import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertPlayerSchema, insertUserSchema, insertStaffSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { addMonths, format } from "date-fns";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // --- API Routes ---

  app.post(api.auth.register.path, async (req, res, next) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const user = await storage.createUser(input);
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      next(err);
    }
  });

  app.post(api.auth.login.path, passport.authenticate('local'), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      res.status(200).json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.get(api.players.list.path, requireAuth, async (req, res) => {
    const players = await storage.getPlayers((req.user as any).id);
    res.json(players);
  });

  app.get("/api/players/all", async (_req, res) => {
    const allPlayers = await storage.getAllPlayers();
    res.json(allPlayers);
  });

  app.get(api.players.get.path, requireAuth, async (req, res) => {
    const player = await storage.getPlayer(Number(req.params.id));
    if (!player || player.userId !== (req.user as any).id) {
      return res.status(404).json({ message: 'Player not found' });
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
      const endDate = addMonths(startDate, input.contractDurationMonths);
      const contractEndDate = format(endDate, 'yyyy-MM-dd');

      const player = await storage.createPlayer((req.user as any).id, {
        ...input,
        contractEndDate
      });
      res.status(201).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.put(api.players.update.path, requireAuth, async (req, res) => {
    try {
      const playerId = Number(req.params.id);
      const existingPlayer = await storage.getPlayer(playerId);
      if (!existingPlayer || existingPlayer.userId !== (req.user as any).id) {
         return res.status(404).json({ message: "Player not found" });
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
        const endDate = addMonths(startDate, duration);
        contractEndDate = format(endDate, 'yyyy-MM-dd');
      }

      const player = await storage.updatePlayer(playerId, { ...input, contractEndDate });
      res.status(200).json(player);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.delete(api.players.delete.path, requireAuth, async (req, res) => {
    const playerId = Number(req.params.id);
    const existingPlayer = await storage.getPlayer(playerId);
    if (!existingPlayer || existingPlayer.userId !== (req.user as any).id) {
       return res.status(404).json({ message: "Player not found" });
    }
    await storage.deletePlayer(playerId);
    res.status(204).send();
  });

  app.post(api.upload.create.path, requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.status(200).json({ url });
  });

  // --- Initial Setup Route (uniquement si aucun admin n'existe) ---
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

  // --- Admin Transfer Route ---

  app.post("/api/admin/transfer-role", requireAuth, async (req, res) => {
    const currentUser = req.user as any;
    if (currentUser.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email requis" });
    }
    if (email.trim().toLowerCase() === currentUser.email.toLowerCase()) {
      return res.status(400).json({ message: "Vous êtes déjà l'administrateur" });
    }
    try {
      await storage.transferAdminRole(email.trim().toLowerCase());
      res.json({ message: `Le rôle admin a été transféré à ${email.trim()}` });
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
    const members = await storage.getStaff((req.user as any).id);
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
      const endDate = addMonths(startDate, input.contractDurationMonths);
      const contractEndDate = format(endDate, "yyyy-MM-dd");
      const member = await storage.createStaffMember((req.user as any).id, { ...input, contractEndDate });
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
      if (!existing || existing.userId !== (req.user as any).id) {
        return res.status(404).json({ message: "Membre non trouvé" });
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
    if (!existing || existing.userId !== (req.user as any).id) {
      return res.status(404).json({ message: "Membre non trouvé" });
    }
    await storage.deleteStaffMember(memberId);
    res.status(204).send();
  });

  app.post(api.visitors.request.path, async (req, res) => {
    try {
      const input = api.visitors.request.input.parse(req.body);
      // For now, just acknowledge the request
      // In production, this would save to the visitors table and send emails
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
