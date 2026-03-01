import { db } from "./db";
import { users, players, type InsertUser, type User, type InsertPlayer, type Player, type UpdatePlayerRequest } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Players
  getPlayers(userId: number): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(userId: number, player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: UpdatePlayerRequest): Promise<Player>;
  deletePlayer(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
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

  async getPlayers(userId: number): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.userId, userId));
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
}

export const storage = new DatabaseStorage();
