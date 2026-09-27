/**
 * VarshaNetra - Centralized Application & Supabase Configuration
 *
 * Establishes a single canonical source of truth for:
 * 1. Application URL resolution across local, Vercel preview, and Vercel production domains.
 * 2. Supabase environment variable normalization, whitespace trimming, and validation.
 * 3. Supabase configuration contract across Client Components, Server Components, Route Handlers,
 *    Middleware, Server Actions, and Telemetry Health Audits.
 */

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  url: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
  keyType: "PUBLISHABLE" | "ANON" | "SERVICE_ROLE" | "NONE";
  diagnosticReason: string | null;
  endpointDisplay: string;
}

/**
 * Resolves the primary canonical application URL.
 * Priority order:
 * 1. NEXT_PUBLIC_APP_URL (explicitly configured user/district domain)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel production domain e.g. varshanetra.vercel.app)
 * 3. VERCEL_URL (Vercel preview deployment domain)
 * 4. Fallback to http://localhost:3000
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, "")}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

/**
 * Generates an absolute URL for Supabase authentication redirects and magic-link callbacks.
 */
export function getAuthRedirectUrl(path = "/dashboard"): string {
  const baseUrl = getAppUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
/**
 * Production project defaults for VarshaNetra public Supabase instance.
 * Safe public keys protected by PostgreSQL Row-Level Security (RLS).
 */
export const PROJECT_DEFAULT_SUPABASE_URL = "https://vxyfdnvxjynwgmzsrylk.supabase.co";
export const PROJECT_DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable__F7kpzAvsaqDKdVav8ezcQ_LnE1lRVF";

/**
 * Helper to clean and sanitize environment variable strings.
 * Handles accidental quotes, trailing semicolons, and pasted KEY=VALUE syntax.
 */
function cleanEnv(val: string | undefined): string | null {
  if (!val) return null;
  let trimmed = val.trim();

  // Strip surrounding quotes if present: "..." or '...'
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // If user pasted KEY=VALUE syntax into the Vercel Value field
  if (trimmed.includes("=")) {
    const parts = trimmed.split("=");
    if (parts[0].includes("SUPABASE") && parts[1]) {
      trimmed = parts.slice(1).join("=").trim();
    }
  }

  // Strip trailing semicolons or slashes
  trimmed = trimmed.replace(/;+$/, "").trim();

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validates whether a candidate string is a plausible Supabase URL.
 */
function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Resolves the canonical Supabase configuration.
 * Safe for both Client and Server environments:
 * - In client bundles, server-only variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are undefined.
 * - In server runtimes, resolves both NEXT_PUBLIC_ and server-only variable fallbacks.
 * - If Vercel environment variables are unset, seamlessly uses the project's verified public endpoints.
 */
export function getSupabaseConfig(): SupabaseConfigStatus {
  // 1. Resolve URL (priority: explicit env -> server env -> verified project default)
  const envUrl =
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanEnv(process.env.SUPABASE_URL);
  const rawUrl = envUrl || PROJECT_DEFAULT_SUPABASE_URL;

  // 2. Resolve Anon / Publishable Key
  const rawPublishableKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const rawAnonKey =
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnv(process.env.SUPABASE_ANON_KEY) ||
    cleanEnv(process.env.SUPABASE_PUBLISHABLE_KEY);

  const clientKey = rawPublishableKey || rawAnonKey || PROJECT_DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  // 3. Resolve Service Role Key (server-only)
  const rawServiceRoleKey =
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    cleanEnv(process.env.SUPABASE_SECRET_KEY);

  // Check for placeholder strings
  const isUrlPlaceholder = Boolean(
    rawUrl &&
      (rawUrl.includes("your-project-id") ||
        rawUrl.includes("placeholder-project") ||
        rawUrl.includes("[project-ref]"))
  );

  const isKeyPlaceholder = Boolean(
    clientKey &&
      (clientKey.includes("your-anon-public-key") ||
        clientKey.includes("placeholder-anon-key") ||
        clientKey.includes("your-service-role"))
  );

  let keyType: SupabaseConfigStatus["keyType"] = "NONE";
  if (clientKey) {
    if (clientKey.startsWith("sb_publishable_") || rawPublishableKey) {
      keyType = "PUBLISHABLE";
    } else {
      keyType = "ANON";
    }
  } else if (rawServiceRoleKey) {
    keyType = "SERVICE_ROLE";
  }

  // Diagnostic reason detection
  let diagnosticReason: string | null = null;
  let isConfigured = false;

  if (!rawUrl && !clientKey) {
    diagnosticReason = "NEXT_PUBLIC_SUPABASE_URL and Supabase key are not configured in environment.";
  } else if (!rawUrl) {
    diagnosticReason = "NEXT_PUBLIC_SUPABASE_URL is missing in environment.";
  } else if (isUrlPlaceholder) {
    diagnosticReason = "NEXT_PUBLIC_SUPABASE_URL contains placeholder value.";
  } else if (!isValidSupabaseUrl(rawUrl)) {
    diagnosticReason = `Invalid Supabase URL format: '${rawUrl}'. Must start with https://`;
  } else if (!clientKey && !rawServiceRoleKey) {
    diagnosticReason = "NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY) is missing in environment.";
  } else if (isKeyPlaceholder) {
    diagnosticReason = "Supabase API key contains placeholder value.";
  } else {
    isConfigured = true;
  }

  const endpointDisplay = rawUrl
    ? `${rawUrl.replace(/\/$/, "")}/rest/v1/`
    : "Not Configured (Missing NEXT_PUBLIC_SUPABASE_URL)";

  return {
    isConfigured,
    url: isConfigured && rawUrl ? rawUrl.replace(/\/$/, "") : null,
    anonKey: clientKey || null,
    serviceRoleKey: rawServiceRoleKey || null,
    keyType,
    diagnosticReason,
    endpointDisplay,
  };
}

/**
 * Universal helper returning whether live Supabase credentials exist and pass format validation.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

/**
 * Backward-compatible alias for isSupabaseConfigured.
 */
export function isLiveSupabaseConfigured(): boolean {
  return isSupabaseConfigured();
}

/**
 * Returns the normalized Supabase project URL or fallback placeholder.
 */
export function getSupabaseUrl(): string {
  const config = getSupabaseConfig();
  return config.url || "https://placeholder-project.supabase.co";
}

/**
 * Returns the active public Supabase client key or fallback placeholder.
 */
export function getSupabaseAnonKey(): string {
  const config = getSupabaseConfig();
  return config.anonKey || "placeholder-anon-key";
}

/**
 * Returns the server-only service role key if configured, or falls back to anon key.
 */
export function getSupabaseAdminKey(): string {
  const config = getSupabaseConfig();
  if (config.serviceRoleKey && !config.serviceRoleKey.includes("your-service-role")) {
    return config.serviceRoleKey;
  }
  return config.anonKey || "placeholder-anon-key";
}
