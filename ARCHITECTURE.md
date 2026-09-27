# VarshaNetra - System Architecture & Design Blueprint

**Project Title**: VarshaNetra - AI Assisted Heavy Rainfall Early Warning, Inundation Intelligence and Disaster Response System  
**Deployment Context**: Indian District Emergency Operations Centers (DEOC / DDMA)

---

## 1. Executive Summary & Objective

VarshaNetra is an AI-assisted situational awareness, inundation modeling, and disaster decision-support system designed for district-level authorities in India. It bridges meteorological forecasts with real-time field intelligence, municipal stormwater monitoring, river gauge tracking, and coordinated emergency dispatch across line departments during extreme weather events.

---

## 2. Target Personas & District Administrative Hierarchy

The platform coordinates multiple stakeholder tiers across the district incident command framework:

```
                          ┌───────────────────────────┐
                          │   District Magistrate /   │
                          │   District Collector      │
                          │ (District Incident Comm.) │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┴────────────────────────────┐
           ▼                                                         ▼
┌───────────────────────────┐                             ┌───────────────────────────┐
│           DDMA            │                             │ Emergency Operations Ctr  │
│ (District Disaster Mgmt)  │                             │        (EOC 24x7)         │
└──────────┬────────────────┘                             └──────────┬────────────────┘
           │                                                         │
           ├────────────────────────┬────────────────────────────────┤
           ▼                        ▼                                ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────────────────┐
│   Sub-Divisional      │ │ Municipal Control Ctr │ │ Tactical Forces:                │
│   Magistrate (SDM) /  │ │  (Stormwater/Drain)   │ │ • SDRF / NDRF Incident Cmdrs    │
│   Tehsildar (Taluk)   │ └───────────────────────┘ │ • Police & Fire Officials       │
└───────────────────────┘                           └─────────────────────────────────┘
                                  │
           ┌──────────────────────┴──────────────────────┐
           ▼                                             ▼
┌───────────────────────────────┐         ┌─────────────────────────────────┐
│     Line Dept: PWD & Roads    │         │  Line Dept: Irrigation & Water  │
│     Line Dept: Health & CMO   │         │  Resources Dept (CWC Gauges)    │
└───────────────────────────────┘         └─────────────────────────────────┘
```

### Persona Responsibilities
1. **District Magistrate (DM/DC)**: High-level district situation map, critical alert approvals, school closure / section 144 declarations, military/NDRF escalation requests.
2. **DDMA & EOC Officer**: 24x7 operational coordination, alert broadcasting, resource dispatch monitoring, inter-agency communication logs.
3. **SDM & Tehsildar**: Taluk/Block-level flood inundation reports, relief camp capacity tracking, field verification tasks.
4. **Municipal Control Room**: Urban low-lying waterlogging monitoring, pump deployment, drain desilt blockage reports.
5. **SDRF & NDRF Coordinators**: Search-and-rescue team deployment, rescue boat allocation, real-time field task updates.
6. **Police & Fire Officials**: Traffic diversions, submerged road blockades, emergency evacuations.
7. **PWD**: Bridge structural integrity checks, road washaway logs, emergency culvert repairs.
8. **Health Department**: Emergency medical centers, snakebite antivenom / waterborne epidemic supplies, field ambulances.
9. **Irrigation & Water Resources**: Reservoir discharge warnings, upstream dam release schedules, river embankment breaches.

---

## 3. Technology Stack & Component Architecture

### 3.1 Frontend & Application Layer
- **Framework**: Next.js 15+ (App Router)
- **Language**: Strict TypeScript (`tsconfig.json` with strict mode enabled)
- **Styling**: Tailwind CSS with official district emergency theme palette
- **Component Primitives**: shadcn/ui (Radix UI primitives wrapped in accessible Tailwind components)
- **Icons**: Lucide React
- **Data Visualization**: Recharts (hydrographs, rainfall charts, resource capacity)
- **Geographic Information System (GIS)**: Leaflet + React-Leaflet with OpenStreetMap tiles (and fallback offline tile caching)

### 3.2 Backend & Data Layer
- **Database**: Supabase PostgreSQL
  - Row-Level Security (RLS) policies scoped to district administrative roles.
  - GeoJSON / PostGIS geospatial queries for flood zone polygons and shelter radiuses.
- **Authentication**: Supabase Auth (JWT-based session cookies via `@supabase/ssr`).
- **Storage**: Supabase Storage for disaster field photos, drone survey imagery, damage reports.
- **Realtime Telemetry**: Supabase Realtime Channels for live incident dispatch updates.

