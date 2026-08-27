/**
 * ============================================================================
 *  AETHERION — GAME CONFIG  (all tunable simulation/runtime constants)
 * ============================================================================
 *  Non-visual knobs live here (visuals are in tokens.ts). Camera feel, tick
 *  cadence, the campaign start date, data paths — change them in ONE place.
 */

/** Where the ETL writes its artifacts (served from /public). */
export const DATA = {
  world: '/data/world.json',
  map: {
    meta: '/data/map/map.json',
    cities: '/data/map/cities.json',
    fill: '/data/map/fill.bin',
    fillId: '/data/map/fill_id.bin',
    fillIdx: '/data/map/fill_idx.bin',
    fillBk: '/data/map/fill_bk.bin',
    fillBkId: '/data/map/fill_bk_id.bin',
    fillBkIdx: '/data/map/fill_bk_idx.bin',
    bordersInternal: '/data/map/borders_internal.bin',
    bordersInternalCol: '/data/map/borders_internal_col.bin',
    bordersIntl: '/data/map/borders_intl.bin',
    rivers: '/data/map/rivers2.bin',
    lakes: '/data/map/lakes.bin',
    lakesIdx: '/data/map/lakes_idx.bin',
    seaFill: '/data/map/sea_fill.bin',
    seaId: '/data/map/sea_id.bin',
    seaIdx: '/data/map/sea_idx.bin',
    seaBorders: '/data/map/sea_borders.bin',
    terrain: '/data/map/terrain.jpg',
    elevation: '/data/map/elevation.jpg',
    shore: '/data/map/shore.jpg',
    flags: '/data/flags',
  },
} as const;

/** The nation the player embodies in Phase 1 (drives the summary panel). */
export const PLAYER_NATION = 'PAK';

/** Campaign clock. Speeds scale the hours advanced per real second. */
export const SIM = {
  epoch: { year: 2026, month: 1, day: 1 },
  /** Hours of game time advanced per real-time second, indexed by SimSpeed. */
  hoursPerSecond: [0, 1, 3, 12] as const, // paused, 1x, 2x, 3x
  /** Worker wakes this often (ms); it accumulates fractional hours between. */
  stepMs: 100,
  /** Fallback treasury only — a real campaign seeds a nation-specific starting
   *  treasury from the economy model (sim/nationLedger.startingTreasuryFor), and
   *  the treasury then drifts at the nation's net balance (revenue − spending).
   *  See config/economy.ts for the fiscal ruleset. */
  startingTreasury: 250_000_000_000, // $250B
} as const;

/** Flat 2D map camera feel (Equal Earth projected space). */
export const MAP = {
  /** Extra framing around the map bounds at startup (1 = tight fit). */
  fitPadding: 1.08,
  minZoom: 0.9, // can't zoom out past the whole map much
  maxZoom: 1500, // extreme deep zoom (street level); vector stays crisp
  /** Damping for pan + zoom inertia (0..1 per frame; higher = snappier). */
  panDamping: 0.18,
  zoomDamping: 0.16,
  wheelZoomStep: 1.12, // multiplier per wheel notch
  /** Zoom range over which terrain fades in, fills become a tint, and internal
   *  (district) borders appear. Below `start`: clean political map. */
  reveal: { start: 5, end: 22 },
  /** Zoom range over which city structures + labels fade in (hidden when out). */
  cityReveal: { start: 7, end: 16 },
  /** Min zoom and a per-zoom population gate for showing city name labels. */
  labelZoom: 11,
  /** Equal-Earth horizontal period (2 × equator half-width) for the wrap. */
  worldPeriod: 5.4126,
} as const;

/** 3D globe camera + reveals (the live renderer; see GlobeScene). Distances are
 *  in globe radii (GLOBE_R = 1). Reveals are keyed on camera ALTITUDE above the
 *  surface (= distance − 1): larger = farther out. `start` > `end` because
 *  zooming IN lowers the altitude. */
export const GLOBE = {
  fov: 38, // vertical field of view (degrees)
  minDist: 1.02, // closest dolly (≈ street level — perspective flattens the view)
  maxDist: 3.4, // farthest dolly (whole globe framed with margin)
  maxLat: 1.45, // clamp camera latitude (~83°) so it never flips over a pole
  damping: 0.16, // orbit + dolly inertia (per-frame, higher = snappier)
  wheelZoomStep: 1.1, // dolly multiplier per wheel notch
  /** Altitude band over which shaded relief + terrain character fade in and
   *  district borders appear. */
  reliefReveal: { start: 0.95, end: 0.22 },
  /** City-province reveal ladder (cities colour their WHOLE province): the
   *  capital glows gold from far out, metropolises appear closer, towns only
   *  near the ground. Labels follow the same bands. The Sovereignty view is
   *  DEFINED by these tints (it shows no terrain colours), so they arrive
   *  early and generously. */
  capitalReveal: { start: 2.2, end: 1.2 },
  cityReveal: { start: 0.9, end: 0.45 },
  townReveal: { start: 0.28, end: 0.12 },
  /** Render-on-demand: when nothing is moving (camera settled, no drag, no
   *  overlay fade, no recent interaction) the multi-pass render drops to the
   *  ambient fps — the ocean keeps breathing but the iGPU idles. Any activity
   *  snaps back to full frame rate instantly. */
  idle: {
    fps: 12, // ambient cadence while idle
    graceMs: 500, // stay at full rate this long after the last interaction
  },
} as const;

/** Hover/pick throttling so the CPU pick + store write don't run every pixel. */
export const PICK = {
  throttleMs: 16,
} as const;
