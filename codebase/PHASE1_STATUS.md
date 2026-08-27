# Aetherion — Phase 1 Status & Handoff

Brief handoff so a fresh session can pick up. Full rationale in
[DECISIONS.md](./DECISIONS.md); game design in `../docs/`.

## What it is
Real-time geopolitical grand-strategy sim. **Phase 1 = "The World Graph"**: a
flat, **equal-area Equal-Earth VECTOR world map** at **district level** rendered
with Three.js, plus the HUD + a worker sim clock. Stack: **Vite + React + TS +
Three.js + Zustand + Tailwind**, wrapped in **Tauri 2** (desktop). All data
free/open. Runs in the browser with `pnpm dev` (no Rust needed).

## Run
```bash
cd codebase
pnpm install
pnpm etl       # builds map data into public/data/ (already committed; only needed to regenerate)
pnpm dev       # http://localhost:1420
```

## Hard constraint — GPU
The machine has an **RTX 5050**, but the browser/webview renders on the **Intel
UHD iGPU** unless the app is bound to the high-performance GPU (Windows →
Settings → Display → Graphics → add the app → *High performance*; or NVIDIA
Control Panel; Chrome flag "high performance"). The renderer therefore
**auto-tiers** by detected GPU (`src/map/core/quality.ts`): discrete GPU = HIGH
(2× DPR, full coastline glow), integrated = LOW (1× DPR, lighter glow). The
coastline-glow land-mask is **cached** and only rebuilt when the camera moves —
keep it that way. Measured on Intel UHD: ~70fps idle, ~58fps panning. Keep the
existing light-rendering rules (indexed fill, wrap-cull to 1 copy at world view,
hide terrain/internal-borders/cities until zoomed in). To get full visual
quality, bind the app to the RTX (above).

## Done & verified
- 280 nations / 49,411 districts (geoBoundaries ADM2 + NE admin-0 fill — no country lost).
- **Equal Earth** projection, vector fills (crisp at any zoom), **GPU 1px picking**.
- **Muted, flag-derived, adjacency-distinct** country colors (no two neighbors alike).
- **Flags** per country (`public/data/flags/`), shown in panels.
- Borders: **international** = thin 1px black; **internal** = fade in on zoom in.
- **Rivers** dark blue, sized by importance; lakes.
- **Real province populations** (NE POP_EST distributed across all provinces by area+cities).
- Per-nation/per-province **data dictionary** (`data: {terrain, population, economy}`).
- **Terrain reveal on zoom**: NASA Blue Marble fades in + province fills drop to a slight tint.
- **Horizontal wrap** ("revolve"): pan east across the Pacific to the Americas, seamless.
- **Decorative map frame** (vignette, corner brackets, ticks).
- Performance pass (indexed geometry, copy culling) — see D-010.

## DONE (2026-06-27) — the three deferred finishers + a graphics overhaul
1. **City structures + zoom labels** ✓ — skyline glyphs with a soft bloom
   (`cityFragment`), reveal wired from `MAP.cityReveal` vs zoom, hidden when out.
   DOM name labels: `FlatMapScene.projectLabels` → `store/labelStore.ts` →
   `features/map/CityLabels.tsx` (handles the horizontal wrap, zoom-scaled pop
   gate, gold capitals).
2. **3D raised terrain** ✓ — `terrainFragment` samples an equirectangular
   elevation heightmap (`public/data/map/elevation.jpg`, NASA/turban MIT, wired
   in the ETL `SOURCES.elevation` + copy step), computes a directional hillshade
   from the height gradient + snow caps. Mountains read as physically raised over
   the Blue Marble colour. Tunables in `tokens.mapViz.terrain`.
