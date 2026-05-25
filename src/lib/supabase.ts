import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://wqgasjjifjcjvjbyetrc.supabase.co";
const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2FzamppZmpjanZqYnlldHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAwODcsImV4cCI6MjA5NDg4NjA4N30._LUoiQzYgsYL4g6LY71-P_yE-x58tEfYjSCDkue-TGk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 10 } },
});
