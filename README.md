# VarshaNetra (वर्षेनेत्र)
### AI-Assisted Heavy Rainfall Early Warning, Inundation Intelligence & District Disaster Response System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet-199900.svg)](https://leafletjs.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres-3ecf8e.svg)](https://supabase.com/)

> **District Disaster Operations Command System**  
> Designed for District Magistrates (DM/DC), District Disaster Management Authorities (DDMA), Emergency Operations Centers (EOC), Tehsildars, Municipal Control Rooms, SDRF/NDRF Battalions, Fire & Police, and Irrigation/Health Departments.

---

## 1. System Overview

**VarshaNetra** provides hyper-local, real-time meteorological intelligence, predictive urban flood inundation modelling, and synchronized multi-agency incident response coordination for Indian districts.

### Key Capabilities
- **District Telemetry & Early Warning**: Live rainfall and weather observation via Open-Meteo with antecedent precipitation accumulation curves.
- **Hydrological Inundation Modelling**: Experimental inundation risk engine combining digital elevation slope, river proximity, and localized runoff rates.
- **Interactive GIS Command Canvas**: Dynamic Leaflet geospatial mapping with real-time critical infrastructure overlays (hospitals, fire stations, police stations, river networks) from OpenStreetMap.
- **Multi-Agency Incident Command**: Full lifecycle management for urban flood incidents, SDRF/NDRF response team dispatch, equipment deployment tracking, and emergency shelter coordination.
- **Citizen & Field Verification**: Geotagged field reporting with secure photo evidence uploads, verification workflows, and automated district notification broadcast.
- **Auditing & Historical Replay**: Chronological district audit log and historical replay player for post-disaster analysis.

---

## 2. Technology Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS & Lucide React icons
- **GIS / Mapping**: Leaflet & React-Leaflet with OpenStreetMap tiles
- **Charts / Telemetry**: Recharts
- **Database & Auth**: Supabase PostgreSQL, Supabase Auth, and Supabase Storage (with persistent zero-config local JSON fallback for offline sandbox testing)
- **Weather Telemetry**: Open-Meteo API
- **Geocoding & Facilities**: OpenStreetMap Nominatim & Overpass API

---

## 3. Environment Variables Reference

Copy `.env.example` to `.env.local` for local execution or enter these in your hosting provider:

| Variable Name | Required | Target Scope | Description & Example |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_APP_URL` | Optional | Client & Server | Primary canonical domain (e.g. `https://varshanetra.vercel.app` or `http://localhost:3000`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional* | Client & Server | Supabase project API gateway (e.g. `https://xyzproject.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional* | Client & Server | Public Supabase anon client key. Safe for browser code. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional* | Server-Only | Private service role secret key. **NEVER expose to client code.** |
| `NEXT_PUBLIC_OPEN_METEO_BASE_URL`| Optional | Client & Server | Base URL for Open-Meteo (defaults to `https://api.open-meteo.com/v1`). |
| `NEXT_PUBLIC_NOMINATIM_APP_NAME`| Optional | Server-Only | Identifies application in OSM User-Agent (defaults to `VarshaNetra-DisasterWarningSystem`). |
| `NEXT_PUBLIC_NOMINATIM_CONTACT_EMAIL`| Optional| Server-Only | Administrative contact email for Nominatim rate limiting compliance. |
| `NEXT_PUBLIC_OVERPASS_API_URL` | Optional | Server-Only | OpenStreetMap Overpass API interpreter endpoint. |
| `NEXT_PUBLIC_DEMO_MODE` | Optional | Client & Server | When `true`, enables sandbox demonstration fixtures with visible provenance badges. |

*\*Note: When Supabase credentials are not provided, VarshaNetra automatically runs in isolated offline/sandbox mode with persistent file storage in `.data/`.*

---

## 4. Supabase Setup & Migration Order

To deploy VarshaNetra with live Supabase PostgreSQL storage and authentication, execute the migrations in `supabase/migrations/` sequentially in your Supabase SQL Editor:

1. **`20260911000001_create_profiles.sql`**: Officer profiles table, government ID mapping, role hierarchy, and updated-at triggers.
2. **`20260911000002_create_alerts.sql`**: Early warning alerts schema, severity levels, and audit transition table.
3. **`20260911000003_create_incidents.sql`**: Inundation and disaster incidents tracking table with geographic coordinate constraints.
4. **`20260911000004_create_response_teams.sql`**: SDRF/NDRF/Civil Defense response teams and incident dispatch assignments.
5. **`20260912000005_create_resources_and_shelters.sql`**: Relief resources inventory, equipment deployment log, and emergency shelters.
6. **`20260912000006_create_field_reports.sql`**: Ground observation field reports table, verification statuses, and `field-reports` storage bucket.
7. **`20260912000007_create_notifications.sql`**: Emergency notification dispatch center.
8. **`20260912000008_create_audit_logs.sql`**: Chronological system activity and state transition audit logs.
9. **`20260912000009_security_hardening.sql`**: Strict Row Level Security (RLS) enforcement and profile immutability rules.

