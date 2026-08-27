/**
 * BUILD-MAP — Equal-Earth VECTOR map with the full data model.
 *
 *   • Provinces: geoBoundaries ADM2 + Natural Earth admin-0 FILL (no country
 *     lost — ~280 nations, ~49k provinces).
 *   • Colors: DARK + flag-relevant + adjacency-aware so neighbouring countries
 *     never share a colour (greedy graph colouring biased to each flag's hue).
 *   • Populations: real country totals (NE POP_EST) distributed across EVERY
 *     province by equal-area + city weighting. Cities themselves are now just
 *     UI landmarks; province carries the population.
 *   • Borders: internal (district↔district) + international (national outlines).
 *   • Rivers: bucketed major/minor by importance.
 *   • Data dictionary: extensible per-nation and per-province `data`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import earcut from 'earcut';
import { PATHS, SOURCES, SCOPE, CITY_MIN_POP } from './config.mjs';
import { readJson, writeJson, log, prop, centroidOf } from './lib/util.mjs';
import { equalEarth } from './lib/projection.mjs';
import { F32, U32 } from './lib/buffers.mjs';
import { smoothMosaic, smoothOpenLine } from './lib/smooth.mjs';
import { emitSubdividedTris } from './lib/subdivide.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATELINE_SPAN = 170;

// HARD-CODED nation colours (keyed by ADM0_A3 = nation code) — the single source
// of truth for the political palette, so the map always looks identical. Any
// nation NOT listed here (junk numeric placeholders) falls back to the
// algorithmic flag/adjacency colouring below.
const HARDCODED_COLORS = readJson(path.join(__dirname, 'country-colors.json'));

/* -------------------------------------------------------------------------- */
/*  Load provinces (districts + fill) keeping every country                    */
/* -------------------------------------------------------------------------- */
function nationLookup(admin0) {
  const m = new Map();
  for (const f of admin0.features) {
    const code = prop(f.properties, 'ADM0_A3', 'adm0_a3');
    if (!code) continue;
    m.set(code, {
      name: prop(f.properties, 'ADMIN', 'NAME', 'name') || code,
      pop: prop(f.properties, 'POP_EST', 'pop_est') || 0,
      geometry: f.geometry,
    });
  }
  return m;
}

/** geoBoundaries ships placeholder names for disputed ground — don't let the
 *  tooltip say "DATA NOT AVAILABLE" over Kashmir. */
const cleanName = (name) => {
  if (!name || /^data not available$/i.test(name.trim())) return 'Disputed Territory';
  return name;
};

/** Nations whose ADM2 mosaic covers less than this fraction of their real
 *  (admin-0) territory are broken at the source — Uruguay ships municipios
 *  that tile ~37% of the country, so most of it rendered as one giant
 *  backstop blob. Their districts are replaced by NE admin-1 units
 *  (departments/states), or the admin-0 fill when admin-1 has none. */
const ADM2_MIN_COVERAGE = 0.55;

