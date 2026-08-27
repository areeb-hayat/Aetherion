/**
 * ============================================================================
 *  AETHERION ETL — STEP: RESOURCES + ECONOMY  (`pnpm etl:res`)
 * ============================================================================
 *  ADDITIVE on public/data/world.json — run AFTER `etl:build` and `etl:sea`
 *  (needs terrain types + sea provinces). Gives every province:
 *
 *    data.resources        { [resourceId]: richness 1..5 }  (0–4 deposits)
 *    data.economy          { gdp, resourceOutput }          ($/yr)
 *    data.value            0..100 strategic value score
 *
 *  Generation is DETERMINISTIC and geographically stable: rolls are hashed
 *  from the quantized centroid lat/lng (NOT the province id, which can shift
 *  between ETL rebuilds), so Pilbara keeps its iron across rebuilds.
 *
 *  Three signals shape each roll (catalogue: src/config/resourceCatalog.json):
 *    1. terrain affinity  — wheat wants grassland, copper wants mountains
 *    2. |latitude| band   — coffee/rubber tropical, wheat temperate (soft edge)
 *    3. nation bias       — real-world producers (Saudi oil, Chilean copper,
 *       Congolese cobalt…) get spawn-odds AND richness boosts, so the world
 *       map echoes real geology without hand-placing 49k provinces.
 *
 *  Owned EEZ sea provinces roll fisheries + offshore oil/gas from the same
 *  tables; International Waters stay empty.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PATHS } from './config.mjs';
import { readJson, writeJson, log } from './lib/util.mjs';
import { invEqualEarth } from './lib/projection.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG = readJson(path.resolve(__dirname, '../../src/config/resourceCatalog.json')).resources;

const MAX_DEPOSITS = 4; // legibility cap — keep only the most valuable rolls

/** Mean LAND-province area (set at runtime from world.json). Deposit spawn odds
 *  scale with a province's area / this mean, so a nation's TOTAL resource wealth
 *  tracks its geographic SIZE — not how finely it's been chopped into districts.
 *  (Romania is diced into 3235 micro-provinces yet holds LESS land than Germany's
 *  38 large ones; under the old per-province roll Romania mined 5366 deposits to
 *  Germany's 92.) Because Σ(area/mean) over a nation = nationArea/mean, the total
 *  is independent of province count. */
let MEAN_AREA = 1;
/** Cap the per-province area multiplier so one enormous district (a simplified
 *  Siberian/Saharan polygon can be 1000×+ the mean) can't monopolise every rare
 *  deposit — MAX_DEPOSITS already bounds how many it can actually show. */
const AREA_CAP = 16;
/** Province area → spawn multiplier (1 = mean-sized province). Deliberately NO
 *  lower floor: a floor multiplied across thousands of micro-provinces would
 *  re-introduce the exact count bias we're removing. Sea / area-less provinces
 *  stay neutral (1). */
function areaFactor(p) {
  return p.data.area ? Math.min(AREA_CAP, p.data.area / MEAN_AREA) : 1;
}

/** Real-world producer bias: ADM0_A3 → { resourceId: multiplier }. Applied to
 *  spawn odds; ≥3 also bumps richness +1, ≥6 bumps +2. Not exhaustive — the
 *  terrain/latitude rules carry the rest of the world. */
