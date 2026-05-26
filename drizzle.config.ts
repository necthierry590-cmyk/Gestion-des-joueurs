import { defineConfig } from "drizzle-kit";

let dbCredentials: any;

const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
if (supabaseUrl) {
  const u = new URL(supabaseUrl);
  dbCredentials = {
    host: u.hostname,
    port: parseInt(u.port || "5432"),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
} else {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL must be set.");
  dbCredentials = { url: dbUrl };
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials,
});