function loadProvinces() {
  const admin0 = readJson(path.join(PATHS.cache, SOURCES.admin0.file));
  const nations = nationLookup(admin0);
  const adm2 = readJson(path.join(PATHS.cache, SOURCES.adm2.file));

  let districts = [];
  const haveDistricts = new Set();
  for (const f of adm2.features) {
    const code = f.properties.shapeGroup;
    if (!code || code === '-99') continue;
    haveDistricts.add(code);
    districts.push({ nationCode: code, name: cleanName(f.properties.shapeName), geometry: f.geometry });
  }

  // -- replace sparse-coverage nations (see ADM2_MIN_COVERAGE) --------------
  const areaByNation = new Map();
  for (const d of districts)
    areaByNation.set(d.nationCode, (areaByNation.get(d.nationCode) || 0) + provinceArea(d.geometry));
  const replaced = new Set();
  for (const [code, da] of areaByNation) {
    const g = nations.get(code)?.geometry;
    if (!g) continue;
    const na = provinceArea(g);
    if (na > 0.00005 && da / na < ADM2_MIN_COVERAGE) replaced.add(code);
  }
  if (replaced.size) {
    districts = districts.filter((d) => !replaced.has(d.nationCode));
    const admin1 = tryRead(SOURCES.admin1.file);
    for (const code of replaced) {
      const feats = admin1
        ? admin1.features.filter((f) => prop(f.properties, 'adm0_a3', 'ADM0_A3') === code)
        : [];
      if (feats.length) {
        for (const f of feats)
          districts.push({ nationCode: code, name: prop(f.properties, 'name', 'NAME') || 'Unnamed', geometry: f.geometry });
        log.info(`sparse ADM2 coverage: ${code} rebuilt from ${feats.length} NE admin-1 units`);
      } else {
        haveDistricts.delete(code); // fall through to the admin-0 fill below
        log.info(`sparse ADM2 coverage: ${code} falls back to its admin-0 fill`);
      }
    }
  }

  const fills = [];
  for (const [code, n] of nations) {
    if (haveDistricts.has(code) || !n.geometry) continue;
    fills.push({ nationCode: code, name: n.name, geometry: n.geometry });
  }

  // De-overlap admin-0 FILLS vs districts that cover the same ground:
  //  • A fill over ANOTHER nation's territory (Northern Cyprus over Cyprus's
  //    northern districts, Palestine over Israeli districts) is a disputed claim
  //    → keep the fill, drop the overlapping districts (that nation survives via
  //    its other districts).
  //  • A fill that is just a redundant outline of a nation whose districts use a
  //    different code (Kosovo's NE "KOS" fill over its "XKX" districts) would
  //    erase the nation → keep the districts, drop the fill.
  const CELL = 4;
  const fkey = (cx, cy) => `${cx},${cy}`;
  const fillGrid = new Map();
  fills.forEach((f, i) => {
    const [mnx, mny, mxx, mxy] = bboxOf(f.geometry);
    for (let cx = Math.floor(mnx / CELL); cx <= Math.floor(mxx / CELL); cx++)
      for (let cy = Math.floor(mny / CELL); cy <= Math.floor(mxy / CELL); cy++)
        (fillGrid.get(fkey(cx, cy)) ?? fillGrid.set(fkey(cx, cy), []).get(fkey(cx, cy))).push(i);
  });
  // Which fill(s) each district sits inside.
  const containing = districts.map((d) => {
    const [clat, clng] = centroidOf(d.geometry);
    const cands = fillGrid.get(fkey(Math.floor(clng / CELL), Math.floor(clat / CELL)));
    const hits = [];
    if (cands) for (const i of cands) if (pointInGeometry([clng, clat], fills[i].geometry)) hits.push(i);
    return hits;
  });
  const byNation = new Map();
  districts.forEach((d, i) => (byNation.get(d.nationCode) ?? byNation.set(d.nationCode, []).get(d.nationCode)).push(i));
  const dropFill = new Set(), dropDist = new Set();
  const isReal = (code) => /^[A-Za-z]{2,3}$/.test(code); // ISO-like vs junk numeric
  // Nations entirely under a fill: if the nation has a REAL code (Kosovo=XKX)
  // keep its districts and drop the redundant fill; if it's a junk numeric code
  // (geoBoundaries disputed-area placeholders inside e.g. the Palestine fill)
  // drop those districts and keep the named fill instead.
  for (const [code, idxs] of byNation)
    if (idxs.every((i) => containing[i].length > 0)) {
      if (isReal(code)) for (const i of idxs) for (const fi of containing[i]) dropFill.add(fi);
      else for (const i of idxs) dropDist.add(i);
    }
  // Surviving nations → drop only their districts that lie inside a KEPT fill.
  for (const [, idxs] of byNation)
    if (idxs.some((i) => containing[i].length === 0))
      for (const i of idxs)
        if (containing[i].length && containing[i].some((fi) => !dropFill.has(fi))) dropDist.add(i);

  const keptDistricts = districts.filter((_, i) => !dropDist.has(i));
  const keptFills = fills.filter((_, i) => !dropFill.has(i));
  if (dropDist.size || dropFill.size)
    log.info(`de-overlap: dropped ${dropDist.size} disputed districts, ${dropFill.size} redundant fills`);

  const provinces = [...keptDistricts, ...keptFills];
  const filtered = provinces.filter((p) => !SCOPE.onlyNations || SCOPE.onlyNations.includes(p.nationCode));
  return { provinces: filtered, nations, filled: keptFills.length, replaced };
}

