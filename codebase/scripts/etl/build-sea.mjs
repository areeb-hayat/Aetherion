/**
 * BUILD-SEA — natural sea provinces (EEZ + international waters) + maritime
 * borders, and elevation-derived terrain types for land provinces.
 *
 * Sea provinces are real, selectable provinces just like land. We have no
 * commercial-safe EEZ polygons, so we DERIVE them:
 *   1. scatter ocean seed points — dense near coasts, sparse in open ocean;
 *   2. build their Voronoi diagram (irregular, jittered → no square grid);
 *   3. CLIP every cell to the ocean (difference against the coastline) so cells
 *      hug the coast and jigsaw with each other AND the land — no overlap;
 *   4. assign each to the nearest coastline nation within an EEZ radius;
 *      cells beyond that are International Waters (owned by no one, still a
 *      selectable province for movement/claims).
 *
 * ADDITIVE: reads cached admin-0 coastlines + the already-built world.json and
 * appends sea provinces to it; writes new sea_*.bin. Never rebuilds the 49k land
 * provinces. Run on its own:  `pnpm etl:sea`.
 *
 * Output (public/data/map/): sea_fill.bin, sea_id.bin (province id per vertex),
 * sea_idx.bin, sea_borders.bin, sea.json; and patches ../world.json (sea
 * provinces + land terrain types).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import earcut from 'earcut';
import { Delaunay } from 'd3-delaunay';
import polygonClipping from 'polygon-clipping';
import jpeg from 'jpeg-js';
import { PATHS, SOURCES } from './config.mjs';
import { readJson, writeJson, log, prop, downloadCached } from './lib/util.mjs';
import { equalEarth, invEqualEarth } from './lib/projection.mjs';
import { F32, U32 } from './lib/buffers.mjs';
import { emitSubdividedTris } from './lib/subdivide.mjs';

const FINE = 1.6;        // ocean seed grid step (degrees)
const COARSE_EVERY = 3;  // keep only every Nth fine cell in open ocean
const JITTER = 0.6;      // seed jitter (degrees) → irregular, natural cells
const NEAR_COAST = 2.6;  // "near coast" radius for dense seeding
const EEZ_DEG = 4.2;     // EEZ claim radius (~250nm)
const COAST_STEP = 2;    // decimate coastline vertices for the nearest query
const LAND_SPACING = 0.06; // decimate land rings for clipping (perf, ~6km)
const PIP_CELL = 4;      // land bbox grid (degrees)
const MIN_AREA = 0.12;   // drop sliver sea provinces (deg²)
const DENSIFY = 1.2;     // subdivide long polygon edges before projecting (deg)
const NEUTRAL = '#33424f'; // International Waters colour

const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const eachPolygon = (g, fn) => {
  if (!g) return;
  if (g.type === 'Polygon') fn(g.coordinates);
  else if (g.type === 'MultiPolygon') for (const p of g.coordinates) fn(p);
};
function decimateRing(ring) {
  const out = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const p = ring[i], q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= LAND_SPACING) out.push(p);
  }
  if (out.length < 4) return ring; // too small to decimate
  return out;
}
function pointInRing(px, py, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const ringArea = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(a / 2);
};
function ringCentroid(ring) {
  let x = 0, y = 0;
  for (const p of ring) { x += p[0]; y += p[1]; }
  return [x / ring.length, y / ring.length];
}

/* ---- elevation sampler (jpeg → height) ---------------------------------- */
function loadElevation() {
  const p = path.join(PATHS.mapOut, 'elevation.jpg');
  if (!fs.existsSync(p)) { log.warn('elevation.jpg missing — land terrain skipped'); return null; }
  const { width, height, data } = jpeg.decode(fs.readFileSync(p), {
    useTArray: true,
    maxMemoryUsageInMB: 2048, // 8192×4096 DEM ≈ 134 MB RGBA (default cap is 512)
    maxResolutionInMP: 64,
  });
  const at = (lng, lat) => {
    let u = (lng + 180) / 360, v = (90 - lat) / 180;
    u = Math.min(0.999999, Math.max(0, u)); v = Math.min(0.999999, Math.max(0, v));
    const x = (u * width) | 0, y = (v * height) | 0;
    const o = (y * width + x) * 4;
    return (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) / 255;
  };
  return { at };
}