### 3.3 External Services & Data Ingestion
- **Weather & Forecast**: Open-Meteo API (precipitation, precipitation probability, hourly rain intensity, soil moisture, wind gusts).
- **Geocoding & Reverse Geocoding**: OpenStreetMap Nominatim with strict adherence to the Nominatim usage policy (identifying `User-Agent`, rate limiting to $\le 1$ req/sec, local client caching).
- **Critical Infrastructure & POIs**: OpenStreetMap Overpass API (hospitals, schools/shelters, fire stations, bridges, police stations).
- **Attribution & Transparency**: Mandatory visual badges for every data source; transparent labeling for simulated vs live feeds.

---

## 4. Directory Structure Blueprint

```
VarshaNetra/
├── .agents/
│   └── rules/                  # Antigravity progressive rules
├── public/                     # Static assets (emblems, emergency icons)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Authentication views (Login, Verify)
│   │   ├── (dashboard)/        # Administrative Command Views
│   │   │   ├── alerts/         # Early warning broadcast center
│   │   │   ├── inundation/     # GIS inundation & flood simulation map
│   │   │   ├── response/       # NDRF/SDRF resource & dispatch tracking
│   │   │   ├── shelters/       # Relief camp & evacuation management
│   │   │   └── telemetry/      # Weather, river & sensor monitoring
│   │   ├── api/                # Cached / normalized backend endpoints
│   │   │   ├── weather/        # Open-Meteo proxy with rate limiting & cache
│   │   │   ├── geocode/        # Nominatim rate-limited proxy
│   │   │   └── infrastructure/ # Overpass facility lookup
│   │   ├── globals.css         # Emergency theme variables & base CSS
│   │   ├── layout.tsx          # Root layout with emergency navigation
│   │   └── page.tsx            # High-level situation room overview
│   ├── components/
│   │   ├── common/             # Reusable UI primitives
│   │   │   ├── data-source-badge.tsx  # Attribution & freshness badge
│   │   │   ├── severity-badge.tsx     # Dual-channel alert badge (Icon + Text)
│   │   │   ├── state-container.tsx    # Loading / Empty / Success / Error
│   │   │   └── theme-toggle.tsx
│   │   ├── dashboard/          # Command center widgets
│   │   ├── map/                # Leaflet GIS components
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── services/           # Reusable API integrations
│   │   │   ├── geocoding.ts    # Nominatim client with queue & rate limiter
│   │   │   ├── weather.ts      # Open-Meteo client with caching & fallback
│   │   │   └── overpass.ts     # Critical facility queries
│   │   ├── supabase/           # Supabase client & server instances
│   │   │   ├── client.ts       # Browser client
│   │   │   ├── server.ts       # Server component & action client
│   │   │   └── middleware.ts   # Session protection
│   │   └── utils.ts            # Class merging (cn) and formatting
│   └── types/
│       ├── alerts.ts           # Alert severity, warning types
│       ├── database.ts         # Supabase PostgreSQL schema types
│       ├── district.ts         # District administrative hierarchy
│       ├── index.ts            # Core export bundle
│       └── weather.ts          # Open-Meteo normalized contracts
├── .env.example                # Safe environment variable template
├── .gitignore                  # Security-first git exclusion
├── AGENTS.md                   # Permanent AI agent operating guidelines
├── ARCHITECTURE.md             # This architecture blueprint
├── ENGINEERING_RULES.md        # Permanent 21 engineering rules
├── package.json
├── tailwind.config.ts          # Emergency color palette configuration
└── tsconfig.json               # Strict TypeScript configuration
```

---

## 5. Design System & Emergency Color Standards

Emergency control rooms operate in high-stress, low-visibility, or bright projector environments. Color alone must NEVER be used to communicate critical information.

| Severity Level | Color Token | Hex Code | Icon Indicator | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Normal / Safe** | `success` | `#15803D` | `CheckCircle2` | Routine monitoring |
| **Advisory / Watch** | `warning` | `#D97706` | `AlertCircle` | Prepare teams, check drains |
| **Alert / Severe** | `high` | `#EA580C` | `AlertTriangle` | Pre-position SDRF/NDRF, alert SDM |
| **Critical / Emergency** | `critical` | `#DC2626` | `ShieldAlert` | Evacuation orders, shelter activation |

**Primary Command Navy**: `#0F3D66`  
**Tactical Blue**: `#2563EB`  
**Canvas Background**: `#F8FAFC` (Light default) / `#090D16` (Dark mode)  
**Primary Typography**: Inter / Geist Sans (Clean, high-legibility at distance)

---

## 6. Mandatory Quality Gate Specification

Before completing any task, the following three automated checks must succeed:
1. `npm run lint` — ESLint validation with zero unhandled lint errors.
2. `npm run typecheck` (`tsc --noEmit`) — Zero type errors under strict mode.
3. `npm run build` — Production build compilation verifying all server and client components.
