/**
 * ============================================================================
 *  AETHERION — DESIGN TOKENS  (THE SINGLE SOURCE OF TRUTH FOR ALL VISUALS)
 * ============================================================================
 *
 *  Change a value HERE and it propagates everywhere:
 *    • Tailwind utility classes      ← tailwind.config.ts imports this file
 *    • Raw CSS / custom cursor / SVG ← injected as CSS variables (see cssVars.ts)
 *    • Three.js globe + shaders      ← imported directly as numbers/hex
 *
 *  Rule of thumb: NO component should hard-code a hex color, a duration, or a
 *  z-index. Pull it from here. If you find yourself typing "#" in a component,
 *  add a token instead.
 *
 *  Palette source: TDD v1.0 — Chapter 07 (Visual Design Language).
 *  This file is plain data with zero imports so it is safe to load from both
 *  the Node build tooling (Tailwind) and the browser runtime.
 */

/* --------------------------------------------------------------------------
 * 1. COLOR
 * ------------------------------------------------------------------------ */
export const color = {
  // Backgrounds
  navy: '#0D1B2A', // primary bg — ocean, panel backgrounds
  steel: '#1B3A5C', // secondary bg — section/table headers, active states
  ink: '#1A1A2E', // deepest — modal scrim base
  codeDark: '#1E293B', // code/data block backgrounds

  // Accents
  teal: '#0F5F5F', // tertiary — sub-sections, borders, progress
  gold: '#B8860B', // primary accent — highlights, hover, critical labels
  goldLight: '#C8A040', // gold text on dark
  crimson: '#9B2335', // war/critical/hostile

  // Severity (notifications & status)
  info: '#C8A040', // gold
  warning: '#D98324', // orange
  high: '#C0392B', // red
  critical: '#9B2335', // crimson

  // Text
  white: '#FFFFFF',
  offWhite: '#F0F4F8',
  slate: '#6B7A8D', // secondary text, metadata, timestamps
  codeBlue: '#7DD3FC', // monospace data readouts

  // Diplomatic spectrum endpoints (for the alignment overlay ramp)
  ally: '#2E9E5B', // deep green (+100)
  enemy: '#C0392B', // deep red (-100)
  neutralGrey: '#4A5A6A',
} as const;

/* --------------------------------------------------------------------------
 * 2. TYPOGRAPHY
 * ------------------------------------------------------------------------ */