/* ---- vegetation sampler (Blue Marble greenness ≈ moisture proxy) --------- */
// Elevation + latitude alone cannot tell monsoon India from the Sahara — both
// are low subtropical plains. Blue Marble pixels encode the answer: vegetated
// land reads green (g > r), arid land tan (r > g). ONE month is not enough —
// the shipped terrain.jpg is a winter composite where Iowa and the Deccan are
// as brown as Arabia — so we take the greener of two opposite seasons
// (January + July): annual-max greenness, a free public-domain moisture proxy.
const VEG_JULY_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg';
const VEG_JULY_FILE = 'world.200407.3x5400x2700.jpg';

function loadVegetation() {
  const seasons = [];
  for (const p of [path.join(PATHS.mapOut, 'terrain.jpg'), path.join(PATHS.cache, VEG_JULY_FILE)]) {
    if (!fs.existsSync(p)) { log.warn(`${path.basename(p)} missing — vegetation proxy degraded`); continue; }
    seasons.push(jpeg.decode(fs.readFileSync(p), {
      useTArray: true,
      maxMemoryUsageInMB: 2048,
      maxResolutionInMP: 64,
    }));
  }
  if (!seasons.length) return null;
  // Per season: greenness g−r averaged over a 3×3 spread (one cloud pixel
  // can't flip a province); across seasons: the max (greenest month wins).
  const at = (lng, lat) => {
    let best = -1;
    for (const { width, height, data } of seasons) {
      let sum = 0, n = 0;
      for (const dl of [-0.25, 0, 0.25]) for (const db of [-0.25, 0, 0.25]) {
        let u = (lng + dl + 180) / 360, v = (90 - (lat + db)) / 180;
        u = Math.min(0.999999, Math.max(0, u)); v = Math.min(0.999999, Math.max(0, v));
        const o = (((v * height) | 0) * width + ((u * width) | 0)) * 4;
        sum += (data[o + 1] - data[o]) / 255;
        n++;
      }
      if (sum / n > best) best = sum / n;
    }
    return best;
  };
  return { at };
}

