import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  getSupabaseAdminKey,
} from "@/lib/config";

/**
 * Creates a server-side Supabase client.
 * Strictly for Server Components, Route Handlers, and Server Actions.
 */
export async function createServerSupabaseClient(cookieStore?: {
  getAll: () => { name: string; value: string }[];
  set?: (name: string, value: string, options: CookieOptions) => void;
}) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore?.getAll() ?? [];
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          if (cookieStore?.set) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set?.(name, value, options);
            });
          }
        },
      },
    }
  );
}

/**
 * Server-only client for backend services.
 * Prefers SUPABASE_SERVICE_ROLE_KEY if available.
 * Safely falls back to publishable/anon key when service role key is omitted.
 */
export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const keyToUse = getSupabaseAdminKey();

  return createServerClient(
    supabaseUrl,
    keyToUse,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  );
}

/**
 * Standard server client alias for route handlers and background jobs.
 */
export async function createClient() {
  return createAdminClient();
}

