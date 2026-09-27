# VarshaNetra - Agent & Engineering Guidelines

**Project**: VarshaNetra - AI Assisted Heavy Rainfall Early Warning, Inundation Intelligence and Disaster Response System  
**Country Context**: India  
**Target Event/Prototype**: Smart India Hackathon 2026  
**Primary Users**: District Magistrate (DM/DC), DDMA, EOC, SDM/Tehsildar, Municipal Control Room, SDRF/NDRF, Police & Fire, PWD, Health Dept, Irrigation/Water Resources Dept.

---

## 1. Permanent Engineering Directives

All AI agents and contributing engineers working in this repository MUST strictly abide by the following 21 engineering rules:

1. **Inspect Before Changing**: Inspect the existing repository structure and code before introducing new files or modifications.
2. **Preserve Existing Features**: Never delete or break a previously working feature to implement a new feature.
3. **Targeted Modifications**: Do not rewrite the entire project or file when only a specific module requires modification.
4. **Strict TypeScript**: Use strict TypeScript (`strict: true`). Avoid `any` unless absolutely unavoidable; prefer explicit domain models and unions.
5. **Universal Responsiveness**: All UI must be fully responsive across desktop (Command Center screens), tablet (field officers), and mobile devices.
6. **Mandatory View States**: Every page, widget, and asynchronous component must explicitly implement four distinct states:
   - `Loading` (skeleton/spinner)
   - `Empty` (informative zero-state)
   - `Success` (operational data view)
   - `Error` (actionable recovery message)
7. **Zero Hardcoded Secrets**: Never hardcode API keys, service role keys, database credentials, or tokens in source code.
8. **Client Bundle Protection**: Never expose server-only secrets (e.g., Supabase service role keys, private backend credentials) to client-side code (`NEXT_PUBLIC_` prefixes must be reserved strictly for safe public keys).
9. **Environment File Security**: Never commit `.env`, `.env.local`, or any secret-bearing files to version control. Maintain `.env.example` with blank or descriptive placeholder values.
10. **Password Isolation**: Never store plaintext or custom-hashed passwords in custom database tables.
11. **Supabase Auth Standards**: Use Supabase Auth for all user credentials, role verification, and session state management.
12. **Reusable Service Layer**: External APIs must be accessed through reusable service modules (`src/lib/services/*`) or dedicated server route handlers with caching and response normalization.
13. **Graceful External Fallbacks**: Implement graceful degradation and explanatory fallback messages when external data sources (Open-Meteo, Nominatim, Overpass) encounter timeouts, rate limits, or outages.
14. **No Fake Data Masquerading**: Do not silently replace failed real API data with synthetic or hardcoded values without explicit visual indicators.
15. **Transparent Data Labeling**: Clearly label simulated, estimated, model-derived, or demonstration data using standard visual badges (`DataSourceBadge`).
16. **Data Provenance & Freshness**: Display the exact source provider and "Last Updated" timestamp for all operational data feeds.
17. **No False Government ID Verification**: Do not claim that self-entered government IDs or credentials have been officially verified unless an authorized government verification integration is active.
18. **No False Official Integration Claims**: Do not claim official IMD, CWC, ISRO, NDRF, or Government server integration unless live credentials and endpoints are officially configured. Label public sandbox feeds transparently.
19. **Attribution & Usage Policy Compliance**: Follow OpenStreetMap, Nominatim, Overpass, and Open-Meteo attribution and usage policies (e.g., proper Nominatim User-Agent headers, rate limiting, and standard OSM copyright attribution).
20. **Mandatory Quality Gate**: Run linting, TypeScript type-checking (`tsc --noEmit`), and production build (`npm run build`) after each task.
21. **Zero Unfixed Regressions & Accessibility**: Fix any errors caused by the current task before declaring completion. Preserve accessibility (WCAG AA), full keyboard navigability, and clear emergency color semantics.

---

## 2. Design System & Emergency Command Aesthetics

- **Style**: Professional Indian district emergency command system.
- **Default Theme**: Light theme (high contrast for daylight and command center projectors).
- **Dark Mode**: Supported.
- **Emergency Palette**:
  - `Primary`: `#0F3D66` (Command Navy)
  - `Secondary`: `#2563EB` (Tactical Blue)
  - `Success`: `#15803D` (Safe / Normal)
  - `Warning`: `#D97706` (Advisory / Watch)
  - `High`: `#EA580C` (Alert / Severe)
  - `Critical`: `#DC2626` (Evacuation / Emergency)
  - `Background`: `#F8FAFC` (Slate Canvas)
  - `Text / Foreground`: `#0F172A` (Slate Dark)
- **Visual Restraint**: Avoid excessive gradients, floating glassmorphism, or purely decorative animations. Maps, telemetry, and critical operational decisions must dominate the viewport.
- **Dual-Channel Severity Indicators**: Never rely solely on color to convey severity; always pair colors with explicit text labels and corresponding icons (e.g., `ShieldAlert`, `AlertTriangle`, `CheckCircle2`).

---

## 3. Technology Stack Reference

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui patterns
- **Icons**: Lucide React
- **Visualization**: Recharts
- **Mapping**: Leaflet + React-Leaflet with OpenStreetMap tiles & attribution
- **Backend / Database**: Supabase PostgreSQL + Supabase Storage + Supabase Auth
- **Weather & Forecast**: Open-Meteo API
- **Geocoding**: OpenStreetMap Nominatim (subject to usage policy & custom User-Agent)
- **Infrastructure / Facilities**: OpenStreetMap Overpass API