// A plausible biome from elevation + latitude + coast proximity + Blue-Marble
// greenness (Phase-1 flavour, not a climate model): relief dominates, then
// climate bands refined by how green the land actually is.
// Elevation thresholds are calibrated for the GEBCO DEM (see
// build-elevation.mjs): ocean/sea-level = 0, Alps ≈ 0.3–0.5, Tibet ≈ 0.8.
function classifyTerrain(elev, veg, lng, lat, coastal) {
  const h = elev.at(lng, lat);
  let mn = 1, mx = 0;
  for (const dl of [-0.4, 0, 0.4]) for (const db of [-0.4, 0, 0.4]) {
    const s = elev.at(lng + dl, lat + db); if (s < mn) mn = s; if (s > mx) mx = s;
  }
  const rug = mx - mn, al = Math.abs(lat);
  // Calibrated on annual-max greenness: Amazon +0.035, Siberian taiga +0.031,
  // Iowa +0.071 | Deccan −0.020, Delhi −0.016 | Arabia −0.063, Sahara −0.118.
  const g = veg ? veg.at(lng, lat) : 0;
  const lush = g > 0.025;   // clearly green (forest / monsoon plains)
  const arid = g < -0.055;  // clearly tan (sand / bare rock)

  // Relief first.
  if (h > 0.6 || rug > 0.22) return 'MOUNTAINS';
  if (h > 0.4 || rug > 0.12) return al > 55 ? 'ALPINE' : 'HIGHLANDS';
  // Cold high latitudes.
  if (al >= 66) return 'POLAR';
  // Boreal belt: greenness decides — the West Siberian taiga sits near sea
  // level, so an elevation gate would wrongly file half of Russia as tundra.
  // Above ~64° even tundra moss reads green in July, so the treeline needs a
  // stronger green than the mere `lush` bar.
  if (al >= 64) return g > 0.05 ? 'TAIGA' : 'TUNDRA';
  if (al >= 55) return lush ? 'TAIGA' : 'TUNDRA';
  // Tropics — green basins are rainforest (Amazon, Congo), dry ones savanna;
  // mangroves only where the coast is actually lush.
  if (al < 10) {
    if (coastal && h < 0.012 && g > 0.045) return 'MANGROVE';
    if (h < 0.012 && lush) return 'SWAMP';
    if (arid) return 'STEPPE';
    return lush ? 'RAINFOREST' : 'SAVANNA';
  }
  // Subtropics — greenness splits the Sahara from monsoon India.
  if (al < 23.5) {
    if (coastal && h < 0.008 && g > 0.045) return 'MANGROVE';
    if (h < 0.008 && lush) return 'SWAMP';
    if (arid && h < 0.36) return 'DESERT';
    return lush ? (coastal ? 'RAINFOREST' : 'SAVANNA') : 'SAVANNA';
  }
  if (al < 35) {
    if (arid && h < 0.3) return 'DESERT';
    return lush ? (rug > 0.06 ? 'HILLS' : 'GRASSLAND') : 'STEPPE';
  }
  // Temperate — only the lowest lush coastal ground reads as marsh/wetland.
  if (h < 0.006 && coastal && lush) return 'WETLAND';
  if (rug > 0.06) return 'HILLS';
  if (arid) return 'STEPPE';
  return lush ? 'FOREST' : 'GRASSLAND';
}

