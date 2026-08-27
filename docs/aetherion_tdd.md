AETHERION
Global Real-Time Geopolitical Simulator
TECHNICAL DESIGN DOCUMENT · Version 1.0
Document Type Technical Design Document (TDD)
Companion To Aetherion GDD v3.0
Engine Stack Tauri 2 + Next.js 14 + Three.js r160 + TypeScript 5
Target Platforms Windows 10/11, macOS 13+, Linux (Ubuntu 22+)
Map Resolution District-level provinces — ~50,000–80,000 nodes globally
Render Target 60fps sustained at max zoom; 144fps on high-end hardware
Save System SQLite via Tauri SQL plugin — full world state snapshots

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
TABLE OF CONTENTS
01 Technology Stack & Project Architecture
02 Province Hierarchy — District to Nation
03 Administrative System & Province Management
04 Chronicle — Historical Record System
05 Map Rendering Engine — Three.js Globe
06 Map View Layers & Overlay System
07 Visual Design Language & Color Palette
08 UI Architecture & Panel System
09 Notification System — Technical Implementation
10 Simulation Engine — Tick Worker Architecture
11 World State Data Schemas
12 Economic Engine — Technical Implementation
13 Military Combat Engine
14 Diplomatic Engine — State Machine
15 Peace Process — Pipeline State Machine
16 AI Engine — Rational Actor Utility System
17 Intelligence System — Technical Implementation
18 Save / Load & Session Management
19 Performance Targets & Optimisation Strategy
20 Development Environment & Toolchain
21 Phase 1 MVP — Technical Implementation Plan
Page 2

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 01
Technology Stack & Project Architecture
Aetherion is built on open-source web technologies compiled into a native desktop app via Tauri. The player
runs a standalone executable — no runtime installation needed. The simulation engine runs in isolated
background threads, keeping the map smooth while thousands of calculations run behind the scenes.
1.1 Full Stack
Layer Technology Version Role
Desktop Shell Tauri v2.x Compiles web app to .exe/.app; OS notifications; file I/O; window
management
Frontend Next.js 14 Page routing, React component tree
UI Library React 18 All panels, menus, dialogs, feeds
3D Renderer Three.js r160 World globe, province mesh, overlays, unit icons
Language TypeScript 5.x Typed JS across all game and engine code
State Zustand 4.x Global UI state store; wraps SharedArrayBuffer world state
Management
Worker Threads Web Workers Native Isolated simulation threads; SharedArrayBuffer shared state
API
Database SQLite (tauri- 3.x World state persistence; save/load; event archive
plugin-sql)
Styling Tailwind CSS 3.x Utility-first CSS for all UI panels
Build Tool Vite 5.x Dev server with hot reload; production bundler
Package pnpm 8.x Faster than npm; workspace support
Manager
1.2 Architecture Diagram
TAURI NATIVE SHELL
MAIN THREAD (60fps)
Next.js/React UI <--> Three.js Renderer
Panel System <--> Province Mesh + Overlays
Notification UI <--> Map Labels + Unit Icons
|
| SharedArrayBuffer (lock-free world state)
|
WORKER THREADS (background)
tick.worker -> Hourly/Daily/Monthly/Yearly ticks
ai_batch.worker -> Tier 1+2 AI nations (active every hourly tick)
ai_idle.worker -> Tier 3+4 AI nations (every 10 ticks)
market.worker -> Global trade price equilibrium (daily)
events.worker -> Event classification & UI notification routing
|
SQLite (tauri-plugin-sql)
World snapshots · Chronicle · Event log · Player preferences
Page 3

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
1.3 Folder Structure
aetherion/
src-tauri/ <- Tauri shell (minimal; don't edit often)
tauri.conf.json <- App name, window size, permissions
src/
app/ <- Next.js pages
components/
map/ <- Three.js globe, mesh, overlay shaders
panels/ <- Military, Diplomatic, Economic, Intel
notifications/ <- Toast, event feed, critical interrupt modal
diplomacy/ <- Dialogue trees, peace pipeline UI
admin/ <- Province editor, merge/split/rename tools
chronicle/ <- Timeline UI, map replay
engine/
workers/ <- tick, ai_batch, ai_idle, market, events
systems/ <- economy, military, diplomacy, pops,
intelligence, peace, notifications,
administration, chronicle
data/
geo/ <- GeoJSON province boundaries (~80k nodes)
nations.json <- 200+ nation base stats + AI DNA seeds
hardware.json <- Full hardware registry specs
history.json <- Epochal memory seeds (pre-loaded traumas)
admin_templates.json <- Province structure templates
store/
worldState.ts <- Master SharedArrayBuffer world state
uiState.ts <- Zustand UI state (open panels, selections)
eventQueue.ts <- Global event ring buffer
Page 4

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 02
Province Hierarchy — District to Nation
Aetherion models the world at the finest granularity of any grand strategy game — down to individual
districts (county / tehsil / municipality level). The map is built on a four-tier geographic hierarchy. Every
calculation references the appropriate tier — combat at district level, economics at province level, diplomacy
at nation level — keeping resolution meaningful without wasting compute.
Tie Name Real-World Equivalent Global Primary Use
r Count
T1 District County, tehsil, ~50,000–80, Combat, POP granularity, infrastructure
arrondissement, municipality 000 placement, terrain detail
T2 Province State, oblast, governorate ~5,000–8,00 Economic aggregation, RGO zones,
0 unrest tracking, admin layer
T3 Region Federal district, macro-region ~500–800 Military theaters, trade corridors,
flashpoint sectors
T4 Nation Sovereign state 200+ Diplomacy, GDP, alliances, AI utility
scoring
2.1 District Node Schema
interface District {
// Identity
id: string; name: string; province_id: string;
nation_id: string; occupier_id: string | null;
// Geography
centroid: [lat, lng]; boundary: GeoJSON;
terrain: 'PLAINS'|'HILL'|'MOUNTAIN'|'URBAN'|'COAST'|'DESERT'|'JUNGLE'|'SWAMP';
elevation: number; river_crossing: boolean; coastal: boolean;
// Military
combat_width: number; fortification: number; // 0-5
entrenchment: number; // 0-100
airfield_tier: number; // 0-4
units: UnitStack[]; supply_access: number; // 0-100
// Economic
dev_slots: number; dev_slots_used: number;
rgo: RGO[]; factories: Factory[];
infrastructure: number; // rail/road tier 0-5
port_tier: number; // 0-5
// Population
pops: POP[]; total_pop: number; avg_militancy: number;
// Administrative
admin_level: 'DIRECT'|'DEVOLVED'|'AUTONOMOUS'|'OCCUPIED';
admin_efficiency: number; // 0-100
capital: boolean;
special_zone: 'SEZ'|'INDUSTRIAL'|'HIGHTECH'|'MILITARY_BASE' | null;
}
Page 5

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
2.2 Province — Aggregate Model
Provinces are logical groupings of districts. Province-level statistics are always derived aggregates —
never stored independently. They are recomputed from constituent districts each Monthly Tick and cached.
interface Province {
id: string; name: string; nation_id: string;
district_ids: string[]; capital_district: string;
// Cached aggregates (Monthly Tick)
gdp: number; population: number; avg_militancy: number;
dominant_culture: string; industrial_tier: number;
unrest_level: 'CALM'|'PROTESTS'|'STRIKES'|'INSURGENCY'|'CIVIL_WAR';
// Province-level player controls
tax_rate: number; // 0-100%
autonomy: 'DIRECT'|'DEVOLVED'|'AUTONOMOUS'|'PUPPET'|'INDEPENDENT';
separatist_flag: boolean;
}
Page 6

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 03
Administrative System & Province Management
Province boundaries in Aetherion are not fixed — they are living political structures that nations can
reshape, merge, split, rename, and reorganize. Over decades of gameplay, a player can completely redraw
their  nation's  internal  geography.  Every  change  is  recorded  permanently  in  the  Chronicle,  making
administrative decisions part of the world's living history.
3.1 Administrative Actions
| Action | Mechanic | Cost | Effect | Chronicle Entry |
| ------ | -------- | ---- | ------ | --------------- |
Merge Districts Select 2+ adjacent Admin Creates new province node; Province founding:
owned districts; Points + unified stats; shared tax rate name, date, founding
|     | name new province; | Capital |     | regime, circumstances |
| --- | ------------------ | ------- | --- | --------------------- |
assign capital
Split Province Divide province Admin Two smaller provinces with Split recorded; original
|     | along district lines; | Points | independent controls | name becomes        |
| --- | --------------------- | ------ | -------------------- | ------------------- |
|     | assign sub-capitals   |        |                      | historical footnote |
Rename Assign custom Minimal Changes display name on all Old name preserved in
Province/District name to any owned UI and map Chronicle as 'formerly
|     | node |     |     | known as' |
| --- | ---- | --- | --- | --------- |
Redesignate Move capital to Admin Capital district gets urban Capital transfer event
Capital different district in Points bonus; old capital loses logged
|     | province |     | prestige |     |
| --- | -------- | --- | -------- | --- |
Create Special Designate district as Large Unlocks specific factory slots; Zone designation
Zone SEZ, Industrial Capital + attracts specific POP classes becomes permanent
|     | Park, Military Base, | Time |     | historical identity of |
| --- | -------------------- | ---- | --- | ---------------------- |
|     | etc.                 |      |     | district               |
Found a City Trigger urbanisation Large Urban terrain tag; city node Major Chronicle event
in qualified district Capital on map; Capitalist/Bureaucrat — named, dated,
|     | (pop + econ     |     | POPs spawn | attributed to current |
| --- | --------------- | --- | ---------- | --------------------- |
|     | thresholds met) |     |            | regime                |
Annex Occupied Formally incorporate Diplomatic Districts enter your province Annexation date
Territory captured war cost + structure; POPs become recorded; source nation
|     | districts | alignment | suppressed minority | retains Epochal  |
| --- | --------- | --------- | ------------------- | ---------------- |
|     |           | hit       |                     | Memory grievance |
Grant Autonomy Slide province Revenue/c Lowers militancy; may satisfy Autonomy grant
|     | toward            | onscription | ethnic demands | recorded; referenced if |
| --- | ----------------- | ----------- | -------------- | ----------------------- |
|     | autonomous/puppet | loss        |                | later revoked           |
status
3.2 Administrative Efficiency Score (AES)
Page 7

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
AES = BASE_EFFICIENCY
* (1 - distance_from_capital * 0.03) // -3% per province-hop
* (1 - ethnic_resistance) // suppressed minority: -5% to -25%
* (1 - corruption_factor) // oligarch capture
* (1 - unrest_penalty) // militancy>60: -10%; >80: -30%
* infrastructure_bonus // rail tier 4+: +15%
AES < 30 -> Tax barely collected; ripe for secession
AES 30-60 -> Functional but inefficient
AES 60-85 -> Normal governance
AES > 85 -> Efficient; bonus to R&D; + factory output
Page 8

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 04
Chronicle — Historical Record System
The Chronicle is the permanent historical record of everything that has happened in a game session. It
persists in SQLite and is never cleared. Every war, administrative action, city founding, regime change, and
treaty is written here. The Chronicle is what makes Aetherion feel like it is generating real history — not
running a simulation.
4.1 Chronicle Entry Schema
interface ChronicleEntry {
id: string; // UUID
game_date: GameDate;
type: 'ADMIN_ACTION'|'WAR_START'|'WAR_END'|'REGIME_CHANGE'
|'CITY_FOUNDED'|'TREATY_SIGNED'|'PROVINCE_CREATED'
|'PROVINCE_RENAMED'|'ANNEXATION'|'REVOLUTION'|'COUP'
|'NUCLEAR_TEST'|'GREAT_POWER_SHIFT'|'DISCOVERY';
headline: string; // Short summary
full_text: string; // Full description
nations: NationId[];
districts: DistrictId[];
snapshot_ref: string | null; // SQLite snapshot ID for map replay
player_note: string; // Player can annotate any entry
}
4.2 How Chronicle Feeds the AI
The Chronicle is the source for AI Epochal Memory. When evaluating trust in another nation, the AI queries
the Chronicle for historical events involving that nation's ideological framework — not just its current name:
function buildEpochalMemory(nation: Nation, chronicle: ChronicleEntry[]): EpochalEntry[] {
return chronicle
.filter(e => isEpochalEvent(e)) // wars, colonizations, atrocities
.filter(e => involvesNation(e, nation))
.map(e => ({
event_type: e.type,
ideology_tag: getIdeologyAtDate(e.nations[0], e.game_date), // KEY
severity: calcEpochalSeverity(e),
threat_multiplier: severityToMultiplier(calcEpochalSeverity(e)),
}));
// ideology_tag means a democratic Germany that turns fascist
// immediately inherits the Fascist Germany threat signature
}
4.3 Player-Facing Chronicle UI
n Accessible via the C key or sidebar button — opens a full-height scrollable timeline panel.
n Filter by: event type, nations involved, date range, player-created events only.
n Click any entry to jump to the state of the map on that date (map replay snapshot).
n Player can annotate any Chronicle entry with a personal note — appears permanently.
n Wars show a summary card: start/end date, peak escalation, coalition sizes, provinces changed hands.
Page 9

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
n Administrative actions show a lineage: districts merged fi province named fi city founded fi city
renamed.
CIVILISATION-STYLE LEGACY
The Chronicle is what separates Aetherion from a pure strategy sim. A province you founded, a city you
named, a war you fought — these become permanent world history. Future AI nations reference your
Chronicle when calculating trust, grievances, and threat assessments. Your past decisions echo
mechanically across centuries of in-game time.
Page 10

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 05
Map Rendering Engine — Three.js Globe
The map is the primary interface. The renderer must display up to 80,000 province nodes at a stable 60fps
while supporting zoom from global scale down to district level, 14 simultaneous data overlays, animated unit
icons, trade route flows, and frontline visualisations — all in real time.
5.1 Scene Graph
THREE.Scene
Globe (THREE.Sphere)
OceanMesh <- base sphere, deep navy
ProvinceLayer <- InstancedMesh; one instance per district
BorderLayer
NationalBorders <- thick bright lines (nation boundaries)
ProvinceBorders <- thin dim lines (internal at zoom 3+)
DistrictBorders <- very thin, appear at zoom 4+
OverlayLayer <- semi-transparent data heat maps
UnitLayer <- instanced unit icons
TradeRouteLayer <- animated dashed lines; opacity by volume
FrontlineLayer <- animated battle front renderers
LabelLayer <- CSS3DRenderer for province/city name labels
OrbitalLayer <- Satellite icons in LEO/MEO/GEO rings
AtmosphereGlow <- Fresnel shader for globe edge glow
Stars <- background star field (static)
5.2 InstancedMesh Performance Strategy
Rendering 80,000 province polygons naively would destroy performance. The solution is Three.js
InstancedMesh — all province shapes rendered in a single GPU draw call by batching them. Each province
is one instance with its colour attribute updated via a typed array:
// Single draw call for ALL ~80,000 districts
const provinceMesh = new THREE.InstancedMesh(
provinceGeometry, // shared geometry
provinceMaterial, // shader reading per-instance color
TOTAL_DISTRICT_COUNT
);
// Switch overlay without re-uploading geometry:
function applyOverlay(type: OverlayType, state: WorldState) {
for (let i = 0; i < districts.length; i++) {
const c = OVERLAY_FNS[type](districts[i], state);
colorArray[i*3] = c.r; colorArray[i*3+1] = c.g; colorArray[i*3+2] = c.b;
}
provinceMesh.instanceColor.needsUpdate = true; // one GPU upload
}
5.3 Level of Detail (LOD) & Zoom
Zoom Level What Renders Labels Shown
Globe (full world) Nation-color fill; national borders; major cities as dots Nation names only
Page 11

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Continental (1-2 Province-level fill; provincial borders appear Nation + major province
continents) names
Regional (5-10 Full province detail; district borders appear All province + major district
nations) names
National (single Full district detail; infrastructure icons; unit icons All names; hover shows
nation) pop-up stats
Provincial (single Max detail; individual building icons; terrain texture Full labels; click opens district
province fills screen) panel
5.4 Province Interaction
HOVER -> highlight boundary; mini tooltip { name, nation, terrain, pop, militancy }
CLICK -> select district; open District Detail Panel (right sidebar)
RIGHT-CLICK -> Context Action Menu:
[Build Infrastructure] [Adjust Tax] [Deploy Units]
[Administrative Action] [View Chronicle Entry]
SHIFT+CLICK -> Multi-select districts (for admin merge operations)
DOUBLE-CLICK -> Smooth camera zoom to selected district
SCROLL WHEEL -> Zoom with LOD transitions
MIDDLE DRAG -> Pan globe
LEFT DRAG -> Rotate globe (at global zoom)
Page 12

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 06
Map View Layers & Overlay System
14 map overlays switchable via a persistent toolbar. Each overlay recolors the province InstancedMesh
using a dedicated pure function. All data is pre-computed and cached by worker threads — switching is
instantaneous.
| # Overlay | Color Logic | Key Data | Interaction |
| --------- | ----------- | -------- | ----------- |
1 Sovereignty Nation unique color; nation_id per district Click -> Nation
|     | occupied = striped |     | panel |
| --- | ------------------ | --- | ----- |
2 Diplomatic Green (+100) to Red (-100) DNA alignment matrix Click -> Bilateral
| Alignment | vs player |     | diplomacy |
| --------- | --------- | --- | --------- |
3 Coalition Map Coalition color per nation; War coalition Click -> War panel
|     | neutral = grey | membership |     |
| --- | -------------- | ---------- | --- |
4 GDP Heat Black (0) -> Yellow -> Province GDP aggregate Click -> Economic
|     | White (max) |     | breakdown |
| --- | ----------- | --- | --------- |
5 Population Light blue (sparse) -> Deep District pop count Click -> POP
| Density | red (dense) |     | breakdown |
| ------- | ----------- | --- | --------- |
6 Industrial Grey (none) -> Orange Highest factory tier in Click -> Factory list
| Capacity | (heavy) -> Cyan (hi-tech) | district |     |
| -------- | ------------------------- | -------- | --- |
7 Military Blue (friendly) -> Red Unit count + hardware Click -> Military
| Strength | (hostile); intensity = | gen | panel |
| -------- | ---------------------- | --- | ----- |
strength
8 Resource Map Color per dominant RGO District RGO array Click -> Resource
|     | type |     | trade panel |
| --- | ---- | --- | ----------- |
9 Tension / Yellow (low) -> Pulsing Red Border friction + Click -> Tension
| Flashpoint | (crisis) | flashpoint index | briefing |
| ---------- | -------- | ---------------- | -------- |
1 Trade Routes Animated flow lines; Market worker trade Click -> Trade
| 0   | thickness = volume | paths | contract |
| --- | ------------------ | ----- | -------- |
1 Intelligence Blue = covered; Black = SWI coverage map Click -> Intel panel
| 1 Coverage | blind |     |     |
| ---------- | ----- | --- | --- |
1 Ideology Political spectrum colors POP ideology Click -> Domestic
| 2   | per dominant ideology | breakdown | politics |
| --- | --------------------- | --------- | -------- |
1 Climate & Terrain texture + disaster District terrain + climate Click -> Terrain
| 3 Terrain | risk |     | detail |
| --------- | ---- | --- | ------ |
1 Satellite Orbital arcs on surface; Satellite footprints Click -> Space
| 4 Coverage | gaps in red |     | program |
| ---------- | ----------- | --- | ------- |
6.1 Overlay Shader Pattern
Page 13

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
type OverlayFn = (district: District, ctx: WorldState) => THREE.Color;
const OVERLAY_FNS: Record = {
sovereignty: (d) => nationColors[d.nation_id],
gdp_heat: (d) => heatColor(d.gdp / MAX_GDP),
population: (d) => densityColor(d.total_pop / d.area_km2),
tension: (d) => tensionColor(d.border_friction + d.flashpoint_index),
// ... one pure function per overlay
};
// Minimap: player can pin a second overlay in bottom-left corner
// Both overlays share the same district data; second uses its own color buffer
Page 14

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 07
Visual Design Language & Color Palette
Aetherion's visual identity is dark, serious, and data-dense. The aesthetic references real-world military
operations centres and intelligence dashboards — not fantasy or cartoon aesthetics. Everything
communicates information clearly at any screen size. The UI will evolve through playtesting once the MVP is
functional; this spec covers the founding visual layer.
7.1 Core Color Palette
Deep Navy #0D1B2A Steel Blue #1B3A5C
Primary background — ocean, panel backgrounds, header bSaercsondary bg — section headers, table headers, active states
Teal Accent #0F5F5F Gold #B8860B
Tertiary accent — sub-sections, borders, progress indicatorsPrimary accent — highlights, hover states, critical info labels
Gold Light #C8A040 Crimson #9B2335
Gold text on dark backgrounds — cover titles, header text War state, critical alerts, hostile indicators, CRITICAL severity
Slate Grey #6B7A8D Off White #F0F4F8
Secondary text, metadata, timestamps, inactive elements Table alternating rows, panel fill backgrounds
Pure White #FFFFFF Ink #1A1A2E
Text on dark backgrounds — panel headers, section labelsPrimary text on light backgrounds — all body copy
Code Blue #7DD3FC Code Dark #1E293B
Monospace code text — all code blocks and data formulas Code block backgrounds
7.2 Nation Province Colors
n Each nation is assigned a unique province fill color — algorithmically generated to be maximally distinct
from geographic neighbors (graph-coloring pass at startup).
n No two bordering nations share a color within perceptual distance DE < 15 (CIELAB). All colors remain
distinguishable against deep navy ocean.
n Occupied provinces: diagonal stripes — occupier color over owner color at 40% opacity.
n Disputed provinces: pulse between claimant colors at 0.5 Hz.
n Player's nation: always a high-saturation distinctive color chosen at game start.
7.3 Typography & Icons
Primary Font Inter (Google Fonts) — clean, highly legible at small sizes; excellent for
data-dense UIs
Monospace Font JetBrains Mono — all numbers, coordinates, percentages, data readouts, code
blocks
Header Weight Inter Bold (700) for chapter/section headers; Inter SemiBold (600) for panel
titles
Body Weight Inter Regular (400) for body text; Inter Medium (500) for emphasis
Page 15

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Min Readable 9px at 1080p; scales with system DPI via Tauri window config
Unit Icons Simplified silhouette SVGs (tank, plane, ship, infantry) in nation color on dark
circular badge
Building Icons Minimal line SVGs: factory (gear), port (anchor), airfield (plane), fortification
(shield)
Notif Icons Filled monochrome SVGs: sword (military), handshake (diplomatic), coin
(economic), flame (crisis)
7.4 UI Component Style
Component Visual Style State Variants
Panels Navy bg (#0D1B2A); 1px steel border; 8px Default, Hover (border brightens), Active
radius; inner shadow (teal border), Warning (gold border), Critical
(crimson border)
Buttons Steel blue fill; white text; 4px radius; 1px Default, Hover (+10% brightness), Active
border (inset shadow), Disabled (40% opacity),
Critical (crimson fill)
Progress Bars Dark track; colored fill; gradient Animated fill for construction; pulsing for
greenfiyellowfired for health/stability critical thresholds
Data Tables Navy header; alternating off-white/white rows; Sortable columns; hover highlight; selected
0.35px grid lines row teal left-border
Toasts Navy bg; left border colored by severity; slides INFO (gold), WARNING (orange), HIGH
from top-right (red), CRITICAL (crimson + auto-pause)
Map Selection Pulsing white border on selected district; gold Hover: thin white; Selected: thick pulsing
for owned; red for hostile white; Multi: dashed white
Page 16

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 08
UI Architecture & Panel System
The UI is a persistent React overlay on the Three.js canvas. The map always occupies the full screen —
panels are floating, collapsible overlays. Press H to hide all panels for a clean map view.
8.1 Screen Layout
+------------------------------------------------------------------+
| [TOP BAR] Date | Speed | Treasury | Credit Rating | Alert Bell |
+--------+--------------------------------------------+------------+
| | | |
| LEFT | THREE.JS GLOBE (full screen) | RIGHT |
| PANEL | all UI overlays sit on top | PANEL |
| | | (context- |
| Nation | | sensitive) |
| Summ- | | |
| ary | | Province / |
| | | Military / |
| | | Diplo / |
| | | Economic |
+--------+------------------+-------------------------+------------+
| [OVERLAY SELECTOR] | [BOTTOM] Minimap | Event Feed Ticker|
+---------------------------+-------------------------------------- +
8.2 Panel Registry
Panel Trigger Content Summary
Nation Summary Always visible Treasury, military status, credit rating, active wars
(left sidebar)
District Detail Click any district Terrain, POPs, factories, units, admin actions, Chronicle
Military Panel M key Army corps, hardware inventory, frontlines, procurement queue
Diplomatic Panel D key All bilateral relations, active treaties, dialogue queue
Economic Panel E key Treasury, factories, trade routes, market prices, debt schedule
Intelligence Panel I key SWI, covert ops, SIGINT/GEOINT/HUMINT coverage maps
Peace Process Panel Auto-opens on Six-stage pipeline, active negotiation tracks, guarantors
ceasefire
Technology Panel T key Research tree, R&D; budget, reverse engineering programs
Admin Panel A key Province editor, merge/split/rename tools, autonomy sliders
Chronicle C key Full searchable timeline; map replay buttons; player notes
Space Program Shift+S Satellite constellation, launch queue, ASAT capabilities
Notification Log N key Full searchable event archive; filter by type/severity/nation
Critical Interrupt Modal Auto (CRITICAL Full-screen modal; simulation paused; player must choose response
events)
Page 17

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
8.3 Critical Interrupt Modal
+-------------------------------------------+
| [SEVERITY ICON] [EVENT HEADLINE] |
| ----------------------------------------- |
| [FULL EVENT DESCRIPTION — 3-5 sentences] |
| [CONTEXT: what led to this event] |
| |
| YOUR AVAILABLE RESPONSES: |
| [Action A] [Action B] [Action C] [24h] |
+-------------------------------------------+
- Simulation auto-pauses before modal appears
- Player must click a response to dismiss
- '24h defer' re-queues event with countdown
- Some events (nuclear launch) cannot be deferred
Page 18

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 09
Notification System — Technical Implementation
9.1 Event Pipeline
events.worker.ts MAIN THREAD
1. Receives raw events from 4. events.worker posts to main via
other workers via event postMessage()
queue ring buffer
5. useNotificationStore (Zustand)
2. Classifies event: adds to notification queue
category, severity,
scope, nations 6. NotificationRouter decides:
CRITICAL -> pause + modal
3. Filters by player HIGH/MEDIUM -> toast (8s)
preferences (settings) LOW/INFO -> event feed only
Tauri OS notification (optional):
@tauri-apps/plugin-notification
-> System tray popup even when window minimised
-> Used for CRITICAL events only by default
9.2 GameEvent Interface
interface GameEvent {
id: string;
timestamp: { game: GameDate; real: number };
category: 'MILITARY'|'DIPLOMATIC'|'ECONOMIC'|'DOMESTIC'|'INTELLIGENCE'|'GLOBAL'|'SCIENCE';
severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO';
scope: 'PLAYER_DIRECT'|'ADJACENT'|'REGIONAL'|'GLOBAL';
nations: string[];
headline: string; // <= 80 chars
detail: string; // full description
action_link: { panel: PanelId; entity_id?: string; map_focus?: string } | null;
auto_pause: boolean;
}
Page 19

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 10
Simulation Engine — Tick Worker Architecture
The simulation engine runs entirely in Web Workers, isolated from the rendering thread. It processes up to
80,000 districts, 200+ nations, and thousands of active contracts, units, and diplomatic states every second
— without blocking the map renderer.
10.1 Worker Responsibilities
Worker Tick Frequency Processes
tick.worker Runs all 4 tiers on Hourly: combat, supply, missiles. Daily: trade, SIGINT, RGO.
schedule Monthly: POPs, construction, R&D.; Yearly: GDP, elections, credit.
ai_batch.worker Every Hourly Tick Tier 1+2 AI nations — full utility scoring; decisions queued for
tick.worker
ai_idle.worker Every 10 Hourly Tier 3+4 AI nations — simplified scan; low-priority decisions
Ticks
market.worker Every Daily Tick Global supply/demand for all ~200 commodities; price equilibrium
events.worker Every Hourly Tick Event queue classification, filtering, routing to main thread
10.2 Tick Processing Loop
// tick.worker.ts
while (true) {
await sleepUntilNextTick();
const speed = Atomics.load(controlBuffer, SPEED_SLOT);
if (speed === 0) continue; // paused
hourlyTick();
if (isNewDay()) dailyTick();
if (isNewMonth()) monthlyTick();
if (isNewYear()) yearlyTick();
processAIActionQueue();
advanceGameClock();
}
function hourlyTick() {
updateCombatFrontlines(); resolveMissileFlights();
updateSupplyIntegrity(); checkEscalationTriggers();
updateCeasefireStability(); checkCoupProbability();
}
function dailyTick() {
market.worker.postMessage({ cmd: 'RECALCULATE_PRICES' });
processTradeContracts(); updateSIGINTNetworks();
advanceConstructionProgress(); processProcurementDeliveries();
}
10.3 SharedArrayBuffer Layout
Page 20

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
// Flat binary layout for maximum read performance
// All workers read without locking; tick.worker writes atomically
Sections:
[0..N_DISTRICTS * DISTRICT_SIZE] District records (packed structs)
[P_OFFSET..] Province aggregate cache
[N_OFFSET..] Nation records
[MARKET_OFFSET..] Price table (200 commodities)
[UNIT_OFFSET..] Military unit records
[CONTRACT_OFFSET..] Active arms + trade contracts
[DIPLO_OFFSET..] Diplomatic relation matrix
[EVENT_OFFSET..] Event queue ring buffer
High-freq fields (combat, supply): Float32 for speed
Low-freq fields (GDP, population): Float64 for precision
Strings (names): separate Map; only loaded for UI rendering
Page 21

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 11
World State Data Schemas
11.1 Nation Schema
interface Nation {
id: string; name: string; capital_id: string;
government: GovernmentType; regime_since: GameDate;
// Economy
treasury: number; credit_rating: CreditRating;
gdp: number; debt: number; inflation: number;
// Military
army_corps: ArmyCorps[]; air_wings: AirWing[]; naval_fleets: NavalFleet[];
nuclear_status: NuclearStage; nuclear_stockpile: number;
// Diplomacy
alliances: string[]; at_war_with: string[];
sanctions_on: string[]; sanctions_from: string[];
// AI
ai_archetype: AIArchetype; utility_weights: UtilityWeights;
memory_fluid: FluidMemoryEntry[];
// Epochal memory built from Chronicle + history.json
}
11.2 Hardware Unit Schema
interface HardwareUnit {
id: string; model: string;
category: 'AVIATION'|'ARMOR'|'ARTILLERY'|'NAVAL'|'MISSILE'|'AIR_DEFENSE';
generation: number; // 2-6
owner_nation: string; origin_nation: string;
eula_active: boolean; // false = domestic or RE-complete
quantity: number; age_years: number; readiness: number; // 0-100
deployed_to: string | null;
// Performance
rcs_profile: number; avionics_tier: number; bvr_capable: boolean;
kinetic_protection: number; engagement_ceiling: number;
// Supply
monthly_parts_cost: number; fuel_type: FuelType;
}
11.3 POP Schema & Militancy Calculation
Page 22

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
interface POP {
district_id: string;
class: 'LABORER'|'FARMER'|'CAPITALIST'|'BUREAUCRAT'|'MILITARY'
|'INTELLIGENTSIA'|'OLIGARCH'|'CLERGY';
culture: string; religion: string; size: number;
wealth: 'POOR'|'MIDDLE'|'WEALTHY';
esol: number; asol: number; // 0-100 each
militancy: number; radicalism: number; // 0-100 each
ideology: Ideology; party_support: Record;
loyalty: number; // 0-100 loyalty to current regime
}
// Monthly Tick:
function updatePOP(pop, district, nation) {
pop.esol = calcESoL(globalAvgSoL, neighborWealth, govPromises);
pop.asol = calcASoL(goodsBasket, healthcare, infrastructure, taxBurden);
const gap = Math.max(0, pop.esol - pop.asol);
pop.militancy = clamp(
pop.militancy + gap * SUPPRESSION_MOD * IDEOLOGY_AMP - passiveDecay(pop.asol),
0, 100
);
}
Page 23

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 12
Economic Engine — Technical Implementation
12.1 Market Price Algorithm
// market.worker.ts — Daily Tick
function recalcPrices(state: WorldState): PriceTable {
for (const commodity of ALL_COMMODITIES) {
const supply = sumGlobalProduction(commodity, state);
const demand = sumGlobalConsumption(commodity, state);
const ratio = demand / Math.max(supply, 1);
const elasticity = COMMODITY_ELASTICITY[commodity]; // 0.2-0.9
const target = BASE_PRICE[commodity] * Math.pow(ratio, 1 / elasticity);
// Smooth price — no instant spikes
prices[commodity] = lerp(state.prices[commodity], target, 0.15);
}
}
// Inelastic goods (food, fuel) spike harder: lower elasticity = steeper curve
// COMMODITY_ELASTICITY: { wheat: 0.2, oil: 0.3, chips: 0.7, luxury: 0.9 }
12.2 Trade Route Pathfinding
// Dijkstra over province adjacency graph
// Edge weight = tariff + transport cost + political penalty + blockade
function findTradeRoute(seller: NationId, buyer: NationId) {
const weight = (a: District, b: District) =>
getTariff(a.nation_id, b.nation_id) // 0-0.5
+ getTransportCost(a, b) // terrain-based
+ getAlignmentPenalty(a.nation_id, b.nation_id)
+ (isBlockaded(b) ? Infinity : 0); // wall
return dijkstra(graph, seller.capital, buyer.capital, weight);
}
// Routes only recalculate when border closes, port blockaded, or tariff changes
// Not every tick — lazy re-evaluation on state change events
Page 24

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 13
Military Combat Engine
13.1 Combat Resolution (Hourly Tick)
function resolveCombat(frontline: Frontline, state: WorldState) {
const terrain = getDistrict(frontline.district_id, state);
const engaged_A = Math.min(attacker.divisions, terrain.combat_width);
const engaged_D = Math.min(defender.divisions, terrain.combat_width);
let atkPower = calcPower(attacker, engaged_A, 'ATTACK');
let defPower = calcPower(defender, engaged_D, 'DEFENSE');
atkPower *= terrain.attack_modifier;
defPower *= terrain.defense_modifier;
defPower *= 1 + (defender.entrenchment / 100) * 0.8;
atkPower *= getEWAdvantage(attacker, defender); // electronic warfare
atkPower *= getCASBonus(frontline.district_id, state); // air support
// Lanchester-inspired losses
const defLoss = (atkPower / defPower) * BASE_LOSS_RATE * engaged_D;
const atkLoss = (defPower / atkPower) * BASE_LOSS_RATE * engaged_A;
applyLosses(attacker, atkLoss); applyLosses(defender, defLoss);
if (defender.organization < BREAKTHROUGH_THRESHOLD)
advanceFrontline(frontline, state);
}
13.2 Supply Line BFS
// Daily Tick — check supply for every deployed corps
function updateSupplyLines(state: WorldState) {
for (const corps of getAllDeployedCorps(state)) {
const path = BFS(
from: corps.position,
to: corps.nation.capital_id,
passable: (d) => d.nation_id === corps.nation_id || d.nation_id === null
);
corps.supply_integrity = path ? calcSupplyFlow(path, state) : 0;
if (corps.supply_integrity < 20) {
corps.organization -= 5; // -5 per hourly tick (starvation)
if (corps.organization < 10)
fireEvent('ENCIRCLEMENT_COLLAPSE', corps, state);
}
}
}
Page 25

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 14
Diplomatic Engine — State Machine
14.1 Bilateral Relation Schema
type DiplomaticState =
'ALLIED'|'FRIENDLY'|'NEUTRAL'|'TENSE'|'HOSTILE'|'AT_WAR'|'CEASEFIRE'|'POST_WAR';
interface BilateralRelation {
nation_a: NationId; nation_b: NationId;
state: DiplomaticState;
dna_scores: {
ideological: number; // -100 to +100
economic: number; // 0 to +100
historical: number; // -100 to 0
border_friction: number;// -50 to 0
strategic: number; // -50 to +50
};
active_treaties: Treaty[];
active_sanctions: Sanction[];
fluid_memory: FluidMemoryEntry[];
war_data: WarRecord | null;
peace_pipeline: PeacePipeline | null;
}
14.2 Undeclared War — Deniability Window
// When military action fires without prior declaration:
function processUndeclaredAttack(attacker: Nation, defender: Nation) {
startCombat(attacker, defender);
attacker.deniability_window = 6; // hourly ticks
// Defender unlocks emergency contact options immediately
openEmergencyDiplomacy(defender);
// Coalition pass 1 begins
scheduleCoalitionEvaluation(attacker, defender, delay=1); // Daily Tick
// Each tick deniability_window > 0: attacker can claim incident
// When window expires: conflict logged in Global Alignment System
// Sanctions evaluation begins based on coalition sizes
}
Page 26

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 15
Peace Process — Pipeline State Machine
15.1 PeacePipeline Schema
type PeaceStage =
'CONTACT' | 'HUMANITARIAN_PAUSE' | 'PRELIMINARY_CEASEFIRE'
| 'FRAMEWORK_NEGOTIATION' | 'TREATY_RATIFICATION'
| 'NORMALIZATION' | 'FROZEN_CONFLICT';
interface PeacePipeline {
stage: PeaceStage; stage_since: GameDate;
mediator_id: NationId | null; guarantors: NationId[];
tracks: {
territory: NegotiationTrack; // 0-100 progress each
prisoners: NegotiationTrack;
reparations: NegotiationTrack;
recognition: NegotiationTrack;
security: NegotiationTrack;
};
ceasefire_stability: number; // 0-100; decays if violated
collapse_risk: number; // 0-1 probability per day
}
15.2 Pipeline Tick Logic
// Daily Tick
function tickPeacePipeline(rel: BilateralRelation, state: WorldState) {
const pp = rel.peace_pipeline;
if (!pp) return;
if (pp.stage >= 'PRELIMINARY_CEASEFIRE') {
pp.ceasefire_stability -= calcStabilityDecay(pp, rel, state);
if (pp.ceasefire_stability <= 0) {
collapseCeasefire(rel, state);
fireEvent('CEASEFIRE_COLLAPSED', rel, state); return;
}
}
switch (pp.stage) {
case 'CONTACT':
if (bothPartiesAcknowledged(pp)) advance(pp, 'HUMANITARIAN_PAUSE'); break;
case 'HUMANITARIAN_PAUSE':
if (pp.tracks.prisoners.progress > 30) advance(pp,'PRELIMINARY_CEASEFIRE'); break;
case 'PRELIMINARY_CEASEFIRE':
if (allTracksAbove(pp.tracks, 40)) advance(pp,'FRAMEWORK_NEGOTIATION'); break;
case 'FRAMEWORK_NEGOTIATION':
if (allTracksAbove(pp.tracks, 70)) advance(pp,'TREATY_RATIFICATION'); break;
case 'TREATY_RATIFICATION':
if (ratificationPassed(rel, state)) advance(pp,'NORMALIZATION'); break;
}
}
Page 27

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 16
AI Engine — Rational Actor Utility System
16.1 Utility Scoring
function scoreUtility(nation: Nation, state: WorldState): number {
const w = nation.utility_weights;
return (
scoreEconomic(nation, state) * w.economic +
scoreMilitary(nation, state) * w.military +
scoreRegime(nation, state) * w.stability +
scoreStanding(nation, state) * w.standing +
scoreExpansion(nation, state) * w.expansion +
scoreGrievance(nation, state) * w.grievance
);
}
function decideAction(nation: Nation, state: WorldState): AIAction[] {
const current = scoreUtility(nation, state);
const threats = identifyTopThreats(current, nation, state);
const options = generateOptions(threats, nation, state);
return options
.filter(opt => passesConstraints(opt, nation, state))
.map(opt => ({ ...opt, delta: scoreUtility(simulate(opt, nation, state)) - current }))
.sort((a,b) => b.delta - a.delta)
.slice(0, 3);
}
16.2 AI Priority Tier Classification
function classifyAITier(nation: Nation): AITier {
if (nation.at_war_with.length > 0
|| nation.coup_probability > 0.3
|| nation.flashpoint_index > 70) return 'TIER_1'; // Every Hourly Tick
if (hasActiveNegotiation(nation)
|| hasActiveSanctions(nation)
|| nation.border_friction > 50) return 'TIER_2'; // Every Daily Tick
if (nation.gdp > SMALL_NATION_THRESHOLD) return 'TIER_3'; // Every Monthly Tick
return 'TIER_4'; // Micro-states — Yearly Tick only
}
16.3 WWPI — World War Proximity Index
Page 28

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
function calcWWPI(state: WorldState): number {
const conflictScore = state.activeWars
.reduce((sum, war) => sum + war.escalation_level * 10, 0);
const superpowerFactor = countSuperpowerInvolvement(state) * 1.5;
const nuclearProximity = anyNuclearStateInConflict(state) ? 1.8 : 1.0;
const allianceInterlocking = calcAllianceInterlocking(state) * 1.3;
return conflictScore * superpowerFactor * nuclearProximity * allianceInterlocking;
}
// WWPI < 40: normal; WWPI 40-65: elevated caution; neutral mediators activate
// WWPI 65-85: crisis — all escalations frozen; back-channels forced open
// WWPI > 85: emergency summit fires; all major nations receive forced dialogue
Page 29

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 17
Intelligence System — Technical Implementation
interface IntelNetwork {
owner_nation: NationId; target_nation: NationId;
sigint_coverage: number; // 0-100
geoint_coverage: number; // driven by satellite coverage of target
humint_depth: number; // 0-100; agents in place
attribution_score: number; // 0-100; how much target suspects you
}
function calcSWI(nation: Nation, state: WorldState): number {
const nets = getOwnIntelNetworks(nation, state);
const sigint = avg(nets.map(n => n.sigint_coverage)) * 0.35;
const geoint = getSatelliteCoverage(nation, state) * 0.35;
const humint = avg(nets.map(n => n.humint_depth)) * 0.30;
return (sigint + geoint + humint)
* (1 - getCyberDegradation(nation, state))
* (1 - getASATDegradation(nation, state));
}
// SWI > 75 -> full early warning; IADS on alert
// SWI 40-75 -> partial warning; scramble time penalty
// SWI < 40 -> surprise possible; IADS offline for 12 ticks
// SWI < 15 -> catastrophic; command collapses for 24 ticks
Page 30

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 18
Save / Load & Session Management
Component Storage Frequency Size
World state snapshot SQLite — Player-triggered + auto every ~2-5 MB per snapshot
world_snapshots 30 min
Chronicle SQLite — chronicle Continuous; never overwritten ~50 KB per in-game year
Event log archive SQLite — event_log Continuous; pruned after ~10 MB full campaign
1000/category
Player preferences SQLite — player_data On change < 1 MB
async function saveGame(slotName: string) {
pauseSimulation();
const snapshot = serializeWorldState(worldStateBuffer); // binary pack
await db.execute('INSERT INTO world_snapshots VALUES (?,?,?,?)',
[generateId(), slotName, gameDate.toString(), snapshot]);
resumeSimulation();
}
async function loadGame(snapshotId: string) {
terminateAllWorkers();
const row = await db.select('SELECT * FROM world_snapshots WHERE id=?', [snapshotId]);
deserializeWorldState(row.data, worldStateBuffer);
restartWorkers();
}
Page 31

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 19
Performance Targets & Optimisation Strategy
| Metric | Target | Strategy |
| ------ | ------ | -------- |
Frame rate 60fps sustained; InstancedMesh single draw call; render thread never touches
|     | 144fps capable | simulation data |
| --- | -------------- | --------------- |
Hourly tick < 16ms Combat is O(frontlines) not O(districts); batched per-theater
Daily tick < 50ms Market worker async; trade paths cached; re-runs only on route
change
Monthly tick < 200ms spread POP updates chunked — 1/4 of districts per hourly tick
across 4 hourly ticks
Yearly tick < 500ms spread GDP = province cache sum; credit rating = lookup table
across 30 ticks
RAM usage < 512 MB total SharedArrayBuffer for hot state; SQLite for cold data
Overlay switch < 16ms (one frame) Color arrays pre-computed; switch = memcpy + one GPU upload
Save < 2 seconds Binary serialization; async SQLite write; pause only during
memcpy
SQLite read fi buffer copy; Three.js mesh regeneration in parallel
| Load | < 5 seconds |     |
| ---- | ----------- | --- |
Startup < 3 seconds to Provinces load simplified first; full geometry streams in over 10s
interactive
19.1 District Count Scaling Strategy
| Phase | Nodes Coverage | Rationale |
| ----- | -------------- | --------- |
MVP (Phase ~500 5 test nations at province Architecture validation; zero performance risk
1) level
| Phase 2 | ~2,000 20 nations at province | Economic loop at scale |
| ------- | ----------------------------- | ---------------------- |
level
| Phase 3 | ~8,000 Full world province level | Domestic politics at scale |
| ------- | -------------------------------- | -------------------------- |
| Phase 4 | ~25,000 Full world + major       | War and diplomacy systems  |
sub-provinces
| Phase 5+ | ~80,000 Full world district level | Target final fidelity |
| -------- | --------------------------------- | --------------------- |
Page 32

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 20
Development Environment & Toolchain
Tool Version Install From Purpose
VS Code Latest code.visualstudio.com PRIMARY EDITOR — all code written here
Node.js LTS (20+) nodejs.org JavaScript runtime; required for all pnpm
commands
pnpm 8+ npm install -g pnpm Faster package manager; workspace support
Rust Stable rustup.rs Required by Tauri — install once, never write Rust
(1.75+) yourself
Git Latest git-scm.com Version control — commit every working state
20.1 Required VS Code Extensions
Extension Why
ESLint (dbaeumer.vscode-eslint) Catches JS/TS errors before runtime — critical for complex
codebase
Prettier (esbenp.prettier-vscode) Consistent code formatting across 50,000+ lines
Error Lens (usernamehw.errorlens) Errors shown inline next to the code — no hunting in Problems
panel
GitLens (eamodio.gitlens) Full git history in editor; who changed what and why
Tauri (tauri-apps.tauri-vscode) Tauri config syntax + integrated commands
SQLite Viewer (qwtel.sqlite-viewer) Inspect save files and Chronicle directly in VS Code
TODO Highlight (wayou.vscode-todo-highlight) Track unfinished work across thousands of files
20.2 Setup Commands
# Install Node.js from nodejs.org
# Install Rust from rustup.rs
# Install VS Code from code.visualstudio.com
# Open VS Code terminal, then:
npm install -g pnpm
pnpm create tauri-app@latest aetherion
# Select: TypeScript, Next.js, pnpm
cd aetherion && pnpm install
pnpm add three @types/three zustand
pnpm add @tauri-apps/api @tauri-apps/plugin-sql @tauri-apps/plugin-notification
pnpm add tailwindcss postcss autoprefixer
pnpm add -D typescript
pnpm tauri dev # Hot-reload development mode
pnpm tauri build # Produces .exe / .app / .AppImage
Page 33

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 21
Phase 1 MVP — Technical Implementation Plan
Phase 1 produces a working interactive world map with 5 test nations, clickable provinces, basic stats
display, all 14 map overlays rendering (with placeholder data), a notification toast, and save/load. This
validates the entire rendering and architecture before any simulation logic is written.
Deliverable Done When
Tauri app shell App launches; blank window opens on all 3 platforms
Three.js globe Rotating globe visible; mouse drag/zoom works
Province mesh loads 500-node GeoJSON rendered; 5 nations in distinct colors
Province hover tooltip Hover -> name + terrain + nation appear
Province click -> detail panel Click -> right panel shows district data
14 overlay buttons render All 14 overlay buttons in toolbar; clicking switches colors
(placeholder data ok)
Right-click context menu Menu appears; actions log to console
Basic tick engine setInterval ticks treasury; SharedArrayBuffer updated; GDP overlay
updates live
Notification toast Test event fires from tick; toast appears top-right; auto-dismisses
SQLite save/load Save -> serialize -> write; Load -> restore exact world state
Chronicle panel shell Panel opens; empty timeline renders; no data yet
Admin merge UI shell Shift-click two districts; Merge button appears; logs to console
21.1 3-Week Implementation Schedule
WEEK 1 — Foundation
Day 1: pnpm create tauri-app; verify shell launches
Day 2: Add Three.js; globe renders; OrbitControls
Day 3: Load GeoJSON; InstancedMesh provinces; nation colors
Day 4: Raycasting; hover tooltip
Day 5: Click handler; React side panel opens
WEEK 2 — Overlays + Live Data
Day 1: Overlay toolbar component; 14 buttons
Day 2: Implement 3 overlays (sovereignty, GDP heat, population)
Day 3: SharedArrayBuffer setup; tick.worker basic loop
Day 4: Treasury tick; GDP overlay updates live
Day 5: All 14 overlays wired (placeholder data)
WEEK 3 — UX + Persistence
Day 1: Notification toast component + test event
Day 2: SQLite plugin; save/load flow
Day 3: Right-click context menu
Day 4: Chronicle shell + admin merge UI shell
Day 5: Bug fixing; performance check; 60fps confirmed
Page 34

AETHERION — TECHNICAL DESIGN DOCUMENT v1.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
This Technical Design Document defines every system, data structure, and implementation strategy for Aetherion.
Keep it updated as implementation decisions are made — every deviation from the spec should be recorded here
with rationale. The architecture described here is designed to scale from MVP to full 80,000-node simulation
without architectural rework.
AETHERION · TDD v1.0 · CONFIDENTIAL INTERNAL DOCUMENT
Page 35