import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const directUrl = process.env.DATABASE_URL;

if (!supabaseUrl && !directUrl) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL must be set.");
}

let poolConfig: pg.PoolConfig;
if (supabaseUrl) {
  const u = new URL(supabaseUrl);
  poolConfig = {
    host: u.hostname,
    port: parseInt(u.port || "5432"),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
} else {
  poolConfig = { connectionString: directUrl! };
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });
