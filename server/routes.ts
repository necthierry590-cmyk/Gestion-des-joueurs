import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertPlayerSchema, insertUserSchema } from "@shared/schema";
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

  return httpServer;
}