export const font = {
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  /** Display serif — the wordmark, panel titles, nation headings. Roman
   *  lapidary capitals give the HUD its "engraved bronze plaque" voice. */
  display: "'Cinzel', 'Times New Roman', serif",
  /** Cartographic serif — map labels (cities, capitals), lore text. */
  serif: "'EB Garamond', Georgia, serif",
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

/* --------------------------------------------------------------------------
 * 3. SPACING / RADIUS / BORDER  (kept on a small, predictable scale)
 * ------------------------------------------------------------------------ */
export const radius = {
  sm: '4px', // buttons
  md: '8px', // panels
  lg: '12px',
  full: '9999px',
} as const;

export const border = {
  hairline: '0.5px',
  thin: '1px',
} as const;

/* --------------------------------------------------------------------------
 * 4. MOTION  (the "feel" system — every animation pulls timing from here)
 * ------------------------------------------------------------------------ */
export const motion = {
  duration: {
    instant: 0.08,
    fast: 0.16, // hovers, tooltips
    base: 0.24, // panels in/out
    slow: 0.32, // overlay color cross-fade
    slower: 0.5,
  },
  /** CSS/easing cubic-beziers — keep linear OUT of the UI; everything eases.
   *  Mutable 4-tuples so they're assignable to framer-motion's `Easing`. */
  ease: {
    out: [0.16, 1, 0.3, 1] as [number, number, number, number], // expo-out (default)
    inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
    backOut: [0.34, 1.56, 0.64, 1] as [number, number, number, number], // springy pop
  },
  /** Framer-motion spring presets ('spring' kept as a literal for the type). */
  spring: {
    soft: { type: 'spring' as const, stiffness: 260, damping: 26 },
    snappy: { type: 'spring' as const, stiffness: 420, damping: 32 },
  },
} as const;

/* --------------------------------------------------------------------------
 * 5. ELEVATION (z-index) — one ladder so layers never fight
 * ------------------------------------------------------------------------ */
export const z = {
  globe: 0,
  mapLabels: 10,
  hud: 20,
  tooltip: 30,
  panel: 40,
  toast: 50,
  modal: 60,
  cursor: 9999, // custom cursor always on top
} as const;

/* --------------------------------------------------------------------------
 * 6. SHADOW
 * ------------------------------------------------------------------------ */
export const shadow = {
  panel: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
  toast: '0 6px 24px rgba(0,0,0,0.5)',
  glow: `0 0 16px ${color.gold}55`,
} as const;

/* --------------------------------------------------------------------------
 * 7. MAP VISUALS  (the renderer's single source of truth — every shader knob)
 * ------------------------------------------------------------------------
 *  All numbers here feed the WebGL map (fills, ocean, glow, post-FX). Change a
 *  value and the look shifts everywhere; no shader hard-codes a constant. Tuned
 *  for an "expensive grand-strategy" look: constrained palette, atmospheric
 *  ocean, soft coastline glow, cinematic grade. (GPU: RTX 5050 — see DECISIONS.)
 */
export const mapViz = {
  /** Political fills: pull toward one cohesive painting (kills "Skittles"). */
  fill: {
    saturation: 0.82, // keep this fraction of each fill's chroma (lower = greyer)
    tone: '#6b6f4e', // unifying olive every fill is nudged toward
    toneAmount: 0.14, // 0..1 how far to rotate toward the tone
    tintFloor: 0.26, // residual political tint left when terrain is revealed
    /** Hover: a soft lift, not a white flash. */
    hoverTintAmount: 0.14, // how far the hovered province mixes toward white
    hoverBrighten: 1.06, // brightness lift under the cursor
    /** Selection: a steady gold wash with a slow breath (no extrusion) while
     *  the rest of the world recedes slightly — quiet focus, not a beacon. */
    selectWash: 0.24, // steady mix toward the selection gold
    selectPulse: 0.1, // breathing amplitude on top of the wash
    selectBrighten: 1.09, // brightness lift on the selected province
    dimOthers: 0.93, // non-selected fills darken to this while something is selected
  },
  /** Ocean: atmospheric water with a depth gradient, layered drifting waves and a
   *  travelling sun-glint so the sea reads as a living surface, not a flat fill. */
  ocean: {
    shallow: '#16435f', // near coasts (lighter, more alive)
    deep: '#081a2c', // open ocean (deep, slightly richer blue)
    glow: '#6fb0d6', // coastline + glint halo color
    glowStrength: 0.5, // halo intensity
    glowWidth: 1.6, // halo falloff (higher = tighter to the coast)
    shimmer: 0.035, // animated wave contrast amount (subtle — fine sheen, not blotches)
    flowSpeed: 0.05, // how fast the waves drift
    glint: 0.16, // travelling sun-glint specular strength
    /** Coastal pulse (driven by the ETL's shore.jpg distance-to-coast field):
     *  shelf water lightens, shimmers and sparkles like the rivers feeding it,
     *  with a slow surf breath rolling along the shoreline. */
    shore: {
      shimmerBoost: 2.0, // extra wave contrast at the coast (× base shimmer)
      glintBoost: 2.6, // extra travelling sparkle at the coast (× base glint)
      colorLift: 0.42, // how far shelf water lifts toward the shallow tone
      pulse: 0.1, // slow surf-breathing amplitude along the coastline
    },
  },
  /** Lakes & inland seas: shaded, gently flowing water (NOT flat dark holes).
   *  Rendered a touch lighter than the ocean so they read as freshwater bodies. */
  lake: {
    deep: '#123a55',
    shallow: '#1d5573',
    glow: '#73b6d4',
    shimmer: 0.05,
    flowSpeed: 0.05,
    glint: 0.4, // travelling-sparkle strength (same cadence as the rivers)
  },
  /** Border hierarchy: coast hard, international receding, province faintest. */
  border: {
    coast: '#0a1822', // thin dark line where land meets sea
    intl: '#070b11', // national outline
    intlOpacity: 0.85,
    internalOpacity: 0.34, // district borders, on zoom-in
    maritime: '#3f6173', // EEZ / territorial-water boundaries — very subtle
    maritimeOpacity: 0.12,
  },
  /** Maritime zones (EEZ) — a faint owner tint over coastal waters. Kept low so
   *  the Voronoi sea cells don't read as a blocky "patchwork" over open ocean. */
  sea: {
    tintOpacity: 0.09,
  },
  /** Quality tiers, auto-selected from the detected GPU (see quality.ts). The
   *  full pipeline is gorgeous but fragment-heavy; integrated GPUs get a lighter
   *  pass. A discrete GPU (RTX/Radeon/Apple) unlocks the works. */
  quality: {
    high: { pixelRatio: 2, maskScale: 0.5, blurPasses: 2, oceanIters: 6 },
    low: { pixelRatio: 1, maskScale: 0.4, blurPasses: 1, oceanIters: 4 },
  },
  /** Rivers — real tapered ribbons on the globe (not uniform lines). Each river
   *  carries a 0..1 importance grade from the source data; width scales with it
   *  in REAL kilometres, so trunk rivers read wide and tributaries fine. The
   *  palette is pulled straight from the ocean/lake family so rivers read as
   *  the same water as the seas they feed — dark channels, not glacial neon. */
  river: {
    core: '#1d5573', // centreline — lake.shallow (the lightest water on the map)
    mid: '#16435f', // main channel — ocean.shallow
    bank: '#081a2c', // shadowed banks — ocean.deep
    glint: '#6fb0d6', // travelling sparkle — ocean.glow, toned down
    widthKm: 5.0, // full width of an importance-1.0 trunk river (km)
    widthMinKm: 0.5, // width of an importance-0 tributary (km)
    widthPow: 1.5, // grade curve between the two
    taperKm: 45, // ends of each polyline taper in over ~this many km
    widthBoostFar: 6.0, // widths are boosted this × when zoomed out (readability)
    flowSpeed: 3.0, // downstream drift of the shimmer (km/s of game-view)
    opacity: 0.95,
    // Zoom fade-in [start, full] in zoom01 — importance-1 rivers appear early,
    // hairline tributaries only up close. Interpolated per river.
    fadeMajor: [0.08, 0.32] as const,
    fadeMinor: [0.42, 0.7] as const,
  },
  /** Cities are PROVINCES now, not dots: the capital's province glows gold, big
   *  city provinces get a warm urban lift, towns a whisper — each revealed at
   *  its own zoom band (see GLOBE.capitalReveal / cityReveal / townReveal). */
  city: {
    capital: color.gold, // capital province tint
    capitalStrength: 0.6, // how far the province blends toward gold
    major: '#d9c69b', // metropolis province tint (warm limestone)
    majorStrength: 0.4,
    town: '#cbbfa2', // town province tint
    townStrength: 0.14,
    majorMinPop: 750_000, // population gate for the "major city" class
    townMinPop: 100_000, // towns below this get a label but no province tint
    labelCapital: color.goldLight,
    labelCity: '#f2ead8',
    labelTown: '#c8cdd4',
  },
  /** Shaded-relief 3D terrain (revealed on zoom). Hillshade from an elevation
   *  heightmap modulates the colour so mountains read as raised; shadows are
   *  pushed cool and lit slopes warm so the relief feels painted, not stamped. */
  terrain: {
    lightAz: 315, // sun azimuth in degrees (NW — the classic cartographic light)
    lightAlt: 42, // sun altitude in degrees
    relief: 1.0, // hillshade strength (0 = flat satellite, 1 = full relief)
    exaggeration: 4.2, // vertical exaggeration of slopes (GEBCO 5 km/px is gentle)
    ambient: 0.42, // shadow floor so valleys aren't crushed to black
    shadowTint: '#8fa3c4', // hillshade shadows lean cool
    lightTint: '#fff3dd', // lit slopes lean warm
    snow: '#e9eef3', // high-elevation tint blended in
    snowStart: 0.38, // elevation (0..1) where snow begins — Alps ≈ 0.40, Everest 0.82 (GEBCO scale)
    /** Civ-6 style province character: when zoomed in, each province blends
     *  from its political colour toward its terrain-type colour (world.json
     *  carries 16 elevation/latitude-derived types), with fine procedural
     *  grain so big provinces don't read as flat plastic. */
    mix: 0.8, // how far fills rotate toward terrain colour at full reveal
    grain: 0.09, // procedural detail amplitude
    /** Arid types deliberately stay in the tan family (no green blobs in the
     *  Sahara); greens are reserved for genuinely temperate/tropical types. */
    palette: {
      GRASSLAND: '#5c7a44',
      PLAINS: '#8f8f5c',
      STEPPE: '#a3905e',
      SAVANNA: '#909448', // dry olive — greener than steppe, drier than grassland
      DESERT: '#cdb47e',
      FOREST: '#3f5e3d',
      RAINFOREST: '#2f5638',
      TAIGA: '#3e5349',
      TUNDRA: '#7e8678',
      POLAR: '#dfe6ea',
      SWAMP: '#4a5c46',
      WETLAND: '#4f6757',
      MANGROVE: '#406052',
      MOUNTAINS: '#8d8577',
      HIGHLANDS: '#8a8266',
      HILLS: '#767b53',
      ALPINE: '#c8cdca',
      OCEAN: '#123048',
    } as Record<string, string>,
  },
  /** Resource cartography — colours for the Resource overlay + UI chips.
   *  One colour per resource id (catalogue in resourceCatalog.json); hues are
   *  grouped by family so the map reads at a glance: agriculture = greens and
   *  harvest golds, fuel = dark carbons and blues, industrial = metal tones,
   *  strategic = jewel tones. `none` fills resource-less provinces. */
  resources: {
    none: '#333a41',
    category: {
      FUEL: '#5d6c7e',
      AGRICULTURE: '#6f8a4f',
      INDUSTRIAL: '#a2755a',
      STRATEGIC: '#9a6fb8',
    } as Record<string, string>,
    palette: {
      coal: '#4e5359',
      oil: '#3c3644',
      gas: '#9db4e8',
      uranium: '#b3e04e',
      wheat: '#cbb27a',
      rice: '#9fbf7a',
      maize: '#c9a227',
      livestock: '#a97e4f',
      fish: '#4f88a8',
      timber: '#4f7a4a',
      cotton: '#e3e0d1',
      coffee: '#6f4e37',
      cocoa: '#8b5a2b',
      sugar: '#d8a7b1',
      tea: '#7fa35c',
      rubber: '#556b52',
      iron: '#963c2e',
      copper: '#cc7a3b',
      bauxite: '#b8695a',
      nickel: '#9aa3ad',
      zinc: '#7c8aa0',
      tin: '#c0c4c9',
      phosphate: '#d6cf9a',
      gold: '#e8c547',
      gems: '#c04f7f',
      rare_earths: '#8e5bc0',
      lithium: '#b57edc',
      cobalt: '#3d5fc4',
      titanium: '#8892b0',
    } as Record<string, string>,
  },
  /** Diplomacy visuals: bloc colours for the Coalition overlay (keys match
   *  blocs.json ids) + the unrest bar ramp (sim/unrest.unrestBand). */
  diplomacy: {
    blocs: {
      NATO: '#3f6ea8',
      EU: '#4a5fa8',
      FIVE_EYES: '#3e8a8a',
      GCC: '#8a7a3e',
      CSTO: '#a04438',
      ASEAN: '#5a8a5a',
      BRICS: '#a8763f',
      ARAB_LEAGUE: '#6f8a4f',
    } as Record<string, string>,
    nonAligned: '#3d4854',
    unrest: {
      calm: '#4f7a4a',
      uneasy: '#c9a227',
      volatile: '#d98324',
      critical: '#9B2335',
    } as Record<string, string>,
  },
  /** 3D globe — the atmosphere rim shell around the planet (see GlobeScene). */
  globe: {
    atmosphere: '#6fb4e8', // rim halo colour (cool sky blue)
    atmosphereStrength: 0.9, // additive intensity at the limb
  },
  /** Final cinematic grade applied in the composite pass. */
  post: {
    space: '#05090f', // backdrop outside the map oval (the composite is opaque)
    vignette: 0.42, // edge darkening (0 = none)
    grain: 0.0, // animated film grain — OFF (read as distracting static)
    gradeShadow: '#0b1a26', // shadows pushed cooler
    gradeHighlight: '#f4ecdc', // highlights pushed warmer
    gradeStrength: 0.1,
  },
} as const;

/** Convenience flat export of everything for the CSS-variable injector. */
export const tokens = { color, font, fontWeight, radius, border, motion, z, shadow, mapViz } as const;
export type Tokens = typeof tokens;
