import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/config";

const OPERATIONAL_ROUTES = [
  "/dashboard",
  "/map",
  "/weather",
  "/flood",
  "/impact",
  "/alerts",
  "/incidents",
  "/response",
  "/resources",
  "/field-reports",
  "/analytics",
  "/data-sources",
  "/profile",
  "/situation",
  "/audit",
  "/notifications",
  "/replay",
];

const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { pathname } = request.nextUrl;
  const isOperationalRoute = OPERATIONAL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // If the route is neither an operational route nor an auth route (e.g. landing page /), pass through
  if (!isOperationalRoute && !isAuthRoute) {
    return response;
  }

  let isAuthenticated = false;

  if (isSupabaseConfigured()) {
    const supaConfig = getSupabaseConfig();
    try {
      const supabase = createServerClient(supaConfig.url!, supaConfig.anonKey!, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options as CookieOptions)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      isAuthenticated = Boolean(user);
    } catch {
      isAuthenticated = false;
    }
  }

  // If not authenticated via Supabase session, check evaluation / test session cookie
  if (!isAuthenticated) {
    const demoCookie = request.cookies.get("varshanetra_demo_session");
    isAuthenticated = Boolean(demoCookie?.value);
  }

  // 1. Unauthenticated users accessing protected operational routes -> Redirect to /login
  if (isOperationalRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users visiting /login or /signup -> Redirect to /dashboard
  if (isAuthRoute && isAuthenticated) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
