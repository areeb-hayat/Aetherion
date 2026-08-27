# Architecture Decision Log

Per the TDD's instruction to record every deviation from spec with rationale.
Newest first.

---

### D-010 — Performance pass (target: Intel integrated GPUs) + muted colors

The map runs on Intel UHD-class iGPUs, so the renderer is fragment/vertex bound.
Fixes (world view 17fps → 53fps, zoom 39 → 57):
- **Indexed fill geometry:** vertices stored once, triangles via an index buffer
  (`fill_idx.bin`) — 4.9M → 1.8M verts (`fill.bin` 39 → 14 MB).
- **Wrap-copy culling with margin:** off-screen tiled copies aren't drawn; the
  margin also skips barely-overlapping slivers, so the world view draws ONE
  copy (visible meshes 21 → 6). Terrain + internal borders are hidden until
  revealed.
- **Cheap international borders:** 1px `LineBasicMaterial` instead of `Line2`
  (also matches "thin on zoom-out"). Major rivers keep `Line2`.
- **Pixel ratio capped at 1** (iGPUs are fragment-bound; high-DPI squares cost).

Also: country colours muted to a low-saturation earth/pastel band (still
adjacency-distinct); rivers recoloured dark blue.

---

### D-009 — Map refinements: dark unique colors, real populations, zoom reveal, frame, world wrap

- **Dark, unique, flag-relevant colors:** greedy graph colouring over a nation
  adjacency graph (built from shared district edges) picks, for each country, the
  dark shade of its flag hue most distinct from its already-coloured neighbours.
  No two bordering countries share a colour.
- **Real province populations:** every country's true total (NE `POP_EST`) is
  distributed across ALL its provinces by equal-area (Equal Earth is equal-area,
  so projected area ∝ real area) blended with city weighting. Sums to the real
  total (PAK 217M, USA 328M). Cities are now pure UI landmarks.
- **Zoom-responsive styling:** as you zoom in, the Blue Marble terrain fades in,
  province fills drop to a slight tint over it, and internal (district) borders
  fade in. International borders are a thin near-black line (no glow), width
  scaling slightly with zoom. Driven by `MAP.reveal` in gameConfig.
- **Horizontal wrap ("revolve"):** every layer is rendered as tiled copies at
  ±`worldPeriod`; the camera wraps `center.x` modulo the period. Pan east from
  Asia → across the Pacific → the Americas, seamlessly. Equal Earth's scalloped
  seam falls in mid-Pacific and reads as ocean. Picking copies added too.
- **Map frame:** decorative vignette + gilded inset border + corner brackets +
  edge ticks (`features/frame/MapFrame.tsx`).

Still queued: city structures + labels, true 3D raised terrain, maritime EEZ.

---

### D-008 — All countries preserved + flags + muted colors + border hierarchy + data model

**Decisions (one feedback pass):**
- **No country lost:** province layer = geoBoundaries ADM2 districts + Natural
  Earth admin-0 FILL for countries lacking districts → 280 nations, 49,411
  provinces (62 filled).
- **Flags:** downloaded per country (flagcdn) to `public/data/flags/<iso2>.png`,
  shown in the UI.
- **Muted, flag-derived colors:** dominant flag hue extracted (pngjs decode),
  then saturation/lightness FIXED to a calm muted band — polished, not sharp.
- **Border hierarchy:** internal (district↔district) drawn thin/muted;
  international (national outlines, via mapshaper `dissolve2`) drawn as thick
  screen-space `Line2` — clear visual distinction.
- **Rivers sized:** bucketed major/minor by Natural Earth `strokeweight`; major
  rivers drawn as thick `Line2` so they're visible.
- **Data dictionary:** every nation and province carries an extensible `data`
  object (terrain, population, economy). Province population is seeded by
  point-in-polygon city assignment (real-ish — e.g. USA ≈ 235M); the schema is
  built to grow each phase.

**Deferred to a focused next pass** (each substantial): city structures + zoom
labels (replacing dots), 3D raised terrain, maritime EEZ + sea provinces.

---

### D-007 — Terrain via inverse-projected Blue Marble (shader reprojection)

**Decision:** Ship the public-domain NASA Blue Marble equirectangular image and
reproject it to Equal Earth in a fragment shader (inverse Equal Earth via Newton
iteration → lat/lng → equirect UV). Revealed by the "Climate & Terrain" overlay,
which fades province fills translucent.

**Why:** Real terrain/biomes (deserts, forests, ice) with zero ETL raster work
and no extra image-decode dependency — the browser decodes the JPG as a texture
and the shader handles projection per-fragment. Aligns exactly with the
equal-area vector map.