const NATION_BIAS = {
  // -- petrostates & gas giants ------------------------------------------
  SAU: { oil: 8, gas: 4 }, IRQ: { oil: 6, gas: 2 }, IRN: { oil: 5, gas: 6 },
  KWT: { oil: 7 }, ARE: { oil: 6, gas: 3 }, QAT: { gas: 8, oil: 3 },
  VEN: { oil: 6 }, RUS: { gas: 6, oil: 4, coal: 3, nickel: 4, gold: 3, timber: 3, rare_earths: 2, gems: 2 },
  USA: { gas: 4, oil: 3, coal: 3, maize: 4, wheat: 3, timber: 2 },
  CAN: { oil: 3, gas: 2, uranium: 5, nickel: 3, timber: 4, gold: 3 },
  NOR: { oil: 4, gas: 4, fish: 4 }, NGA: { oil: 5, gas: 3 }, LBY: { oil: 5 },
  DZA: { oil: 3, gas: 4 }, KAZ: { uranium: 6, oil: 3, coal: 3, wheat: 2 },
  AZE: { oil: 4, gas: 3 }, TKM: { gas: 5 }, AGO: { oil: 4, gems: 2 },
  GAB: { oil: 3 }, GNQ: { oil: 4 }, TTO: { gas: 4, oil: 2 }, GUY: { oil: 3, bauxite: 3, gold: 3 },
  // -- mining superpowers -------------------------------------------------
  AUS: { iron: 6, coal: 4, bauxite: 5, lithium: 6, gold: 4, uranium: 5, gas: 3, livestock: 2 },
  CHL: { copper: 8, lithium: 6, fish: 2 }, PER: { copper: 5, gold: 3, zinc: 3, fish: 3 },
  COD: { cobalt: 8, copper: 4, gems: 3, tin: 3 }, ZMB: { copper: 6, cobalt: 3 },
  CHN: { rare_earths: 6, coal: 4, iron: 3, tin: 3, rice: 3, tea: 3 },
  BRA: { iron: 5, coffee: 6, sugar: 4, bauxite: 3, timber: 2, livestock: 3 },
  IND: { coal: 3, iron: 3, cotton: 3, tea: 4, rice: 3 },
  ZAF: { gold: 6, gems: 4, coal: 3, titanium: 3 }, BWA: { gems: 8 },
  NAM: { uranium: 4, gems: 4 }, NER: { uranium: 5 }, MAR: { phosphate: 8 },
  GIN: { bauxite: 6 }, JAM: { bauxite: 4 }, BOL: { tin: 5, lithium: 6 },
  MNG: { coal: 4, copper: 4, rare_earths: 3 }, SWE: { iron: 4 },
  UKR: { wheat: 4, iron: 3 }, PNG: { gold: 3, copper: 3 },
  AFG: { lithium: 3, gems: 3, rare_earths: 2 }, MMR: { gems: 4, rice: 3, tin: 2 },
  UZB: { cotton: 4, gold: 3 }, EGY: { cotton: 3, gas: 2 },
  // -- agricultural signatures -------------------------------------------
  IDN: { nickel: 5, tin: 4, rubber: 4, rice: 3 }, MYS: { tin: 4, rubber: 5 },
  THA: { rice: 4, rubber: 4, tin: 3 }, VNM: { rice: 4, coffee: 4, rare_earths: 2 },
  LKA: { tea: 5, gems: 3 }, KEN: { tea: 4, coffee: 3 }, ETH: { coffee: 5 },
  COL: { coffee: 5, oil: 2 }, CIV: { cocoa: 6, rubber: 2 }, GHA: { cocoa: 5, gold: 4 },
  ARG: { livestock: 4, wheat: 3, lithium: 4 }, NZL: { livestock: 4, fish: 3 },
  ISL: { fish: 5 }, JPN: { fish: 4 }, PHL: { fish: 3, nickel: 3 },
  FRA: { wheat: 3 }, DEU: { coal: 3 }, POL: { coal: 4 }, TUR: { cotton: 2 },
  PAK: { cotton: 3, rice: 2 }, BGD: { rice: 4 }, CUB: { sugar: 4, nickel: 3 },
};

