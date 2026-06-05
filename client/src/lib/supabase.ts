import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://zxwzqeygawjjhmtfjsga.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4d3pxZXlnYXdqamhtdGZqc2dhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzY3MTgsImV4cCI6MjA5NTMxMjcxOH0.Yvc0hdGIiibKSnnoXx4RbzKv6t7lkNwu3SXpnySIY4w";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function toCamel<T>(obj: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    result[camelKey] = val;
  }
  return result as T;
}

export function toSnake(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = val;
  }
  return result;
}