---

### D-006 — Rivers, lakes, and cities

**Decision:** Add Natural Earth rivers (centerlines), lakes (polygons), and
populated places (cities, sized by population, scaled by zoom). All public
domain, processed into the same vector buffers.

---

### D-005 — Flat 2D Equal-Earth VECTOR map (replaced the globe + ID texture)

**Decision:** Replace the 3D globe and the baked raster ID-texture with a flat
**Equal Earth** (equal-area) projection rendered as **vector triangles** +
border lines, with an orthographic 2D camera. Province colors come from a 2D
palette texture indexed by per-vertex province ID; picking is a 1×1 GPU pass.

**Why (user-driven):** The raster ID-texture pixelated when zoomed ("poor
quality"). Vector geometry is resolution-independent — razor sharp at any zoom
("polished gemstone"). Equal Earth gives honest scale (Africa dwarfs Greenland)
without Mercator distortion. District granularity (~50k regions) needs the 2D
palette texture because a 1-row palette would exceed `GL_MAX_TEXTURE_SIZE`.

This obsoleted the globe files (SceneManager, GlobeMesh, Picker, the raster
bake) — removed. The overlay palette + cross-fade system carried over unchanged.

---

### Districts — geoBoundaries ADM2 (replaces Natural Earth Admin 1 for provinces)

**Decision:** Province layer is now geoBoundaries CGAZ **ADM2** (~49k districts,
CC-BY) instead of Natural Earth Admin 1 (~4.6k). Simplified with mapshaper
(550 MB → 70 MB) before the build. See `scripts/etl/simplify-adm2.md`.

**Why:** Combat realism needs district granularity, not huge provinces. Source
is switchable via `PROVINCE_SOURCE` in `config.mjs`.

---

### D-004 — Pure-JS rasterizer + PNG encoder for the ID texture (not a native canvas)

**Context:** Risk #1 from the roadmap — bake a province-ID texture where each
pixel encodes a province ID.

**Decision:** Rasterize with a hand-written scanline fill and encode the PNG
with Node's built-in `zlib` (`scripts/etl/lib/raster.mjs`, `lib/png.mjs`).

**Why:** We first tried `@napi-rs/canvas`. On a single province it was correct,
but in the full 4,603-province bake it **corrupted pixels far from their
polygons** (a province's color appearing as stray pixels across the eastern
hemisphere), in both `antialias` modes. Because every pixel *is* a province ID,
a single wrong pixel is a wrong province. The pure-JS path is deterministic,
faster (~160 ms for the whole world), reproducible on any machine, and removes a
native dependency entirely. Verified end-to-end: Paris→France, Sydney→NSW,
Moscow→Russia, plus a byte-exact PNG round-trip self-check in the baker.

---

### D-003 — Natural Earth Admin 1 for the Phase-1 province layer (GADM deferred)

**Decision:** Use Natural Earth 10m Admin 0 + Admin 1 (public domain) for the
full world at province level (~4,600 provinces). GADM district detail (~80k
nodes) is deferred to Phase 3+ as the TDD's scaling plan intends.

**Why:** Natural Earth is public domain (no permission needed), ~50 MB total,
and gives a complete, good-looking world immediately. GADM is a 2 GB download,
requires written permission for commercial use, and district granularity isn't
needed until the combat/POP systems land.

---

### D-002 — ID-texture + data-texture rendering (the map-painting technique)

**Decision:** Render the map as a sphere sampling an equirectangular province-ID
texture, with overlay colors in a 1-row palette data-texture. Recoloring =
update the tiny palette; picking = decode the ID pixel under the cursor on the
CPU.

**Why:** This is how paintable strategy maps scale. The whole world is one draw
call, overlay switches are one small GPU upload (and cross-fade for free), and
picking needs no GPU readback. It scales from 4,600 provinces now to 80k
districts later without architectural change. The TDD's "InstancedMesh per
district" is the right intent (one draw call, per-instance color); the ID-texture
is the concrete technique for arbitrary polygons.

---

### D-001 — Vite + React instead of Next.js

**Decision:** Build on Vite + React + TypeScript, not Next.js 14 (TDD Ch.01).

**Why:** The game is a single full-screen `<canvas>` inside Tauri. Next.js's
value (SSR, file routing, API routes) is unusable in a Tauri webview and adds
static-export config and `'use client'` overhead. Vite is the Tauri default,
has faster HMR, and fewer moving parts — i.e. more foolproof. Same React +
Three.js + Workers + SharedArrayBuffer code, minus the framework tax. Confirmed
with the user before scaffolding.