3. **Maritime borders + sea provinces** ✓ — `scripts/etl/build-sea.mjs`
   (`pnpm etl:sea`, additive — doesn't touch the land pipeline): grids the oceans,
   assigns each cell to the nearest coastline nation within ~4° (EEZ), writes
   `sea_fill/color/idx/borders.bin` + `sea.json`. Runtime renders a faint
   owner-tinted water overlay + maritime border lines (191 nations get EEZs).
   Foundation for naval movement. (Sea cells are not yet pickable/owned entities —
   that's the Phase-2 naval hook.)

**Graphics overhaul** (all token-driven via `tokens.mapViz`): desaturated +
tone-unified fills (kills "Skittles"), animated ocean + depth gradient + a
cached coastline glow (`map/core/postfx.ts` multi-pass FBO pipeline), vignette +
film grain + cinematic colour grade, border hierarchy (intl recedes, province
faint), desaturated rivers, GPU auto-tiering (`map/core/quality.ts`).

## Iteration 2 (2026-06-27) — feedback polish
- **City dots** (not skyline glyphs) + **LOD labels** (capitals → major → all by
  zoom, screen-space declutter, translucent, culled under HUD panels via
  `[data-hud]` rects).
- **Relief replaces the satellite reveal**: zoom now fades in a hillshade
  MULTIPLY over the political colours (no Blue Marble). Blue Marble is now the
  Satellite overlay only. Terrain TYPE per province (16 biomes incl. desert,
  swamp, mangrove, taiga…) derived from the heightmap in `build-sea.mjs`.
- **Sea provinces rebuilt** as natural Voronoi cells CLIPPED to the coastline
  (`d3-delaunay` + `polygon-clipping`): ~7,150 provinces, selectable like land
  (own pick mesh; appended to world.json, ids 49412+), EEZ owner-tint via the
  palette, international waters = ownerless provinces. The glow mask uses a
  land-only `maskScene` so it ignores sea cells. Maritime borders very subtle.
- **Internal borders** coloured a darkened shade of each country (per-vertex
  `borders_internal_col.bin` from `build-map.mjs`) so they blend.
- **Northern Cyprus fix**: admin-0 fills are added BEFORE districts in
  `build-map.mjs` so overlapping districts win the GPU pick.
- Removed the animated film grain; rivers thinner/consistent.
- New ETL deps (dev): d3-delaunay, polygon-clipping, jpeg-js. Rebuild order:
  `pnpm etl:build` then `pnpm etl:sea` (sea is additive on world.json).

## Iteration 3 (2026-06-27) — colours, territories, labels, zoom, rivers
- **Globally-unique flag-derived colours** (`build-map.mjs colourize`): greedy
  farthest-point placement in colour space anchored to each flag's hue, with a
  final nudge pass guaranteeing every one of the 276 nations is a distinct hex
  (no more shared pink/teal). Robust as borders change.
- **Restored disputed territories** (`build-map.mjs loadProvinces`): a fill over
  another nation's districts (Northern Cyprus, Palestine) keeps the fill + drops
  those districts; a redundant fill over a nation's own districts under a
  different code (Kosovo KOS vs XKX) drops the fill + keeps the districts. Real
  ISO code → keep districts; junk numeric → keep the named fill.
- **Country name labels** stretched over the main landmass (population-weighted
  centroid + extent in `FlatMapScene.computeCountryAnchors`), shown zoomed-out,
  faded by `MAP.countryLabel`, menu-culled. `CountryLabels.tsx` + store.
- **Extreme zoom** (`MAP.maxZoom` 1500). **Smaller city dots.** **Rivers**
  thicken with zoom then cap (`mapViz.river.*Growth/*MaxPx`, driven in loop).

## DONE (2026-06-27) — the GLOBE (the big architectural pivot)
Now a real **3D globe** (Google-Earth feel: a perspective orbit camera, so the
view naturally flattens as you zoom in and edge countries like NZ render proper
+ selectable instead of warping at a flat rim). It is a **runtime** rewrite — the
ETL still ships flat Equal-Earth geometry; at load `src/map/data/sphere.ts`
inverse-projects every vertex (XY → lng/lat) onto a sphere (radius GLOBE_R=1), so
all existing binaries are reused with no ETL/geometry change. Occlusion is
depth-based: an opaque ocean sphere is the base globe, opaque land fills sit just
above it and write depth (fills are `DoubleSide` since earcut winding varies
post-spherify; the far hemisphere is depth-occluded). Layers stack on nested
radii (ocean→fills→relief→sea→lakes→rivers→borders→cities). **Atmosphere rim**
shell (FrontSide fresnel, additive) replaces the flat coastline glow; relief +
satellite are full-sphere overlays sampled by lng/lat from position; cities are
points; **labels** project 3D→screen with backside (horizon) culling. Picking is
a 1px GPU pass with the perspective camera. The horizontal wrap is gone. Reveals
(relief, cities) are keyed on camera **altitude** (`GLOBE` in gameConfig).
Verified on the Intel UHD: ~51fps whole-globe, ~35fps zoomed (relief+cities+labels).
Key new files: `core/GlobeScene.ts`, `core/OrbitCamera.ts`, `data/sphere.ts`,
`shaders/globe.glsl.ts`. The old flat renderer (`FlatMapScene`, `Camera2D`,
`postfx`, `flat.glsl`) was **deleted**.

## DONE (2026-06-27) — hard-coded country colours
Nation colours are now **hard-coded** from `scripts/etl/country-colors.json`
(keyed by ADM0_A3 = nation code), so the political map always looks identical.
`colourize()` in `build-map.mjs` locks those in first and only runs the old
flag/adjacency algorithm for the ~16 junk numeric placeholder "nations" not in
the list. Province + internal-border colours are baked from these. To retune a
colour: edit the JSON and rerun `pnpm etl:build && pnpm etl:sea`.

## Iteration 5 (2026-06-27 → 06-28) — fix dark patches, "alive" water, selection
All token-driven (`tokens.mapViz`), shaders in `globe.glsl.ts`, wiring in `GlobeScene.ts`.

**The "dark blue patches" were NOT lakes** (a first guess). They are GAPS between
the simplified ADM2 district polygons: `-simplify 10% keep-shapes` isn't
topology-preserving, so adjacent districts pull apart and the gaps exposed the
dark ocean sphere (confirmed by flashing the ocean magenta — the blobs lit up).
**Fix = a nation BACKSTOP fill** (`build-map.mjs` `emitBackstop` region →
`fill_bk*.bin`): a solid, gap-free fill of each nation's DISSOLVED geometry
(`geoBoundariesCGAZ_ADM2.nations.geojson`, coastline matches the districts
exactly), coloured by a representative province id so it recolours with overlays,
rendered BENEATH the districts (`R.backstop`, renderOrder -5, not pickable). Only
the gaps show it; ~215 nations, +2.2 MB, ~65 fps zoomed on the iGPU. Rebuild:
`pnpm etl:build && pnpm etl:sea`.
- **Lakes** are now a shaded flowing-water shader (`lakeVertex`/`lakeFragment`,
  `mapViz.lake.*`) — limb darkening + ripple + glint — instead of flat `navy`.
- **Rivers fade IN with zoom** (`mapViz.river.minorFade`/`majorFade` in zoom01):
  hidden at globe view (no clutter), trunk rivers appear at continental zoom,
  minor tributaries only up close. Width still grows-then-caps. Driven in the loop.
- **Living ocean:** `oceanFragment` reworked to two crossing fbm wave fields +
  a travelling sun-glint (`mapViz.ocean.glint`). Tuned FINE + low-contrast
  (`ocean.shimmer` 0.035, high spatial freq) to read as a sheen, not the blotchy
  "light/dark texture" of the first pass. Sea-cell tint dropped to 0.09 so the
  Voronoi cells don't read as a blocky patchwork over open water.
- **Border ↔ fill alignment:** the per-layer radial stack (`R` in GlobeScene) was
  squeezed from a ~0.0018R spread into a ~0.0002R band just above the fill, so
  borders/rivers no longer visibly part company from the fill colour at grazing
  angles / extreme zoom (paint order is resolved by `renderOrder`, not radius).
- **Raised selection:** the picked province is extruded radially off the globe
  (`mapViz.fill.selectLift`, applied in `fillVertex`) + brightened
  (`selectBrighten`) so it reads as a lifted tile (parallax + the existing gold
  pulse sell the "raised, prominent" look). Sea tints highlight but don't lift.
  Lift kept gentle (`selectLift` 0.0006) so the simplified province outline
  doesn't read as a jagged cliff.

**Verified (preview):** former hole pixels now render land colour (not ocean);
land/ocean sample grid shows contiguous landmasses; ~65 fps zoomed on the Intel
UHD with the backstop + relief. NOTE: live screenshots were blocked this session
because the preview page reports `visibilityState: hidden` (rAF paused), so the
ocean-sheen + selection-polish retune is reasoned/pixel-sampled, not eyeballed —
worth a visual confirm.

## DONE (2026-08-27) — the world economy MOVES
Every nation's per-capita output used to be a constant: thirty game-years in,
Germany was exactly as rich as on day one. `src/sim/growth.ts` puts the world in
motion. A nation's path is CLOSED-FORM in game time — trend (convergence: poor
economies catch up, conditional on the government archetype's state capacity) +
a two-harmonic business cycle whose periods are hashed per nation, so booms and
slumps are staggered and aperiodic. No per-nation state, no 280-nation loop:
`growthFactor(id, years)` is one exponential of an exact integral, so year 40
costs what year 1 costs. Knobs in `config/economy.ts` GROWTH.

The ONE path-dependent part is the SCAR (economyStore `growth`, persist v4):
war/sanctions/held-provinces compound damage daily onto the trend path, calm
compounds a rebound back toward whole (floored at 55% of trend). Wired through
`nationLedger` (so every nation's ledger is dated) and economyStore.recompute
(the player's, scar included); the Statecraft Overview shows Growth / yr and a
dispatch closes the books every 1 January. `openingLedger()` is the deliberate
counterpart: the New Game dossier and the starting treasury read YEAR ZERO,
because quitting to the menu suspends a campaign and leaves its clock standing.
Verified headless against the real world.json: DEU $3.88T opening, +25% over a
decade; a war scars Pakistan to −8% and peace rebuilds it; ~12% of quarters in
contraction across the sample. `growthSelfCheck()` asserts the invariants on
every DEV boot (`window.__growthCheck`).

## DONE (2026-08-27) — the world conducts its own foreign policy
`src/sim/aiForeignPolicy.ts` fills the LOD slot the scheduler reserved. The
~103 powers named in `blocs.json` act; everyone else has no foreign policy
worth simulating and costs nothing. Each watches its rivals, its partners, a
rotating window of its bloc and the player; four think per game-day (about
monthly per power, under a millisecond a day). `applyEffects` in the diplomacy
store is now shared by the player's `act` and the AI's `aiAct`, so an action
means the same thing whoever takes it. **War is not on the AI's menu** — there
is no military system to resolve one. **The AI never signs a treaty WITH the
player** either: a treaty binds both sides and the player has not been asked
(the offer/acceptance dialogue is GDD Ch.06). Two calibration lessons, both
found by measuring an 8-year headless campaign: a treaty that restates a bloc
the pair already shares is paperwork (alliances only form outside a military
bloc, trade deals outside an economic one — 2,027 treaties became 303), and a
saturation guard has to read how the TARGET sees the actor, since that is where
an action's weight falls, or every rivalry pins to exactly -100.

## DONE (2026-08-27) — desktop app
`pnpm desktop` builds a 71 MB Tauri binary with all 268 MB of map data
compressed inside, and refreshes the copy at the repo root that the desktop
shortcut points at. `tauri.conf.json` had a `comment` key inside `app.security`
that the v2 schema rejects — the build could not start until it went.

## DONE (2026-08-27) — the commodity market
`src/sim/market.ts`: every commodity's price is a function of the campaign
date — `(1 + scarcity)^t x (1 + amp.sin(wt + phase))`, per-commodity period and
phase, bounded 0.45x–3.2x, closed-form like the growth model. Royalties are
levied at today's prices, and the TERMS OF TRADE swing every nation's output by
its net position (a fuel slump costs Russia ~6% of GDP and hands importers
+0.4%), capped both ways. Exports and imports are put on one scale by the
identity that defines a market — the world's sales equal its purchases
(`marketScale()`) — rather than by an invented constant; the catalogue `value`
is an inflated index and comparing it to real GDP directly made Russia's
exports twice its own economy. Day one is unchanged by construction (priced
output equals the baked figure to zero drift), which is what protects the
opening numbers validated against the real world. Statecraft > Budget shows the
board and your terms of trade. **Ceiling** (`ponytail:` comment in market.ts):
royalties keep the old `RESOURCE.gvaScale` because the ETL's resource index
tracks province AREA rather than real extraction, so the market's bite on a
petrostate's BUDGET is understated until build-resources.mjs re-derives it.

## NEXT
Naval movement, river names on hover, seasonal terrain. UI/HUD polish pass (the
map is now "alive"; the surrounding panels/frame are the next elegance target).
Perf: zoomed-in fps on the iGPU is fragment-bound (DoubleSide fills + relief
sphere) — bind the app to the RTX for the full experience.

## Map / key files
- `scripts/etl/` — geo pipeline. `build-map.mjs` (main), `flags.mjs`, `config.mjs`
  (`PROVINCE_SOURCE` toggles districts↔provinces), `simplify-adm2.md` (district data setup).
- `src/config/` — **single source of truth**: `tokens.ts` (all colors/motion),
  `gameConfig.ts` (camera/zoom/data paths), `overlays.ts`, `keybindings.ts`.
- `src/map/core/GlobeScene.ts` — the 3D renderer (camera, layers, picking, reveals).
  `OrbitCamera.ts` (perspective orbit+dolly), `OverlayController.ts` (palette).
  `src/map/data/sphere.ts` (load-time spherification). Shaders in
  `src/map/shaders/globe.glsl.ts`. Hard-coded colours: `scripts/etl/country-colors.json`.
- `src/features/` — HUD, panels, frame, cursor, notifications. `src/store/` — zustand.
- Memory: `~/.claude/projects/C--Users-areeb-Aetherion/memory/` (project + conventions).
