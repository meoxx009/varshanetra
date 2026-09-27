/**
 * VarshaNetra - Security Core: Authentication Guard
 *
 * Enforces authenticated session requirements across API Route Handlers.
 * Seamlessly handles both live Supabase Auth sessions and district evaluation sandbox sessions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/config";

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: string;
  department?: string;
  district?: string;
  authMode: "SUPABASE" | "SANDBOX";
}

export interface AuthGuardResult {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null;
  error?: string;
}

const DEMO_COOKIE_NAME = "varshanetra_demo_session";

/**
 * Validates request credentials from Supabase Auth cookies, Bearer tokens, or sandbox cookies.
 */
export async function authenticateApiRequest(request: NextRequest): Promise<AuthGuardResult> {
  // 1. Check live Supabase authentication
  if (isSupabaseConfigured()) {
    const supaConfig = getSupabaseConfig();
    try {
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : null;

      const supabase = createServerClient(supaConfig.url!, supaConfig.anonKey!, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      });

      let user = null;
      if (bearerToken) {
        const { data } = await supabase.auth.getUser(bearerToken);
        user = data.user;
      } else {
        const { data } = await supabase.auth.getUser();
        user = data.user;
      }

      if (user) {
        return {
          isAuthenticated: true,
          user: {
            id: user.id,
            name: user.user_metadata?.full_name || "District Officer",
            role: user.user_metadata?.role || "OFFICER",
            department: user.user_metadata?.department || "DDMA",
            district: user.user_metadata?.district || "Pune",
            authMode: "SUPABASE",
          },
        };
      }
    } catch {
      // Fall through to sandbox check if Supabase session resolution encounters network errors
    }
  }

  // 2. Check Sandbox / Evaluation session cookie
  const demoCookie = request.cookies.get(DEMO_COOKIE_NAME)?.value;
  if (demoCookie) {
    try {
      let raw = demoCookie;
      try {
        raw = decodeURIComponent(demoCookie);
      } catch {
        // Keep raw if decode fails
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === "string" && parsed.id.length > 0) {
        return {
          isAuthenticated: true,
          user: {
            id: parsed.id,
            name: parsed.full_name || "Command Officer",
            role: parsed.role || "OFFICER",
            department: parsed.department || "DDMA",
            district: parsed.district || "Pune",
            authMode: "SANDBOX",
          },
        };
      }
    } catch {
      // Invalid cookie payload
    }
  }

  return {
    isAuthenticated: false,
    user: null,
    error: "Authentication required. Please sign in with valid district credentials.",
  };
}

/**
 * Standard 401 Unauthorized response for API endpoints.
 */
export function createUnauthorizedResponse(message = "Authentication required. Operation disallowed."): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: "UNAUTHORIZED",
    },
    { status: 401 }
  );
}