/* -------------------------------------------------------------------------- */
/*  Geometry helpers                                                           */
/* -------------------------------------------------------------------------- */
const eachPolygon = (geometry, fn) => {
  if (!geometry) return;
  if (geometry.type === 'Polygon') fn(geometry.coordinates);
  else if (geometry.type === 'MultiPolygon') for (const poly of geometry.coordinates) fn(poly);
};
function lngSpan(ring) {
  let mn = Infinity, mx = -Infinity;
  for (const p of ring) {
    if (p[0] < mn) mn = p[0];
    if (p[0] > mx) mx = p[0];
  }
  return mx - mn;
}
// Indexed fill: each polygon vertex is stored ONCE; triangles reference them via
// the index buffer. ~3× fewer vertices for the GPU to transform (key on iGPUs).
//
// MAX_TRI_EDGE: the runtime spherifies per-VERTEX, so a big triangle is a flat
// chord through the sphere; its middle sags below the opaque ocean shell
// (sagitta R·(1−cosθ) ≫ the ~0.0006R layer offset) and gets depth-occluded —
// the "ocean showing through the Sahara" holes. Subdividing until every edge is
// under ~1.7° of arc keeps the sag well inside the shell.
const MAX_TRI_EDGE = 0.025; // projected Equal-Earth units (~1.7° of arc)
function addFill(rings, id, fill, fillId, idx, bounds, solid = false) {
  if (lngSpan(rings[0]) > DATELINE_SPAN) return;
  // `solid` fills ignore interior rings (used for the nation BACKSTOP layer that
  // plugs the gaps between simplified district polygons — see emitBackstop).
  const useRings = solid ? [rings[0]] : rings;
  const base = fill.len / 2; // current vertex count
  const flat = [];
  const holes = [];
  let v = 0;
  useRings.forEach((ring, ri) => {
    if (ri > 0) holes.push(v);
    for (const [lng, lat] of ring) {
      const [x, y] = equalEarth(lng, lat);
      flat.push(x, y);
      fill.push2(x, y);
      fillId.push1(id);
      if (x < bounds.minX) bounds.minX = x;
      if (x > bounds.maxX) bounds.maxX = x;
      if (y < bounds.minY) bounds.minY = y;
      if (y > bounds.maxY) bounds.maxY = y;
      v++;
    }
  });
  const tris = earcut(flat, holes, 2);
  emitSubdividedTris(
    flat,
    tris,
    MAX_TRI_EDGE,
    (x, y) => {
      fill.push2(x, y);
      fillId.push1(id);
    },
    (a, b, c) => {
      idx.push1(base + a);
      idx.push1(base + b);
      idx.push1(base + c);
    },
  );
}
// `seen` (optional Set) dedupes shared edges: adjacent provinces trace the same
// polyline, so without it every internal border is emitted twice.
const edgeSeenKey = (a, b) => {
  const ka = `${Math.round(a[0] * 1e6)},${Math.round(a[1] * 1e6)}`;
  const kb = `${Math.round(b[0] * 1e6)},${Math.round(b[1] * 1e6)}`;
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};
function addBorderEdges(geometry, border, col, rgb, seen) {
  eachPolygon(geometry, (rings) => {
    if (lngSpan(rings[0]) > DATELINE_SPAN) return;
    for (const ring of rings) {
      const proj = ring.map(([lng, lat]) => equalEarth(lng, lat));
      for (let i = 0; i < proj.length; i++) {
        const a = proj[i], b = proj[(i + 1) % proj.length];
        if (seen) {
          const k = edgeSeenKey(a, b);
          if (seen.has(k)) continue;
          seen.add(k);
        }
        border.push2(a[0], a[1]);
        border.push2(b[0], b[1]);
        if (col) {
          col.push2(rgb[0], rgb[1]); col.push1(rgb[2]);
          col.push2(rgb[0], rgb[1]); col.push1(rgb[2]);
        }
      }
    }
  });
}
const hexToRgb01 = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}
function provinceArea(geometry) {
  let area = 0;
  eachPolygon(geometry, (rings) => {
    const proj = rings.map((r) => r.map(([lng, lat]) => equalEarth(lng, lat)));
    area += ringArea(proj[0]);
    for (let h = 1; h < proj.length; h++) area -= ringArea(proj[h]);
  });
  return Math.max(area, 1e-7);
}

/* -------------------------------------------------------------------------- */
/*  Nation adjacency (shared district edges) → graph colouring                 */
/* -------------------------------------------------------------------------- */
function buildAdjacency(provinces) {
  const edge = new Map();
  const adj = new Map();
  const link = (a, b) => {
    if (a === b) return;
    (adj.get(a) ?? adj.set(a, new Set()).get(a)).add(b);
    (adj.get(b) ?? adj.set(b, new Set()).get(b)).add(a);
  };
  for (const p of provinces) {
    eachPolygon(p.geometry, (rings) => {
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], b = ring[(i + 1) % ring.length];
          const ka = `${Math.round(a[0] * 1000)},${Math.round(a[1] * 1000)}`;
          const kb = `${Math.round(b[0] * 1000)},${Math.round(b[1] * 1000)}`;
          const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
          const seen = edge.get(key);
          if (seen === undefined) edge.set(key, p.nationCode);
          else if (seen !== p.nationCode) link(seen, p.nationCode);
        }
      }
    });
  }
  return adj;
}

