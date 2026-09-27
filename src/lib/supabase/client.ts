import { createBrowserClient } from "@supabase/ssr";
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  isSupabaseConfigured,
} from "@/lib/config";

export { isSupabaseConfigured };

/**
 * Creates a client-side Supabase client.
 * Safe for use in Client Components ('use client').
 */
export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  if (!isSupabaseConfigured()) {
    console.warn(
      "[VarshaNetra:Supabase] Public Supabase credentials not configured in environment. Using fallback mode."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
