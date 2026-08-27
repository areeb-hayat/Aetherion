/**
 * Shared ETL helpers: download-with-cache, projection math, ID<->RGB encoding,
 * nation color generation, centroid computation. Pure functions, no side
 * effects beyond the filesystem cache.
 */
import fs from 'node:fs';
import path from 'node:path';

/* ---- console -------------------------------------------------------------*/
export const log = {
  step: (m) => console.log(`\n\x1b[1m\x1b[36m▸ ${m}\x1b[0m`),
  info: (m) => console.log(`  ${m}`),
  ok: (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`),
  warn: (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`),
};

/* ---- download with on-disk cache ----------------------------------------*/
export async function downloadCached(url, destPath) {
  if (fs.existsSync(destPath)) {
    const mb = (fs.statSync(destPath).size / 1e6).toFixed(1);
    log.ok(`cached: ${path.basename(destPath)} (${mb} MB)`);
    return destPath;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  log.info(`downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  log.ok(`saved ${path.basename(destPath)} (${(buf.length / 1e6).toFixed(1)} MB)`);
  return destPath;
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
export function writeJson(p, obj, pretty = false) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj));
}

/* ---- equirectangular projection -----------------------------------------*
 * Convention (MUST match the runtime shader + picker exactly):
 *   x = (lng + 180) / 360 * W        lng -180 → x=0 ,  lng +180 → x=W
 *   y = (90  - lat) / 180 * H        lat  +90 → y=0 (north at TOP, row 0)
 */
export function lngToX(lng, width) {
  return ((lng + 180) / 360) * width;
}
export function latToY(lat, height) {
  return ((90 - lat) / 180) * height;
}

/* ---- province ID  <->  RGB encoding -------------------------------------*
 * id = R | (G << 8) | (B << 16). Supports up to ~16.7M provinces.
 */
export function idToRgb(id) {
  return [id & 0xff, (id >> 8) & 0xff, (id >> 16) & 0xff];
}

/* ---- nation color generation --------------------------------------------*
 * Golden-angle hue spacing → maximally spread, deterministic, distinct colors
 * that read well on the dark navy ocean. (Neighbor-aware graph coloring is a
 * documented Phase-2 upgrade; this is the founding pass.)
 */
export function nationColor(index) {
  const hue = (index * 137.508) % 360;
  const sat = 52 + ((index * 11) % 22); // 52–74%
  const light = 46 + ((index * 7) % 14); // 46–60%
  return hslToHex(hue, sat, light);
}

export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c);
  };
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/* ---- geometry helpers ----------------------------------------------------*/
/** Iterate every polygon ring in a Polygon/MultiPolygon geometry. */
export function eachRing(geometry, fn) {
  if (!geometry) return;
  if (geometry.type === 'Polygon') {
    fn(geometry.coordinates[0]); // outer ring only (good enough for ID fill)
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) fn(poly[0]);
  }
}

/** Area-weighted-ish centroid: centroid of the largest outer ring. [lat,lng]. */
export function centroidOf(geometry) {
  let best = null;
  let bestArea = -1;
  eachRing(geometry, (ring) => {
    const a = Math.abs(ringSignedArea(ring));
    if (a > bestArea) {
      bestArea = a;
      best = ring;
    }
  });
  if (!best) return [0, 0];
  let lng = 0;
  let lat = 0;
  for (const [x, y] of best) {
    lng += x;
    lat += y;
  }
  return [lat / best.length, lng / best.length];
}

function ringSignedArea(ring) {
  let area = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

/** Case-insensitive property getter (Natural Earth varies UPPER/lower case). */
export function prop(props, ...keys) {
  for (const k of keys) {
    if (props[k] != null) return props[k];
    const lower = k.toLowerCase();
    const upper = k.toUpperCase();
    if (props[lower] != null) return props[lower];
    if (props[upper] != null) return props[upper];
  }
  return undefined;
}