function hslRgb(h, s, l) {
  h /= 360;
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const dist = (a, b) => {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db; // weighted toward green/blue
};

// Colour search space: a constrained "expensive grand-strategy" band (muted,
// mid-dark) but wide enough to fit ~280 distinct nations.
const HUE_OFFSETS = [0, -10, 10, -20, 20, -32, 32, -46, 46, -62, 62, -82, 82, -106, 106, -134, 134, 165, -165, 180];
const SATS = [0.26, 0.34, 0.42, 0.50, 0.58];
const LIGHTS = [0.28, 0.36, 0.44, 0.52, 0.60];
const FLAG_WEIGHT = 110;   // pull toward the flag hue (soft anchor)
const NEIGHBOUR_BONUS = 2.4; // neighbours must be EXTRA distinct
const DMAX = 585225;       // max weighted rgb distance (first-pick seed)

// Globally-unique, flag-derived nation colours. Greedy farthest-point placement:
// each nation takes the colour MAX-distant from every colour already chosen
// (not just its neighbours), anchored near its flag's hue. So no two countries
// anywhere share a colour, neighbours differ strongly, and the palette still
// reads as flag-inspired — robust as borders change in later phases.
function colourize(nationList, adj, hueOf) {
  const order = [...nationList].sort(
    (a, b) => (adj.get(b.code)?.size || 0) - (adj.get(a.code)?.size || 0),
  );
  const out = new Map(); // code -> { hex, rgb }
  const chosen = []; // every rgb chosen so far (global distinctness)
  const usedHex = new Set();
  // 1. Lock in the hard-coded colours first. These are authoritative and never
  //    altered; the algorithm below only fills nations missing from the list,
  //    avoiding any colour already taken here.
  for (const n of order) {
    const hex = HARDCODED_COLORS[n.code];
    if (!hex) continue;
    const rgb = hexToRgb01(hex).map((c) => c * 255);
    out.set(n.code, { hex, rgb });
    chosen.push(rgb);
    usedHex.add(hex);
  }
  // 2. Algorithmic fallback for any remaining (unlisted) nation.
  order.filter((n) => !out.has(n.code)).forEach((n, idx) => {
    const baseHue = hueOf(n.code) ?? (idx * 47.5) % 360; // grayscale flags → spread hue
    const neighbours = [...(adj.get(n.code) || [])].map((c) => out.get(c)).filter(Boolean);
    let best = null, bestScore = -Infinity;
    for (const dh of HUE_OFFSETS) {
      const hue = (baseHue + dh + 360) % 360;
      for (const s of SATS) for (const l of LIGHTS) {
        const rgb = hslRgb(hue, s, l);
        let gMin = DMAX;
        for (const c of chosen) { const d = dist(rgb, c); if (d < gMin) gMin = d; }
        let nMin = Infinity;
        for (const nb of neighbours) { const d = dist(rgb, nb.rgb); if (d < nMin) nMin = d; }
        const nTerm = isFinite(nMin) ? nMin * NEIGHBOUR_BONUS : 0;
        const score = gMin + nTerm - Math.abs(dh) * FLAG_WEIGHT;
        if (score > bestScore) { bestScore = score; best = rgb; }
      }
    }
    chosen.push(best);
    out.set(n.code, { hex: toHex(best), rgb: best });
  });
  // Guarantee every FALLBACK country is a unique hex — nudge channels
  // imperceptibly until no two share a colour. Hard-coded colours are already in
  // `usedHex` and are left exactly as authored.
  for (const n of order) {
    if (HARDCODED_COLORS[n.code]) continue; // authoritative — never touch
    const rgb = out.get(n.code).rgb.slice();
    let hex = toHex(rgb), k = 0;
    while (usedHex.has(hex)) {
      const ch = k % 3;
      rgb[ch] = Math.max(8, Math.min(247, rgb[ch] + (k % 2 ? 2 : -2)));
      hex = toHex(rgb); k++;
    }
    usedHex.add(hex);
    out.set(n.code, { hex, rgb });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Hydrography + cities (cities = UI landmarks only)                          */
/* -------------------------------------------------------------------------- */
function riverImportance(props) {
  const sw = prop(props, 'strokeweig', 'strokeweight');
  if (sw != null && isFinite(sw)) return Math.max(0.06, Math.min(1, sw));
  const sr = prop(props, 'scalerank') ?? 9;
  return Math.max(0.06, Math.min(1, (11 - sr) / 10));
}
/**
 * rivers2.bin — smoothed river polylines with a continuous importance grade
 * (0..1, from NE strokeweig/scalerank). The runtime extrudes each polyline into
 * a tapered ribbon whose real width scales with importance, so rivers read as
 * natural watercourses instead of uniform lines.
 *   Float32 stream, per polyline: [nPts, importance, x0,y0, x1,y1, ...]
 */
function buildRivers() {
  const out = new F32(1 << 20);
  const fc = tryRead(SOURCES.rivers.file);
  if (!fc) return out;
  let lines = 0, pts = 0;
  for (const f of fc.features) {
    const imp = riverImportance(f.properties);
    const geoms = f.geometry?.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry?.coordinates];
    for (const line of geoms) {
      if (!line || line.length < 2) continue;
      // Split at dateline jumps, smooth each run, project.
      let start = 0;
      for (let i = 1; i <= line.length; i++) {
        if (i < line.length && Math.abs(line[i][0] - line[i - 1][0]) <= 180) continue;
        const seg = line.slice(start, i);
        start = i;
        if (seg.length < 2) continue;
        const sm = smoothOpenLine(seg, 2);
        out.push2(sm.length, imp);
        for (const [lng, lat] of sm) {
          const [x, y] = equalEarth(lng, lat);
          out.push2(x, y);
        }
        lines++;
        pts += sm.length;
      }
    }
  }
  log.ok(`rivers: ${lines} polylines, ${pts} points (graded + smoothed)`);
  return out;
}
function buildLakes() {
  const fill = new F32();
  const idx = new U32();
  const fc = tryRead(SOURCES.lakes.file);
  if (!fc) return { fill, idx };
  const id = new F32();
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const f of fc.features) eachPolygon(f.geometry, (rings) => addFill(rings, 0, fill, id, idx, bounds));
  return { fill, idx };
}
function loadCities() {
  const fc = tryRead(SOURCES.cities.file);
  if (!fc) return [];
  const cities = [];
  for (const f of fc.features) {
    const pop = prop(f.properties, 'POP_MAX', 'pop_max') || 0;
    if (pop < CITY_MIN_POP) continue;
    const [lng, lat] = f.geometry.coordinates;
    cities.push({
      name: prop(f.properties, 'NAME', 'name') || '',
      lng, lat, pop,
      cap: prop(f.properties, 'ADM0CAP', 'adm0cap') ? 1 : 0,
      rank: prop(f.properties, 'SCALERANK', 'scalerank') ?? 10,
      // The nation NE says this city belongs to — authoritative when the point
      // falls in the wrong polygon (Monaco inside Alpes-Maritimes, Nicosia
      // inside the UN buffer strip) or in none (harbour cities pushed to sea
      // by simplification: Algiers, Lisbon, Stockholm…).
      a3: prop(f.properties, 'ADM0_A3', 'adm0_a3') || null,
    });
  }
  cities.sort((a, b) => b.pop - a.pop);
  return cities;
}

/* ---- city → province (grid-accelerated point-in-polygon) ----------------- */
function bboxOf(geometry) {
  let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
  eachPolygon(geometry, (rings) => {
    for (const [x, y] of rings[0]) {
      if (x < mnx) mnx = x;
      if (x > mxx) mxx = x;
      if (y < mny) mny = y;
      if (y > mxy) mxy = y;
    }
  });
  return [mnx, mny, mxx, mxy];
}
function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function pointInGeometry(pt, geometry) {
  let hit = false;
  eachPolygon(geometry, (rings) => {
    if (!hit && pointInRing(pt, rings[0])) hit = true;
  });
  return hit;
}
function assignCities(cities, provinces) {
  const CELL = 4;
  const key = (cx, cy) => `${cx},${cy}`;
  const grid = new Map();
  provinces.forEach((p, idx) => {
    const [mnx, mny, mxx, mxy] = bboxOf(p.geometry);
    for (let cx = Math.floor(mnx / CELL); cx <= Math.floor(mxx / CELL); cx++)
      for (let cy = Math.floor(mny / CELL); cy <= Math.floor(mxy / CELL); cy++)
        (grid.get(key(cx, cy)) ?? grid.set(key(cx, cy), []).get(key(cx, cy))).push(idx);
  });

  const areaCache = new Map();
  const areaOf = (i) => {
    let a = areaCache.get(i);
    if (a == null) areaCache.set(i, (a = provinceArea(provinces[i].geometry)));
    return a;
  };
  const centCache = new Map();
  const centOf = (i) => {
    let c = centCache.get(i);
    if (c == null) {
      const [clat, clng] = centroidOf(provinces[i].geometry);
      centCache.set(i, (c = [clng, clat]));
    }
    return c;
  };
  const smallest = (arr) => arr.reduce((b, i) => (areaOf(i) < areaOf(b) ? i : b));

  let moved = 0, rescued = 0;
  for (const c of cities) {
    const gx = Math.floor(c.lng / CELL), gy = Math.floor(c.lat / CELL);
    const cands = new Set();
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const idx of grid.get(key(gx + dx, gy + dy)) || []) cands.add(idx);
    if (!cands.size) continue;

    const cl = Math.cos((c.lat * Math.PI) / 180);
    const nearest = (arr, maxDeg) => {
      let best = null, bestD = maxDeg * maxDeg;
      for (const i of arr) {
        const [plng, plat] = centOf(i);
        const dl = (plng - c.lng) * cl, db = plat - c.lat;
        const d = dl * dl + db * db;
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    };
    const containing = [...cands].filter((i) => pointInGeometry([c.lng, c.lat], provinces[i].geometry));
    const own = (arr) => arr.filter((i) => c.a3 && provinces[i].nationCode === c.a3);

    // Assignment ladder — NE's ADM0_A3 outranks a raw point-in-polygon hit:
    //  1. inside one of its own nation's provinces (smallest = the city district);
    //  2. its nation is right next door → the point strayed across a simplified
    //     boundary (Monaco in Alpes-Maritimes, Nicosia in the UN buffer strip);
    //  3. genuinely inside a foreign province, home nowhere near → trust the polygon;
    //  4. inside nothing (harbours pushed offshore) → nearest, preferring home.
    const inOwn = own(containing);
    if (inOwn.length) { c.provinceIdx = smallest(inOwn); continue; }
    const nearOwn = nearest(own([...cands]), 1.2);
    if (nearOwn != null) { c.provinceIdx = nearOwn; if (containing.length) moved++; continue; }
    if (containing.length) { c.provinceIdx = smallest(containing); continue; }
    const near = nearest(own([...cands]), 3) ?? nearest([...cands], 3);
    if (near != null) { c.provinceIdx = near; rescued++; }
  }
  log.info(`cities: ${moved} re-homed across a boundary, ${rescued} rescued from open water`);
}

/* -------------------------------------------------------------------------- */
/*  Main                                                                        */
/* -------------------------------------------------------------------------- */
export function buildMap() {
  log.step('BUILD MAP — dark flag colours + real province populations');

  const { provinces: raw, nations: nationGeom, filled, replaced } = loadProvinces();
  const flagInfo = tryReadCache('flag-colors.json') || {};

  // Round the jagged simplification corners (crack-free — see lib/smooth.mjs).
  // Junction keys are exported so the dissolved-nations layer (international
  // borders + backstop) pins the same vertices and stays glued to the fills.
  log.info('smoothing province mosaic…');
  const pinKeys = new Set();
  const sm = smoothMosaic(raw, { iterations: 2, collectPinKeys: pinKeys });
  log.ok(`smoothed provinces: ${(sm.before / 1e6).toFixed(2)}M → ${(sm.after / 1e6).toFixed(2)}M ring vertices (${pinKeys.size} pinned junctions)`);

  // Nations. geoBoundaries' numeric placeholder codes (Aksai Chin's "112" etc.)
  // have no NE entry — give them a readable name instead of the raw number.
  const nations = new Map();
  for (const p of raw) if (!nations.has(p.nationCode))
    nations.set(p.nationCode, {
      code: p.nationCode,
      name: nationGeom.get(p.nationCode)?.name || (/^\d+$/.test(p.nationCode) ? 'Disputed Territory' : p.nationCode),
    });
  const nationList = [...nations.values()].sort((a, b) => a.code.localeCompare(b.code));

  // Adjacency-aware DARK flag colours
  log.info('building nation adjacency…');
  const adj = buildAdjacency(raw);
  const colour = colourize(nationList, adj, (code) => flagInfo[code]?.hue ?? null);
  nationList.forEach((n) => {
    n.color = colour.get(n.code)?.hex || '#3a4654';
    n.flag = flagInfo[n.code]?.iso2 || null;
  });
  const byCode = new Map(nationList.map((n) => [n.code, n]));
  log.ok(`${nationList.length} nations (${filled} filled), ${raw.length} provinces, coloured by flag+adjacency`);

  // Cities → provinces (used only to weight population now)
  const cities = loadCities();
  assignCities(cities, raw);
  const cityPop = new Float64Array(raw.length);
  cities.forEach((c) => {
    if (c.provinceIdx != null) cityPop[c.provinceIdx] += c.pop;
  });

  // Per-province area (Equal Earth is equal-area → area ∝ real area)
  const area = raw.map((p) => provinceArea(p.geometry));

  // Distribute each country's real population across its provinces
  const provIdxByNation = new Map();
  raw.forEach((p, i) => (provIdxByNation.get(p.nationCode) ?? provIdxByNation.set(p.nationCode, []).get(p.nationCode)).push(i));
  const population = new Float64Array(raw.length);
  for (const [code, idxs] of provIdxByNation) {
    const total = nationGeom.get(code)?.pop || sum(idxs.map((i) => cityPop[i])) * 1.4 || 0;
    const areaSum = sum(idxs.map((i) => area[i]));
    const citySum = sum(idxs.map((i) => cityPop[i]));
    for (const i of idxs) {
      const af = area[i] / areaSum;
      const cf = citySum > 0 ? cityPop[i] / citySum : af;
      population[i] = Math.round(total * (0.45 * af + 0.55 * cf));
    }
  }

  // Triangulate fills (indexed) + internal borders + province metadata/data
  const fill = new F32(1 << 20), fillId = new F32(1 << 19), fillIdx = new U32(1 << 20), internal = new F32(1 << 20);
  const internalCol = new F32(1 << 20); // darkened nation colour per internal-border vertex (blends)
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const provincesMeta = [];
  const t0 = Date.now();
  const internalSeen = new Set(); // dedupe shared district edges (emit once)
  raw.forEach((p, idx) => {
    const pid = idx + 1;
    eachPolygon(p.geometry, (rings) => addFill(rings, pid, fill, fillId, fillIdx, bounds));
    // Internal borders coloured a darkened shade of the country's own colour so
    // they recede into the fill instead of a uniform grey line.
    const nc = byCode.get(p.nationCode)?.color || '#3a4654';
    const rgb = hexToRgb01(nc).map((c) => c * 0.5);
    addBorderEdges(p.geometry, internal, internalCol, rgb, internalSeen);
    const [clat, clng] = centroidOf(p.geometry);
    const [cx, cy] = equalEarth(clng, clat);
    provincesMeta.push({
      id: pid,
      name: p.name,
      nationId: p.nationCode,
      color: byCode.get(p.nationCode)?.color,
      centroid: [round(cx), round(cy)],
      data: {
        terrain: 'PLAINS',
        population: population[idx],
        // Equal-Earth projected area (∝ real surface area, since the projection
        // is equal-area). Lets etl:res spread resource wealth by geographic SIZE
        // rather than province COUNT, so a nation cut into many tiny districts
        // isn't over-endowed vs. one with a few large provinces. 6 sig-figs keeps
        // precision across the ~1e-6..1e-2 range without bloating world.json.
        area: Number(area[idx].toPrecision(6)),
        // resourceOutput/resources/value are filled by etl:res (build-resources.mjs)
        economy: { gdp: Math.round(population[idx] * 4000), resourceOutput: 0 },
        resources: {},
        value: 0,
      },
    });
  });
  log.ok(`triangulated ${raw.length} provinces in ${Date.now() - t0}ms`);

  // International borders — the dissolved layer traces the same polylines as
  // the district rings, so it is smoothed with the SAME junction pins and its
  // curves land exactly on the smoothed fill edges.
  const intl = new F32(1 << 19);
  const dissolved = tryReadCache('geoBoundariesCGAZ_ADM2.nations.geojson');
  const inDissolved = new Set();
  const intlSeen = new Set(); // a border is shared by two nations — emit once
  // Replaced nations use their NE admin-0 outline for borders + backstop —
  // smooth it with the same pins so it lands on the smoothed admin-1 fills.
  if (replaced.size) {
    const wrappers = [...replaced]
      .map((code) => ({ geometry: nationGeom.get(code)?.geometry }))
      .filter((w) => w.geometry);
    smoothMosaic(wrappers, { iterations: 2, extraPinKeys: pinKeys });
  }
  if (dissolved) {
    smoothMosaic(dissolved.features, { iterations: 2, extraPinKeys: pinKeys });
    for (const f of dissolved.features) {
      // Replaced nations (sparse ADM2 — see loadProvinces) must not use the
      // CGAZ dissolve: Uruguay's is a hole-riddled municipality blob. Leaving
      // them out of `inDissolved` routes them to the NE-geometry pass below.
      if (replaced.has(f.properties.shapeGroup)) continue;
      inDissolved.add(f.properties.shapeGroup);
      addBorderEdges(f.geometry, intl, null, null, intlSeen);
    }
  }
  for (const [code, n] of nationGeom) {
    if (inDissolved.has(code) || !byCode.has(code) || !n.geometry) continue;
    // Fill-only nations reuse the geometry already smoothed in the province pass.
    addBorderEdges(n.geometry, intl, null, null, intlSeen);
  }

  // -- nation BACKSTOP fill ------------------------------------------------
  // The simplified ADM2 districts don't share exact boundaries, so adjacent
  // districts pull apart and leave gaps that expose the ocean sphere (the ugly
  // "dark blue patches"). We plug them with a solid, gap-free fill of each
  // nation's DISSOLVED geometry (coastline matches the districts exactly),
  // rendered BENEATH the districts and coloured by a representative province id
  // so it recolours with overlays. Districts paint over it; only the gaps show.
  const bkFill = new F32(1 << 20), bkId = new F32(1 << 19), bkIdx = new U32(1 << 20);
  const repId = new Map(); // nation code → a representative province id
  raw.forEach((p, idx) => { if (!repId.has(p.nationCode)) repId.set(p.nationCode, idx + 1); });
  let bkNations = 0;
  if (dissolved) for (const f of dissolved.features) {
    const code = f.properties.shapeGroup;
    if (replaced.has(code)) continue; // their CGAZ dissolve is the broken blob
    const pid = repId.get(code);
    if (pid == null) continue;
    eachPolygon(f.geometry, (rings) => addFill(rings, pid, bkFill, bkId, bkIdx, bounds, true));
    bkNations++;
  }
  // Replaced nations backstop from their NE admin-0 geometry instead, so the
  // seams between NE admin-1 units show nation colour, not the ocean sphere.
  for (const code of replaced) {
    const pid = repId.get(code);
    const g = nationGeom.get(code)?.geometry;
    if (pid == null || !g) continue;
    eachPolygon(g, (rings) => addFill(rings, pid, bkFill, bkId, bkIdx, bounds, true));
    bkNations++;
  }
  log.ok(`backstop fill for ${bkNations} nations (plugs district gaps)`);

  const rivers = buildRivers();
  const lakes = buildLakes();

  // -- write --------------------------------------------------------------
  fs.mkdirSync(PATHS.mapOut, { recursive: true });
  // Retire artifacts replaced by this build (old bucketed river lines etc.).
  for (const stale of ['rivers.bin', 'rivers_major.bin', 'rivers_minor.bin', 'borders.bin']) {
    const p = path.join(PATHS.mapOut, stale);
    if (fs.existsSync(p)) fs.rmSync(p);
  }
  writeBin(path.join(PATHS.mapOut, 'fill.bin'), fill);
  writeBin(path.join(PATHS.mapOut, 'fill_id.bin'), fillId);
  writeBin(path.join(PATHS.mapOut, 'fill_idx.bin'), fillIdx);
  writeBin(path.join(PATHS.mapOut, 'fill_bk.bin'), bkFill);
  writeBin(path.join(PATHS.mapOut, 'fill_bk_id.bin'), bkId);
  writeBin(path.join(PATHS.mapOut, 'fill_bk_idx.bin'), bkIdx);
  writeBin(path.join(PATHS.mapOut, 'borders_internal.bin'), internal);
  writeBin(path.join(PATHS.mapOut, 'borders_internal_col.bin'), internalCol);
  writeBin(path.join(PATHS.mapOut, 'borders_intl.bin'), intl);
  writeBin(path.join(PATHS.mapOut, 'rivers2.bin'), rivers);
  writeBin(path.join(PATHS.mapOut, 'lakes.bin'), lakes.fill);
  writeBin(path.join(PATHS.mapOut, 'lakes_idx.bin'), lakes.idx);

  // Raster assets that are copied straight through (downloaded in 01-download).
  for (const src of Object.values(SOURCES)) {
    if (!src.copyTo) continue;
    const from = path.join(PATHS.cache, src.file);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, path.join(PATHS.mapOut, src.copyTo));
      log.info(`${src.copyTo} — copied`);
    }
  }

  writeJson(path.join(PATHS.dataOut, 'world.json'), {
    meta: { generated: new Date().toISOString(), source: 'adm2+fill', nationCount: nationList.length, provinceCount: provincesMeta.length },
    nations: nationList.map((n) => ({
      id: n.code,
      name: n.name,
      color: n.color,
      flag: n.flag,
      data: { population: nationGeom.get(n.code)?.pop || 0, government: 'Hybrid Regime', creditRating: 'A' },
    })),
    provinces: provincesMeta,
  });
  writeJson(path.join(PATHS.mapOut, 'cities.json'),
    cities.map((c) => {
      const [x, y] = equalEarth(c.lng, c.lat);
      return { name: c.name, x: round(x), y: round(y), pop: c.pop, cap: c.cap, rank: c.rank, province: c.provinceIdx != null ? c.provinceIdx + 1 : 0 };
    }));
  writeJson(path.join(PATHS.mapOut, 'map.json'), {
    bounds,
    counts: { fillVerts: fill.len / 2, internalVerts: internal.len / 2, intlVerts: intl.len / 2, provinces: provincesMeta.length, nations: nationList.length, cities: cities.length },
  });

  const checkPop = ['PAK', 'USA', 'IND'].map((c) => {
    const s = sum(provIdxByNation.get(c)?.map((i) => population[i]) || [0]);
    return `${c}=${(s / 1e6).toFixed(0)}M`;
  });
  log.ok(`province population check: ${checkPop.join(', ')}`);
  log.step('DONE — public/data/map/');
}

/* ---- io ------------------------------------------------------------------ */
const round = (v) => Math.round(v * 100000) / 100000;
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
function tryRead(file) {
  const p = path.join(PATHS.cache, file);
  return fs.existsSync(p) ? readJson(p) : null;
}
const tryReadCache = tryRead;
function writeBin(p, f32) {
  const view = f32.view();
  fs.writeFileSync(p, Buffer.from(view.buffer, view.byteOffset, view.byteLength));
  log.info(`${path.basename(p)} — ${(view.byteLength / 1e6).toFixed(2)} MB`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildMap();
}
