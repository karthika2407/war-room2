# Polar Navigator

You are an elite Lead Full-Stack Engineer and UX/UI Designer specializing in mission-critical maritime and tactical defense applications. Build a fully functional, highly interactive, offline-first React/Tailwind web application prototype for "POLARIS-AI: Edge-Native Antarctic Sea-Ice &amp; Iceberg Trajectory Navigation Support Platform" based on Solution Option S1: The Core Process Speed Demon (Minimalist Tactical Bridge HUD MVP) for the Ministry of Earth Sciences (MoES) and National Centre for Polar and Ocean Research (NCPOR).

---

### 1. DESIGN SYSTEM &amp; POLAR MARITIME UI (DARK TACTICAL CONTRAST)
- **Visual Aesthetic:** High-contrast, dark tactical maritime bridge display designed for sub-zero readability, low-light night-watch operations, and glove-friendly touch interaction.
- **Color Palette:**
  - Background Base: `#111827` (Deep Slate Charcoal)
  - Surface Panel / Cards: `#1F2937` &amp; `#0F172A` with high-contrast borders (`#374151`)
  - Primary Action / Safe Route Vector: `#0D9488` (Vivid Polar Teal) &amp; `#06B6D4` (Ice Blue)
  - Alert / High Hazard Warning: `#D97706` (Amber) &amp; `#EF4444` (Severe Collision Red)
  - Text &amp; Metrics: Clean White (`#F9FAFB`) and High-Visibility Muted Grey (`#9CA3AF`)
- **Typography &amp; Components:** Monospaced indicators for GPS/Latitude/Longitude data, large touch-friendly action tiles, status pills with crisp glowing ring borders, and responsive split-pane navigation controls.

---

### 2. PERSISTENT LOCAL STATE ENGINE (ZERO STATIC MOCKS)
- **Storage Layer:** Implement a persistent local state engine using browser `LocalStorage` (or `IndexedDB` wrapper) with full real-time CRUD capabilities.
- **Data Collections:**
  1. `VesselProfiles`: Ship parameters (Ship Name, Ice Class [e.g., IACS PC6 / IA], Hull Displacement, Current MGO Fuel Reserve, Lat/Long Position).
  2. `RegisteredIceHazards`: User-added or radar-detected iceberg targets (Target ID, Iceberg Mass/Type [Tabular/Bergy Bit], Estimated Draft Depth, Surface Drift Velocity, Latitude, Longitude, POLARIS RIV Impact).
  3. `VoyageWaypoints`: Active route coordinates, predicted ice concentration (0/10ths to 10/10ths), estimated fuel consumption, and risk index scores.
- **Interactivity Requirement:** All additions, edits, parameter toggles, and deletions in the UI must immediately mutate local state, re-render charts and map overlays, update persistent storage, and survive browser refreshes.

---

### 3. THREE CORE INTERACTIVE FLUID JOURNEYS

#### JOURNEY A: BRIDGE MISSION PLANNER &amp; RADAR TELEMETRY INPUT
- **Interactive Multi-Field Navigation Form:**
  - Input fields for Vessel ID, Vessel Ice Class dropdown (`IACS PC1` down to `IACS PC7`), Starting Coordinates (default near Bharati/Maitri Stations, e.g., `-69.4000° S, 76.1833° E`), Target Destination, and Marine Gas Oil (MGO) Fuel Budget.
  - Live **Regex Validation** for negative polar latitudes (`-60.0000` to `-90.0000`) and longitudes (`-180.0000` to `180.0000`) with instant visual error tooltips.
- **Shipboard Acoustic Telemetry &amp; Radar Sweep Simulator:**
  - An interactive "X-Band Marine Radar Sweep" component featuring a circular radar grid with a rotating sweep line and an animated SVG audio/sonar waveform visualizer that dynamically pulses when scanning for sub-surface iceberg keels.
  - Quick action buttons to "Simulate Live Telemetry Scan" or "Register New Ice Hazard Target" directly into the local state table.

#### JOURNEY B: HYDRODYNAMIC DRIFT &amp; POLARIS PIPELINE STEPPER
- **Real-Time Processing Pipeline:**
  - A visual 4-step progress stepper:
    `1. Ingesting Sentinel-1 C-Band SAR &amp; CMEMS Vectors` -&gt;
    `2. Hydrodynamic Drift Model (Wind + Current Shear)` -&gt;
    `3. IMO POLARIS Risk Index Calculation (RIV)` -&gt;
    `4. Generating Fuel-Optimal Safe Route Vector`.
- **Interactive Execution Controls:**
  - Speed Multiplier Toggle (`0.5x`, `1x`, `5x`, `Instant Edge Speed`) to control step simulation latency.
  - Play, Pause, and Reset controls with a live terminal/console log displaying mock SAR granules being processed (`[INFO] Sentinel-1 SAR HH+HV granule loaded. Sea-ice concentration: 7/10ths. RIV Score: -2 (Evasive maneuver required)`).

#### JOURNEY C: COMMAND CENTER &amp; MISSION ANALYTICS DASHBOARD
- **Real-Time Interactive Analytics:**
  - Dynamic graphs (using Recharts or Chart.js):
    1. **Fuel Consumption vs. Sea-Ice Concentration Curve** (showing non-linear fuel penalties above 6/10ths ice cover).
    2. **24-Hour Iceberg Drift Trajectory Variance Chart** (comparing standard linear vector drift vs. POLARIS Hydrodynamic AI prediction).
- **Role-Based View Switcher:**
  - Toggle between **"Bridge Ice Pilot Mode"** (Tactical, route vectors, high-contrast hazard alerts, sub-second route overrides) and **"NCPOR Shore Command Mode (Goa HQ)"** (Fleet-wide overview, charter cost tracking, multi-vessel telemetry logs).
- **Interactive Hazard Log Table:**
  - Filterable, sortable table listing all tracked ice hazards and route waypoints with inline "Edit Coordinates", "Override RIV Index", and "Delete Target" CRUD actions.

---

### 4. CONCRETE EXPORT &amp; IMO COMPLIANCE MODULE
- **Structured JSON Export:**
  - A floating action button: `Export IMO POLARIS Voyage Manifest (.json)`.
  - On click, trigger a download of a clean, beautifully formatted raw JSON payload containing:
    - Ship parameters &amp; Ice Class classification.
    - Timestamped Iceberg Trajectory predictions and Sea-Ice Concentration matrix.
    - IMO POLARIS Risk Index Values (RIV) and recommended fuel-optimal waypoints formatted for ECDIS integration.
- **Interactive JSON Preview Modal:**
  - Include a toggleable slide-over drawer showing a syntax-highlighted preview of the raw JSON payload before exporting.

---

### 5. IMPLEMENTATION TECH STACK (S1 OPTIMIZED)
- Framework: React (Vite / Next.js)
- Styling: Tailwind CSS
- Mapping &amp; Map Overlays: Leaflet / React-Leaflet
- Icons: Lucide React (`Radar`, `Navigation`, `Anchor`, `AlertTriangle`, `FileJson`, `Activity`, `Cpu`, `Layers`)
- Charts: Recharts / Chart.js
- Local State: React `useState` + `useEffect` synchronized with `window.localStorage`

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://war-room2.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0046840b-6337-4f50-8efd-3407e29ff8b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
