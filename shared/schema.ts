import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user").notNull(), // "admin" or "user"
  approved: text("approved").array().default(sql`'{}'::text[]`).notNull(), // List of approved visitor emails
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), 
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  photoUrl: text("photo_url"),
  dateOfBirth: text("date_of_birth").notNull(), 
  placeOfBirth: text("place_of_birth").notNull(),
  formerClub: text("former_club").notNull(),
  position: text("position").notNull(),
  goalsScored: integer("goals_scored").default(0).notNull(),
  goalsConceded: integer("goals_conceded").default(0).notNull(),
  yellowCards: integer("yellow_cards").default(0).notNull(),
  redCards: integer("red_cards").default(0).notNull(),
  contractStartDate: text("contract_start_date").notNull(),
  contractDurationMonths: integer("contract_duration_months").notNull(),
  contractEndDate: text("contract_end_date").notNull(), 
  matchesPlayed: integer("matches_played").default(0).notNull(),
  // New fields
  salaryBase: integer("salary_base").default(0).notNull(), // Monthly base salary
  salaryBonus: integer("salary_bonus").default(0).notNull(), // Performance bonus
  passportCopyUrl: text("passport_copy_url").default("").notNull(),
  contractCopyUrl: text("contract_copy_url").default("").notNull(),
  birthCertificateUrl: text("birth_certificate_url").default("").notNull(),
  documents: text("documents").array().default(sql`'{}'::text[]`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  contractEndDate: true,
  userId: true, 
});

export const STAFF_ROLES = [
  "Coach principal",
  "Coach adjoint",
  "Coach des gardiens",
  "Préparateur physique",
  "Manager général",
  "Directeur technique",
  "Secrétaire général",
  "Docteur",
  "Kinésithérapeute",
] as const;

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  photoUrl: text("photo_url"),
  dateOfBirth: text("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  role: text("role").notNull(),
  contractStartDate: text("contract_start_date").notNull(),
  contractDurationMonths: integer("contract_duration_months").notNull(),
  contractEndDate: text("contract_end_date").notNull(),
  salaryBase: integer("salary_base").default(0).notNull(),
  salaryBonus: integer("salary_bonus").default(0).notNull(),
  documents: text("documents").array().default(sql`'{}'::text[]`).notNull(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  contractEndDate: true,
  userId: true,
});

export type StaffMember = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type UpdateStaffRequest = Partial<InsertStaff>;

export const visitors = pgTable("visitors", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  adminId: integer("admin_id").notNull(), // ID of the admin who invited them
  status: text("status").default("pending").notNull(), // "pending", "approved", "rejected"
  createdAt: text("created_at").default(sql`NOW()`).notNull(),
});

export type Visitor = typeof visitors.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type UpdatePlayerRequest = Partial<InsertPlayer>;
