import { db } from "./db";
import { users, players, staff, settings, type InsertUser, type User, type InsertPlayer, type Player, type UpdatePlayerRequest, type StaffMember, type InsertStaff, type UpdateStaffRequest, type Setting } from "@shared/schema";
import { eq, ne } from "drizzle-orm";

export interface IStorage {
  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;

  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  transferAdminRole(newAdminEmail: string): Promise<User>;

  // Players
  getPlayers(userId: number): Promise<Player[]>;
  getAllPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(userId: number, player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: UpdatePlayerRequest): Promise<Player>;
  deletePlayer(id: number): Promise<void>;

  // Staff
  getStaff(userId: number): Promise<StaffMember[]>;
  getAllStaff(): Promise<StaffMember[]>;
  getStaffMember(id: number): Promise<StaffMember | undefined>;
  createStaffMember(userId: number, member: InsertStaff): Promise<StaffMember>;
  updateStaffMember(id: number, member: UpdateStaffRequest): Promise<StaffMember>;
  deleteStaffMember(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getSetting(key: string): Promise<Setting | undefined> {
    const [row] = await db.select().from(settings).where(eq(settings.key, key));
    return row;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
      return updated;
    } else {
      const [created] = await db.insert(settings).values({ key, value }).returning();
      return created;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async transferAdminRole(newAdminEmail: string): Promise<User> {
    const newAdmin = await this.getUserByEmail(newAdminEmail);
    if (!newAdmin) throw new Error("Utilisateur introuvable");
    // Revoke admin from everyone else
    await db.update(users).set({ role: "user" }).where(ne(users.email, newAdminEmail));
    // Grant admin to new account
    const [updated] = await db.update(users).set({ role: "admin" }).where(eq(users.email, newAdminEmail)).returning();
    return updated;
  }

  async getPlayers(userId: number): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.userId, userId));
  }

  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player;
  }

  async createPlayer(userId: number, insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values({ ...insertPlayer, userId }).returning();
    return player;
  }

  async updatePlayer(id: number, updateData: UpdatePlayerRequest): Promise<Player> {
    const [player] = await db.update(players).set(updateData).where(eq(players.id, id)).returning();
    return player;
  }

  async deletePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  // Staff
  async getStaff(userId: number): Promise<StaffMember[]> {
    return await db.select().from(staff).where(eq(staff.userId, userId));
  }

  async getAllStaff(): Promise<StaffMember[]> {
    return await db.select().from(staff);
  }

  async getStaffMember(id: number): Promise<StaffMember | undefined> {
    const [member] = await db.select().from(staff).where(eq(staff.id, id));
    return member;
  }

  async createStaffMember(userId: number, member: InsertStaff): Promise<StaffMember> {
    const [created] = await db.insert(staff).values({ ...member, userId }).returning();
    return created;
  }

  async updateStaffMember(id: number, updateData: UpdateStaffRequest): Promise<StaffMember> {
    const [updated] = await db.update(staff).set(updateData).where(eq(staff.id, id)).returning();
    return updated;
  }

  async deleteStaffMember(id: number): Promise<void> {
    await db.delete(staff).where(eq(staff.id, id));
  }
}

export const storage = new DatabaseStorage();