/** Deterministic 0..1 hash from three ints (quantized lng, lat, salt). */
function roll(qx, qy, salt) {
  let h = (qx * 374761393 + qy * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** |lat| band factor: 1 inside [min,max], fading to 0 over a 6° soft edge. */
function latFactor(absLat, band) {
  if (!band) return 1;
  const [lo, hi] = band;
  if (absLat >= lo && absLat <= hi) return 1;
  const d = absLat < lo ? lo - absLat : absLat - hi;
  return Math.max(0, 1 - d / 6);
}

function generateDeposits(p, lng, lat) {
  const qx = Math.round((lng + 180) * 50);
  const qy = Math.round((lat + 90) * 50);
  const absLat = Math.abs(lat);
  const bias = NATION_BIAS[p.nationId] || {};
  const terrain = p.data.terrain;
  const af = areaFactor(p); // geographic-size weight (see areaFactor)
  const candidates = [];

  for (let i = 0; i < CATALOG.length; i++) {
    const r = CATALOG[i];
    let w;
    if (p.isSea) {
      w = r.sea || 0; // only offshore-capable resources spawn at sea
    } else {
      w = r.terrain?.[terrain] ?? r.terrainDefault ?? 0; // agri defaults to 0
    }
    if (w <= 0) continue;
    const b = bias[r.id] || 1;
    // Area weight scales the odds with geographic size so many-province nations
    // don't accumulate deposits purely by granularity.
    const pSpawn = Math.min(0.95, r.rarity * w * latFactor(absLat, r.lat) * b * af);
    if (roll(qx, qy, i) >= pSpawn) continue;

    // Richness 1..5, skewed small; famous producers get visibly richer veins.
    // Large provinces also carry richer deposits — this is how a nation of a few
    // big provinces (Germany) shows resource WEALTH proportional to its land even
    // though MAX_DEPOSITS caps its deposit COUNT; without it, area only ever
    // raised spawn odds and capped-out early.
    let size = 1 + Math.floor(4 * Math.pow(roll(qx, qy, i + 1000), 1.6));
    if (b >= 3) size += 1;
    if (b >= 6) size += 1;
    if (af >= 3) size += 1; // a large province (~3×+ mean) holds richer veins
    size = Math.min(5, size);
    candidates.push({ id: r.id, size, worth: size * r.value });
  }

  // Subsistence agriculture: a populated province with no deposits may still get
  // its best terrain-suited crop — but AREA-GATED (chance ∝ size), so a nation's
  // farm count also tracks its land, not its district count. Tiny slivers can now
  // legitimately come up empty rather than each minting a guaranteed crop.
  if (!p.isSea && candidates.length === 0 && p.data.population > 10000 && roll(qx, qy, 7778) < Math.min(1, af)) {
    let best = null;
    for (const r of CATALOG) {
      if (r.category !== 'AGRICULTURE') continue;
      const w = (r.terrain?.[terrain] ?? 0) * latFactor(absLat, r.lat);
      if (w > 0 && (!best || w > best.w)) best = { r, w };
    }
    if (best) candidates.push({ id: best.r.id, size: 1 + (roll(qx, qy, 7777) < 0.35 ? 1 : 0), worth: best.r.value });
  }

  candidates.sort((a, b) => b.worth - a.worth);
  const deposits = {};
  for (const c of candidates.slice(0, MAX_DEPOSITS)) deposits[c.id] = c.size;
  return deposits;
}

// ---------------------------------------------------------------------------
export function buildResources() {
  const t0 = Date.now();
  log.step('BUILD RESOURCES — deposits + economy for every province');

  const worldPath = path.join(PATHS.dataOut, 'world.json');
  const world = readJson(worldPath);
  const valueById = new Map(CATALOG.map((r) => [r.id, r.value]));

  // Anchor the area-weighting: mean area of LAND provinces (see areaFactor).
  let areaSum = 0, areaN = 0;
  for (const p of world.provinces) {
    if (p.nationId && !p.isSea && p.data.area) { areaSum += p.data.area; areaN++; }
  }
  MEAN_AREA = areaN ? areaSum / areaN : 1;
  if (!areaN) log.warn('no province areas in world.json — run etl:build first; resources fall back to uniform (count-biased) rolls');

  // City presence feeds the strategic-value score (capitals anchor regions).
  const cityBonus = new Map(); // provinceId -> bonus points
  try {
    for (const c of readJson(path.join(PATHS.mapOut, 'cities.json'))) {
      if (c.province == null) continue;
      const b = (c.cap ? 22 : 0) + Math.max(0, 10 - (c.rank ?? 10)) + (c.pop > 1e6 ? 6 : 0);
      cityBonus.set(c.province, Math.max(cityBonus.get(c.province) || 0, b));
    }
  } catch { log.warn('cities.json unreadable — value score skips city bonus'); }

  const tally = new Map();
  let landWith = 0, land = 0, seaWith = 0, forced = 0;

  // Pass 1: roll deposits (International Waters stay barren — ownerless scenery).
  const info = new Map(); // province -> { qx, qy, absLat } for the guarantee pass
  for (const p of world.provinces) {
    const ll = invEqualEarth(p.centroid[0], p.centroid[1]);
    const [lng, lat] = ll || [0, 0];
    info.set(p, { qx: Math.round((lng + 180) * 50), qy: Math.round((lat + 90) * 50), absLat: Math.abs(lat) });
    p.data.resources = p.isSea && !p.nationId ? {} : generateDeposits(p, lng, lat);
  }

  // Pass 2: signature-resource guarantee. Random rolls can whiff on small
  // nations (Botswana can roll zero diamond provinces at rarity 0.012) — for
  // every strong bias pair (≥4×) make sure the nation actually holds a
  // sensible minimum, force-placing rich deposits in its best-suited provinces.
  const byNation = new Map();
  for (const p of world.provinces) {
    if (!p.nationId) continue;
    if (!byNation.has(p.nationId)) byNation.set(p.nationId, []);
    byNation.get(p.nationId).push(p);
  }
  for (const [code, biases] of Object.entries(NATION_BIAS)) {
    const provs = byNation.get(code);
    if (!provs) continue;
    for (const [rid, mult] of Object.entries(biases)) {
      if (mult < 4) continue;
      const r = CATALOG.find((c) => c.id === rid);
      const have = provs.filter((p) => p.data.resources[rid]).length;
      // Guaranteed count tracks how strong a real-world producer this is (the
      // bias multiplier), NOT the province count — otherwise finely-diced
      // nations would be gifted extra signature deposits for free.
      const want = Math.min(4, Math.max(2, Math.round(mult / 2)));
      if (have >= want) continue;
      const ranked = provs
        .map((p) => {
          const { qx, qy, absLat } = info.get(p);
          const w = p.isSea ? (r.sea || 0) : (r.terrain?.[p.data.terrain] ?? r.terrainDefault ?? 0);
          // Prefer suitable, LARGER provinces so signatures anchor real regions.
          return { p, score: w * latFactor(absLat, r.lat) * areaFactor(p) * (0.5 + roll(qx, qy, 9000)) };
        })
        .filter((c) => c.score > 0 && !c.p.data.resources[rid])
        .sort((a, b) => b.score - a.score);
      for (const c of ranked.slice(0, want - have)) {
        c.p.data.resources[rid] = Math.min(5, 3 + (mult >= 6 ? 1 : 0));
        forced++;
      }
    }
  }

  // Pass 3: economy + strategic value from the final deposit set.
  for (const p of world.provinces) {
    const deposits = p.data.resources;
    let output = 0;
    for (const [id, size] of Object.entries(deposits)) {
      output += size * (valueById.get(id) || 0) * 1e6; // $M/pt → $
      tally.set(id, (tally.get(id) || 0) + 1);
    }
    const pop = p.data.population || 0;
    p.data.economy = { gdp: Math.round(pop * 4000 + output), resourceOutput: output };

    // Strategic value 0..100: population + resource wealth + anchor cities.
    const popScore = pop > 0 ? Math.min(1, Math.log10(pop) / 7) : 0; // 10M+ caps
    const resScore = output > 0 ? Math.min(1, Math.log10(output) / 10) : 0; // $10B+ caps
    p.data.value = Math.min(100, Math.round(38 * popScore + 34 * resScore + (cityBonus.get(p.id) || 0)));

    if (p.isSea) { if (output > 0) seaWith++; }
    else { land++; if (output > 0) landWith++; }
  }

  world.meta.resourceCatalog = CATALOG.length;
  writeJson(worldPath, world);

  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([id, n]) => `${id}:${n}`).join(' ');
  log.info(`${landWith}/${land} land provinces hold deposits; ${seaWith} EEZ cells (fisheries/offshore); ${forced} signature deposits guaranteed`);
  log.info(`most common: ${top}`);
  log.step(`DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s — world.json patched`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildResources();
}