export async function buildSea() {
  log.step('BUILD SEA — natural Voronoi sea provinces + land terrain types');
  // July Blue Marble for the vegetation proxy (public domain, ~1.6 MB).
  await downloadCached(VEG_JULY_URL, path.join(PATHS.cache, VEG_JULY_FILE)).catch((e) =>
    log.warn(`July Blue Marble download failed (${e.message}) — winter-only vegetation proxy`),
  );

  const admin0 = readJson(path.join(PATHS.cache, SOURCES.admin0.file));
  const world = readJson(path.join(PATHS.dataOut, 'world.json'));
  const colorByCode = new Map(world.nations.map((n) => [n.id, n.color]));
  const nameByCode = new Map(world.nations.map((n) => [n.id, n.name]));

  // -- land polygons (decimated for clipping) + spatial grids --------------
  const polys = [];                 // { rings (lng/lat), code }
  const landGrid = new Map();       // bbox grid → poly indices
  const coastGrid = new Map();      // coastline points for nearest-nation
  const gk = (x, y) => `${x},${y}`;
  for (const f of admin0.features) {
    const code = prop(f.properties, 'ADM0_A3', 'adm0_a3');
    if (!code || code === '-99') continue;
    eachPolygon(f.geometry, (rings) => {
      const dec = rings.map(decimateRing);
      let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
      for (const [x, y] of dec[0]) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
      const idx = polys.push({ rings: dec, code, bbox: [mnx, mny, mxx, mxy] }) - 1;
      for (let cx = Math.floor(mnx / PIP_CELL); cx <= Math.floor(mxx / PIP_CELL); cx++)
        for (let cy = Math.floor(mny / PIP_CELL); cy <= Math.floor(mxy / PIP_CELL); cy++)
          (landGrid.get(gk(cx, cy)) ?? landGrid.set(gk(cx, cy), []).get(gk(cx, cy))).push(idx);
      for (const ring of dec)
        for (let i = 0; i < ring.length; i += COAST_STEP) {
          const [lng, lat] = ring[i];
          const k = gk(Math.floor(lng / EEZ_DEG), Math.floor(lat / EEZ_DEG));
          (coastGrid.get(k) ?? coastGrid.set(k, []).get(k)).push(lng, lat, code);
        }
    });
  }
  log.info(`${polys.length} land polygons (decimated), grids built`);

  const isLand = (lng, lat) => {
    const c = landGrid.get(gk(Math.floor(lng / PIP_CELL), Math.floor(lat / PIP_CELL)));
    if (!c) return false;
    for (const i of c) {
      const p = polys[i];
      if (lng < p.bbox[0] || lng > p.bbox[2] || lat < p.bbox[1] || lat > p.bbox[3]) continue;
      if (pointInRing(lng, lat, p.rings[0])) {
        let hole = false;
        for (let h = 1; h < p.rings.length; h++) if (pointInRing(lng, lat, p.rings[h])) { hole = true; break; }
        if (!hole) return true;
      }
    }
    return false;
  };
  const nearestWithin = (lng, lat, maxD) => {
    const cl = Math.cos((lat * Math.PI) / 180);
    let best = null, bestD = maxD * maxD;
    const gx = Math.floor(lng / EEZ_DEG), gy = Math.floor(lat / EEZ_DEG);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const arr = coastGrid.get(gk(gx + dx, gy + dy));
      if (!arr) continue;
      for (let i = 0; i < arr.length; i += 3) {
        const dl = (arr[i] - lng) * cl, db = arr[i + 1] - lat;
        const d = dl * dl + db * db;
        if (d < bestD) { bestD = d; best = arr[i + 2]; }
      }
    }
    return best;
  };

  // -- ocean seeds: dense near coast, sparse open ocean (jittered) ---------
  const seeds = [];
  let i = 0;
  for (let lngB = -180; lngB < 180; lngB += FINE, i++) {
    let j = 0;
    for (let latB = -85; latB <= 85; latB += FINE, j++) {
      const lng = lngB + (hash(lngB, latB) - 0.5) * 2 * JITTER;
      const lat = latB + (hash(lngB + 7.3, latB - 2.1) - 0.5) * 2 * JITTER;
      if (lng <= -180 || lng >= 180 || lat <= -89 || lat >= 89) continue;
      if (isLand(lng, lat)) continue;
      const near = nearestWithin(lng, lat, NEAR_COAST) !== null;
      if (!near && !(i % COARSE_EVERY === 0 && j % COARSE_EVERY === 0)) continue;
      seeds.push([lng, lat]);
    }
  }
  log.info(`${seeds.length} ocean seeds → building Voronoi…`);

  // "Near the OCEAN" test for terrain classification. coastGrid can't be used
  // for this — admin-0 rings include LAND borders, so inland border provinces
  // would read as "coastal" (Sahara provinces flipping DESERT→SAVANNA). Ocean
  // seeds only exist at sea, so seed proximity is a true ocean test.
  const seedGrid = new Map();
  for (const [slng, slat] of seeds) {
    const k = gk(Math.floor(slng / EEZ_DEG), Math.floor(slat / EEZ_DEG));
    (seedGrid.get(k) ?? seedGrid.set(k, []).get(k)).push(slng, slat);
  }
  const nearOcean = (lng, lat, maxD) => {
    const cl = Math.cos((lat * Math.PI) / 180);
    const maxSq = maxD * maxD;
    const gx = Math.floor(lng / EEZ_DEG), gy = Math.floor(lat / EEZ_DEG);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const arr = seedGrid.get(gk(gx + dx, gy + dy));
      if (!arr) continue;
      for (let i2 = 0; i2 < arr.length; i2 += 2) {
        const dl = (arr[i2] - lng) * cl, db = arr[i2 + 1] - lat;
        if (dl * dl + db * db < maxSq) return true;
      }
    }
    return false;
  };

  const voronoi = Delaunay.from(seeds).voronoi([-180, -89.9, 180, 89.9]);

  // -- clip each cell to the ocean, emit a sea province --------------------
  const seaFill = new F32(1 << 19), seaId = new F32(1 << 18), seaIdx = new U32(1 << 19);
  const borders = new F32(1 << 18);
  const landBase = world.provinces.filter((p) => !p.isSea);
  const seaIdStart = landBase.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  const seaProvinces = [];

  const densify = (ring) => {
    const out = [];
    for (let k = 0; k < ring.length - 1; k++) {
      const a = ring[k], b = ring[k + 1];
      out.push(a);
      const steps = Math.floor(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / DENSIFY);
      for (let s = 1; s < steps; s++) out.push([a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps]);
    }
    return out; // open ring (no closing duplicate)
  };
  const emit = (rings, owner) => {
    const area = ringArea(rings[0]);
    if (area < MIN_AREA) return;
    const pid = seaIdStart + seaProvinces.length;
    const base = seaFill.len / 2;
    const flat = [], holes = [];
    let v = 0;
    rings.forEach((ring, ri) => {
      if (ri > 0) holes.push(v);
      const dr = densify(ring);
      for (const [lng, lat] of dr) {
        const [x, y] = equalEarth(lng, lat);
        flat.push(x, y); seaFill.push2(x, y); seaId.push1(pid); v++;
      }
    });
    const tris = earcut(flat, holes, 2);
    if (tris.length === 0) { seaFill.len -= v * 2; seaId.len -= v; return; }
    // Split long chords so open-ocean cells don't sag below the ocean sphere
    // when spherified (same fix as land fills — see lib/subdivide.mjs).
    emitSubdividedTris(
      flat,
      tris,
      0.025,
      (x, y) => { seaFill.push2(x, y); seaId.push1(pid); },
      (a, b, c) => { seaIdx.push1(base + a); seaIdx.push1(base + b); seaIdx.push1(base + c); },
    );
    // maritime border = outer ring outline (projected, densified)
    const outer = densify(rings[0]);
    for (let k = 0; k < outer.length; k++) {
      const a = equalEarth(outer[k][0], outer[k][1]);
      const b = equalEarth(outer[(k + 1) % outer.length][0], outer[(k + 1) % outer.length][1]);
      borders.push2(a[0], a[1]); borders.push2(b[0], b[1]);
    }
    const c = ringCentroid(rings[0]); const [ex, ey] = equalEarth(c[0], c[1]);
    seaProvinces.push({ id: pid, owner, centroid: [round(ex), round(ey)] });
  };

  let clipped = 0, owned = 0;
  for (let s = 0; s < seeds.length; s++) {
    const cell = voronoi.cellPolygon(s);
    if (!cell) continue;
    let mnx = Infinity, mny = Infinity, mxx = -Infinity, mxy = -Infinity;
    for (const [x, y] of cell) { if (x < mnx) mnx = x; if (x > mxx) mxx = x; if (y < mny) mny = y; if (y > mxy) mxy = y; }
    const cands = new Set();
    for (let cx = Math.floor(mnx / PIP_CELL); cx <= Math.floor(mxx / PIP_CELL); cx++)
      for (let cy = Math.floor(mny / PIP_CELL); cy <= Math.floor(mxy / PIP_CELL); cy++)
        for (const idx of landGrid.get(gk(cx, cy)) || []) cands.add(idx);
    const owner = nearestWithin(seeds[s][0], seeds[s][1], EEZ_DEG);
    let oceanPolys;
    if (cands.size === 0) {
      oceanPolys = [[cell]]; // entirely open ocean
    } else {
      try {
        oceanPolys = polygonClipping.difference([cell], ...[...cands].map((idx) => polys[idx].rings));
      } catch {
        continue; // skip cells the clipper chokes on (rare, invalid geometry)
      }
    }
    for (const poly of oceanPolys) emit(poly, owner);
    clipped++;
    if (owner) owned++;
  }
  log.info(`${clipped} cells clipped → ${seaProvinces.length} sea provinces (${owned} EEZ seeds)`);

  // -- patch world.json: land terrain types + appended sea provinces -------
  const elev = loadElevation();
  const veg = loadVegetation();
  if (elev) {
    let n = 0;
    const tally = new Map();
    for (const p of landBase) {
      const ll = invEqualEarth(p.centroid[0], p.centroid[1]);
      if (!ll) continue;
      const coastal = nearOcean(ll[0], ll[1], 1.5);
      p.data = p.data || {};
      p.data.terrain = classifyTerrain(elev, veg, ll[0], ll[1], coastal);
      tally.set(p.data.terrain, (tally.get(p.data.terrain) || 0) + 1);
      n++;
    }
    log.info(`classified terrain for ${n} land provinces`);
    log.info([...tally.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t}:${c}`).join(' '));
  }
  const ownerTally = new Map();
  const seaMeta = seaProvinces.map((sp) => {
    const o = sp.owner;
    if (o) ownerTally.set(o, (ownerTally.get(o) || 0) + 1);
    return {
      id: sp.id,
      name: o ? `${nameByCode.get(o) || o} Waters` : 'International Waters',
      nationId: o || null,
      color: o ? colorByCode.get(o) || NEUTRAL : NEUTRAL,
      centroid: sp.centroid,
      isSea: true,
      data: { terrain: 'OCEAN', population: 0, economy: { gdp: 0, resourceOutput: 0 }, resources: {}, value: 0 },
    };
  });
  world.provinces = landBase.concat(seaMeta);
  world.meta.provinceCount = world.provinces.length;
  world.meta.seaProvinceCount = seaMeta.length;
  writeJson(path.join(PATHS.dataOut, 'world.json'), world);

  // -- shore.jpg: distance-to-coast field ----------------------------------
  // The ocean shader samples this to give coastal water the same living pulse
  // as the rivers that feed it (the GEBCO DEM has no bathymetry — ocean is a
  // flat 0 — so shore proximity must be its own raster).
  fs.mkdirSync(PATHS.mapOut, { recursive: true });
  buildShoreField(polys);

  // -- write sea bins ------------------------------------------------------
  writeBin(path.join(PATHS.mapOut, 'sea_fill.bin'), seaFill);
  writeBin(path.join(PATHS.mapOut, 'sea_id.bin'), seaId);
  writeBin(path.join(PATHS.mapOut, 'sea_idx.bin'), seaIdx);
  writeBin(path.join(PATHS.mapOut, 'sea_borders.bin'), borders);
  const owners = [...ownerTally.entries()].sort((a, b) => b[1] - a[1])
    .map(([code, cells]) => ({ code, name: nameByCode.get(code) || code, provinces: cells }));
  writeJson(path.join(PATHS.mapOut, 'sea.json'), {
    meta: { seeds: seeds.length, seaProvinces: seaMeta.length, idStart: seaIdStart, nationsWithEEZ: owners.length },
    owners,
    counts: { fillVerts: seaFill.len / 2, borderVerts: borders.len / 2 },
  });
  log.ok(`${seaMeta.length} sea provinces (ids ${seaIdStart}..${seaIdStart + seaMeta.length - 1}), ${owners.length} nations with EEZ`);
  log.step('DONE — sea_*.bin + patched world.json');
}

/**
 * shore.jpg — equirectangular distance-to-coast field: 1 at the waterline
 * fading to 0 over SHORE_BAND_DEG of open water (0 on land). Built by
 * scanline-rasterising the decimated admin-0 land polygons, then a two-sweep
 * chamfer distance transform (run twice so the dateline wrap settles).
 */
const SHORE_W = 1536;
const SHORE_H = 768;
const SHORE_BAND_DEG = 2.4;

function buildShoreField(polys) {
  const t0 = Date.now();
  const land = new Uint8Array(SHORE_W * SHORE_H);
  const toX = (lng) => ((lng + 180) / 360) * SHORE_W;
  for (const p of polys) {
    const rowOf = (lat) => ((90 - lat) / 180) * SHORE_H;
    const y0 = Math.max(0, Math.floor(rowOf(p.bbox[3])));
    const y1 = Math.min(SHORE_H - 1, Math.ceil(rowOf(p.bbox[1])));
    for (let y = y0; y <= y1; y++) {
      const lat = 90 - ((y + 0.5) * 180) / SHORE_H;
      const xs = [];
      for (const ring of p.rings) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const ya = ring[i][1], yb = ring[j][1];
          if (ya > lat !== yb > lat)
            xs.push(ring[i][0] + ((lat - ya) / (yb - ya)) * (ring[j][0] - ring[i][0]));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.max(0, Math.ceil(toX(xs[k]) - 0.5));
        const b = Math.min(SHORE_W - 1, Math.floor(toX(xs[k + 1]) - 0.5));
        for (let x = a; x <= b; x++) land[y * SHORE_W + x] = 1;
      }
    }
  }

  // Chamfer 3-4 distance from land over water, horizontally wrapped.
  const INF = 1e9;
  const d = new Float32Array(SHORE_W * SHORE_H).fill(INF);
  for (let i = 0; i < land.length; i++) if (land[i]) d[i] = 0;
  const sweep = () => {
    for (let y = 0; y < SHORE_H; y++)
      for (let x = 0; x < SHORE_W; x++) {
        const i = y * SHORE_W + x;
        const xl = (x - 1 + SHORE_W) % SHORE_W, xr = (x + 1) % SHORE_W;
        let v = Math.min(d[i], d[y * SHORE_W + xl] + 3);
        if (y > 0) {
          const r = (y - 1) * SHORE_W;
          v = Math.min(v, d[r + x] + 3, d[r + xl] + 4, d[r + xr] + 4);
        }
        d[i] = v;
      }
    for (let y = SHORE_H - 1; y >= 0; y--)
      for (let x = SHORE_W - 1; x >= 0; x--) {
        const i = y * SHORE_W + x;
        const xl = (x - 1 + SHORE_W) % SHORE_W, xr = (x + 1) % SHORE_W;
        let v = Math.min(d[i], d[y * SHORE_W + xr] + 3);
        if (y < SHORE_H - 1) {
          const r = (y + 1) * SHORE_W;
          v = Math.min(v, d[r + x] + 3, d[r + xl] + 4, d[r + xr] + 4);
        }
        d[i] = v;
      }
  };
  sweep();
  sweep();

  const bandChamfer = (SHORE_BAND_DEG / 360) * SHORE_W * 3;
  const img = Buffer.alloc(SHORE_W * SHORE_H * 4);
  for (let i = 0; i < d.length; i++) {
    const shore = land[i] ? 0 : Math.max(0, 1 - d[i] / bandChamfer);
    const v = Math.round(255 * Math.pow(shore, 1.4)); // ease the falloff seaward
    const o = i * 4;
    img[o] = v; img[o + 1] = v; img[o + 2] = v; img[o + 3] = 255;
  }
  const out = path.join(PATHS.mapOut, 'shore.jpg');
  fs.writeFileSync(out, jpeg.encode({ data: img, width: SHORE_W, height: SHORE_H }, 90).data);
  log.ok(`shore.jpg — ${SHORE_W}×${SHORE_H} coast-distance field (${Date.now() - t0}ms)`);
}

const round = (v) => Math.round(v * 100000) / 100000;
function writeBin(p, buf) {
  const view = buf.view();
  fs.writeFileSync(p, Buffer.from(view.buffer, view.byteOffset, view.byteLength));
  log.info(`${path.basename(p)} — ${(view.byteLength / 1e6).toFixed(2)} MB`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSea();
}