### Supabase Storage Bucket Setup
Migration `20260912000006_create_field_reports.sql` automatically configures the storage bucket:
- **Bucket ID**: `field-reports`
- **Public**: `true` (public read for approved incident evidence thumbnails)
- **Access Policy**:
  - `Public read field-reports bucket`: `SELECT` allowed on `storage.objects` where `bucket_id = 'field-reports'`.
  - `Authenticated upload to field-reports bucket`: `INSERT` allowed for authenticated users.

---

## 5. External APIs, Compliance & Attribution

VarshaNetra integrates third-party public services with strict adherence to acceptable use policies:

1. **Open-Meteo Weather API**:
   - *Attribution*: Weather telemetry provided under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://open-meteo.com/).
   - *Policy & Limitations*: Non-commercial use up to 10,000 daily API calls without an API key. Reusable caching with a 10-minute TTL is implemented to minimize traffic.
2. **OpenStreetMap Nominatim Geocoding**:
   - *Attribution*: Geocoding data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) under ODbL 1.0.
   - *Policy & Limitations*: Strictly throttled to a minimum of 1.1 seconds between requests; identifies itself using a custom `User-Agent` and administrator contact header.
3. **OpenStreetMap Overpass API**:
   - *Attribution*: Critical facility infrastructure © OpenStreetMap contributors under ODbL 1.0.
   - *Policy & Limitations*: Capped to a 25 km operational district search radius with server-side 30-minute in-memory caching and fallback to simulated local grids if instances time out.

---

## 6. Manual Deployment Guide

### Manual GitHub Repository Setup
1. Initialize git (if not already tracked):
   ```bash
   git init
   git add .
   git commit -m "feat: complete VarshaNetra district disaster response system"
   ```
2. Create a new repository on GitHub (e.g. `varshanetra-command-center`).
3. Add remote and push:
   ```bash
   git remote add origin https://github.com/<your-organization>/varshanetra-command-center.git
   git branch -M main
   git push -u origin main
   ```

### Manual Vercel Deployment Setup
1. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Select **Import Git Repository** and choose your `varshanetra-command-center` repository.
3. In **Framework Preset**, select **Next.js**.
4. In **Build and Output Settings**, leave default settings:
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`
5. Expand **Environment Variables** and enter the following keys:
   - `NEXT_PUBLIC_APP_URL`: Your Vercel production domain (e.g. `https://varshanetra.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://<your-project>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `<your-supabase-anon-key>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-secret>`
   - `NEXT_PUBLIC_NOMINATIM_APP_NAME`: `VarshaNetra-CommandCenter`
   - `NEXT_PUBLIC_NOMINATIM_CONTACT_EMAIL`: `<your-admin-email@domain.com>`
   - `NEXT_PUBLIC_DEMO_MODE`: `false` (or `true` for demonstration sandbox)
6. Click **Deploy**.

---

## 7. Post-Deployment Operational Verification Checklist

After deployment completes, verify the live deployment using this checklist:

- [ ] **Landing Page**: Navigate to the root URL and confirm status 200 with platform branding and theme switching.
- [ ] **Authentication**: Register an officer account with a Government ID, log out, and log in again.
- [ ] **Protected Routes**: Verify that visiting `/dashboard` without an active session redirects to `/login?next=%2Fdashboard`.
- [ ] **Weather Telemetry**: Confirm live temperature and precipitation charts load on `/weather` and `/dashboard`.
- [ ] **GIS Infrastructure**: Open `/map` and toggle hospital, fire, and police facility markers.
- [ ] **Alert Lifecycle**: Create a new disaster alert in `DRAFT` status and verify state progression to `ISSUED`.
- [ ] **Incident Command**: Log a waterlogging incident, create an SDRF team, and assign the team to the incident.
- [ ] **Field Report Evidence**: Submit a test field report with an image upload and verify the thumbnail renders.
- [ ] **Data Source Health**: Check `/data-sources` to ensure external APIs report healthy connectivity.

---

## 8. License

Open source district disaster response intelligence system under the [MIT License](LICENSE).
