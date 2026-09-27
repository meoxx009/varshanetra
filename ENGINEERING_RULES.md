# VarshaNetra Permanent Engineering Rules Reference

This document formalizes the 21 mandatory engineering rules for the VarshaNetra platform.

---

### Rule 1: Inspect the existing repository before changing code
- AI agents and developers must search the codebase (`grep_search`, `find_by_name`, `list_dir`) before creating duplicate utilities, duplicate types, or modifying files blindly.
- Verify file imports and existing conventions to prevent architectural drift.

### Rule 2: Never delete a previously working feature to implement a new feature
- New features must extend or compose with existing functionality.
- Deprecations must be explicitly planned and flagged; never silently drop working views, controls, or services.

### Rule 3: Do not rewrite the entire project when only a module requires modification
- Keep diffs scoped, atomic, and minimal.
- Never blow away working directories, configuration setups, or whole pages if a bug or change is contained to a single component or utility.

### Rule 4: Use strict TypeScript and avoid `any` unless unavoidable
- Always configure `"strict": true` in `tsconfig.json`.
- When external APIs return unknown data, use type guards, zod schemas, or explicit interface contracts with unknown instead of `any`.

### Rule 5: All UI must be responsive for desktop, tablet, and mobile
- Command center screens utilize wide desktop views (1440px+).
- Field officers and revenue inspectors use tablets (768px - 1024px) and mobile devices (<768px).
- Every view must scale gracefully using standard Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`).

### Rule 6: Every page must have loading, empty, success, and error states
- Components fetching asynchronous telemetry (weather, sensor alerts, resource dispatch) must handle all four states:
  - **Loading**: Skeleton placeholder or dedicated spinner.
  - **Empty**: Contextual zero-state indicating no records match the criteria.
  - **Success**: Operational data rendering with proper layout.
  - **Error**: High-visibility alert explaining the issue and offering a retry action.

### Rule 7: Never hardcode API secrets in source code
- Service role keys, database connection strings, and webhook tokens must reside in environment variables.
- Placeholders in `.env.example` must contain no actual keys.

### Rule 8: Never expose server-only secrets to the browser
- Only environment variables with the `NEXT_PUBLIC_` prefix are compiled into the client bundle.
- Secret keys (e.g. `SUPABASE_SERVICE_ROLE_KEY`) must only be accessed within server actions, server components, or route handlers (`src/app/api/*`).

### Rule 9: Never commit `.env.local`
- `.gitignore` must strictly ignore `.env`, `.env.local`, `.env.*.local`.
- Only `.env.example` is checked into version control.

### Rule 10: Never store passwords in application database tables
- Never create manual `password` or `password_hash` columns in custom application tables.
- All credentials and sessions are delegated to Supabase Auth (`auth.users`).

### Rule 11: Use Supabase Auth for credentials and sessions
- Authentication, RBAC (Role-Based Access Control), session cookies, and JWT verification must leverage `@supabase/ssr` and Supabase Auth.
- Row-Level Security (RLS) policies in PostgreSQL enforce access per user persona.

### Rule 12: External APIs must be accessed through reusable service modules or server endpoints
- All calls to Open-Meteo, Nominatim, Overpass, or flood APIs must reside in `src/lib/services/*` or server route endpoints.
- Modules handle timeouts, headers (e.g., custom User-Agent for Nominatim), caching, and schema normalization.

### Rule 13: Add graceful fallback messages when an external data source fails
- If Open-Meteo or OSM Overpass is temporarily unreachable, render a non-blocking advisory banner stating the source failure with a manual refresh option.

### Rule 14: Do not silently replace failed real API data with fake values
- When an API request fails, report the failure state explicitly.
- Never substitute mock numbers while presenting them to disaster officers as live feeds.

### Rule 15: Clearly label simulated, estimated, model-derived, or demonstration data
- In staging, sandbox, or disaster drill modes, simulated data must be visually badged with a prominent label: `[Simulated Data - Sandbox Mode]` or `[Model Estimate]`.

### Rule 16: Show source and last-updated timestamp for external data
- Every weather card, river gauge widget, and risk overlay must display the provider name (e.g. "Source: Open-Meteo (ECMWF)") and a localized timestamp ("Updated 5 mins ago").

### Rule 17: Do not claim that self-entered Government ID has been officially verified
- Officers onboarding via self-registration must be badged as `Unverified / Self-Declared Government ID` until an official verification workflow is confirmed.

### Rule 18: Do not claim official IMD, CWC, ISRO, NDRF, or Government integration unless actually configured
- Do not fabricate "Live IMD Doppler Radar Link established" if using public Open-Meteo feeds or simulated inputs.
- Clearly differentiate live public datasets from official private government API links.

### Rule 19: Follow OpenStreetMap, Nominatim, Overpass, and other providers' attribution and usage policies
- Display the mandatory attribution: `© OpenStreetMap contributors`.
- Comply with Nominatim usage policy: identify the application with a legitimate `User-Agent` and contact email, and limit queries to at most 1 request per second.
- Overpass API queries must be bounded with sensible timeouts and geographic bounding boxes.

### Rule 20: Run lint, type checking, and production build after each task
- Every task completion requires running:
  1. `npm run lint`
  2. `npm run typecheck` (`tsc --noEmit`)
  3. `npm run build`
- An agent must never declare a task complete if any of these quality gates fail.

### Rule 21: Preserve accessibility, keyboard navigation, and readable emergency colors
- Ensure WCAG AA compliance (4.5:1 text contrast).
- All interactive maps and modals must have keyboard focus states and ARIA tags.
- Use dual-channel alert indicators: combine high-contrast alert colors with text labels and recognizable Lucide icons.
