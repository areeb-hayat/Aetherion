/**
 * SMOOTH — topology-aware corner smoothing for the province mosaic.
 *
 * The simplified ADM2 polygons read as jagged straight-line zigzags when zoomed
 * in. We round them with an ADAPTIVE, JUNCTION-PINNED corner-cutting pass
 * (Chaikin-style) that is guaranteed crack-free:
 *
 *   • Adjacent provinces share IDENTICAL border polylines (mapshaper preserves
 *     topology), so any smoothing decision that depends only on a vertex and
 *     its two ring neighbours produces the SAME curve on both sides of a
 *     shared arc — the mosaic stays watertight.
 *   • Junction vertices (where the set of provinces owning the two incident
 *     edges differs — triple points, coast/border transitions) are PINNED so
 *     arcs meet exactly where they always did.
 *   • Adaptive: nearly-straight vertices and already-dense corners are kept,
 *     so vertex growth stays modest (corners get rounder, straight runs stay
 *     two points). Cut distance is capped so huge desert polygons don't grow
 *     100 km bevels.
 *
 * The dissolved-nations layer (international borders + backstop fill) follows
 * the same border polylines but lacks the districts' junction information, so
 * the province pass exports its pinned-vertex keys and the dissolved pass pins
 * those too — the national outline then matches the district fills exactly.
 *
 * Also exports a plain endpoint-anchored smoother for open polylines (rivers).
 */

const KEY_SCALE = 1e4; // quantization for vertex identity (~11 m — well below data spacing)
// Per-iteration straightness gates: the first pass rounds every real corner
// (sharper than 10°); later passes only refine corners that are STILL sharp
// (>16° — i.e. original corners >32°). This keeps vertex growth ~2× instead of
// the ~3.2× of uniform passes, with no visible loss (shallow kinks read smooth).
const STRAIGHT_BY_ITER = [
  Math.cos((10 * Math.PI) / 180),
  Math.cos((16 * Math.PI) / 180),
  Math.cos((24 * Math.PI) / 180),
];
const MINSEG = 0.024; // deg — corners with both edges tinier than this are dense enough
const MAXCUT = 0.12; // deg — cap the cut length so long edges get tight round corners
const EPS = 1e-9;

const vkey = (x, y) => `${Math.round(x * KEY_SCALE)},${Math.round(y * KEY_SCALE)}`;
const ekey = (ax, ay, bx, by) => {
  const ka = vkey(ax, ay);
  const kb = vkey(bx, by);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

const eachPolygon = (geometry, fn) => {
  if (!geometry) return;
  if (geometry.type === 'Polygon') fn(geometry.coordinates);
  else if (geometry.type === 'MultiPolygon') for (const poly of geometry.coordinates) fn(poly);
};

/** ring (closed, GeoJSON) → open point list; returns null if degenerate. */
function openRing(ring) {
  if (!ring || ring.length < 4) return null;
  const n = ring.length;
  const closed =
    ring[0][0] === ring[n - 1][0] && ring[0][1] === ring[n - 1][1];
  return closed ? ring.slice(0, n - 1) : ring.slice();
}

/** Map of edge key → canonical owner-set string ("3" / "3,17"). */
function buildEdgeOwners(items) {
  const owners = new Map();
  items.forEach((item, idx) => {
    eachPolygon(item.geometry, (rings) => {
      for (const ring of rings) {
        const pts = openRing(ring);
        if (!pts) continue;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          const k = ekey(a[0], a[1], b[0], b[1]);
          const arr = owners.get(k);
          if (arr === undefined) owners.set(k, [idx]);
          else if (arr[arr.length - 1] !== idx) arr.push(idx);
        }
      }
    });
  });
  // canonicalise to comparable strings
  for (const [k, arr] of owners) owners.set(k, arr.sort((a, b) => a - b).join(','));
  return owners;
}

/**
 * One adaptive corner-cut iteration over a CLOSED ring.
 * `pin` flags travel with their vertices; new cut points are never pinned.
 * Every decision uses only (prev, v, next), so it is symmetric under ring
 * reversal — both provinces sharing an arc emit identical curves.
 */
function cutClosed(pts, pin, straight) {
  const n = pts.length;
  const out = [];
  const outPin = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n];
    const v = pts[i];
    const q = pts[(i + 1) % n];
    if (pin[i]) {
      out.push(v);
      outPin.push(true);
      continue;
    }
    const d1x = v[0] - p[0], d1y = v[1] - p[1];
    const d2x = q[0] - v[0], d2y = q[1] - v[1];
    const d1 = Math.hypot(d1x, d1y);
    const d2 = Math.hypot(d2x, d2y);
    if (d1 < EPS || d2 < EPS || d1 + d2 < MINSEG) {
      out.push(v);
      outPin.push(false);
      continue;
    }
    const dot = (d1x * d2x + d1y * d2y) / (d1 * d2);
    if (dot > straight) {
      out.push(v);
      outPin.push(false);
      continue;
    }
    const t1 = Math.min(0.25, MAXCUT / d1);
    const t2 = Math.min(0.25, MAXCUT / d2);
    out.push([v[0] - d1x * t1, v[1] - d1y * t1]);
    outPin.push(false);
    out.push([v[0] + d2x * t2, v[1] + d2y * t2]);
    outPin.push(false);
  }
  return { pts: out, pin: outPin };
}

/**
 * Smooth every geometry in `items` IN PLACE (rings are replaced).
 *
 * options:
 *   iterations     rounds of corner cutting (default 2)
 *   extraPinKeys   Set of vertex keys that must ALSO be pinned (cross-layer)
 *   collectPinKeys Set to receive the vertex keys this pass pinned
 *
 * Geometry objects that appear in multiple items are smoothed once.
 */
export function smoothMosaic(items, { iterations = 2, extraPinKeys = null, collectPinKeys = null } = {}) {
  const owners = buildEdgeOwners(items);
  const done = new WeakSet();
  let before = 0;
  let after = 0;

  for (const item of items) {
    const g = item.geometry;
    if (!g || done.has(g)) continue;
    done.add(g);
    eachPolygon(g, (rings) => {
      for (let r = 0; r < rings.length; r++) {
        const pts = openRing(rings[r]);
        if (!pts) continue;
        before += pts.length;
        const n = pts.length;
        // Initial pin flags from edge ownership + cross-layer keys.
        const pin = new Array(n);
        for (let i = 0; i < n; i++) {
          const p = pts[(i + n - 1) % n];
          const v = pts[i];
          const q = pts[(i + 1) % n];
          const oPrev = owners.get(ekey(p[0], p[1], v[0], v[1]));
          const oNext = owners.get(ekey(v[0], v[1], q[0], q[1]));
          let pinned = oPrev !== oNext;
          if (!pinned && extraPinKeys && extraPinKeys.has(vkey(v[0], v[1]))) pinned = true;
          pin[i] = pinned;
          if (pinned && collectPinKeys) collectPinKeys.add(vkey(v[0], v[1]));
        }
        let cur = { pts, pin };
        for (let it = 0; it < iterations; it++)
          cur = cutClosed(cur.pts, cur.pin, STRAIGHT_BY_ITER[Math.min(it, STRAIGHT_BY_ITER.length - 1)]);
        after += cur.pts.length;
        const closed = cur.pts.slice();
        closed.push(closed[0]);
        rings[r] = closed;
      }
    });
  }
  return { before, after };
}

/**
 * Endpoint-anchored adaptive smoothing for an OPEN polyline (rivers). Same
 * corner-cut rules, endpoints fixed. Returns a new array of [x, y] points.
 */
export function smoothOpenLine(points, iterations = 2, { minSeg = 0.02, maxCut = 0.08 } = {}) {
  // Decimate ultra-dense source runs first — ribbon vertices are expensive.
  let pts = points;
  if (pts.length > 2) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const q = out[out.length - 1];
      if (Math.hypot(pts[i][0] - q[0], pts[i][1] - q[1]) >= 0.008) out.push(pts[i]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  for (let it = 0; it < iterations; it++) {
    if (pts.length < 3) return pts;
    const straight = STRAIGHT_BY_ITER[Math.min(it, STRAIGHT_BY_ITER.length - 1)];
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i - 1];
      const v = pts[i];
      const q = pts[i + 1];
      const d1x = v[0] - p[0], d1y = v[1] - p[1];
      const d2x = q[0] - v[0], d2y = q[1] - v[1];
      const d1 = Math.hypot(d1x, d1y);
      const d2 = Math.hypot(d2x, d2y);
      if (d1 < EPS || d2 < EPS || d1 + d2 < minSeg) {
        out.push(v);
        continue;
      }
      const dot = (d1x * d2x + d1y * d2y) / (d1 * d2);
      if (dot > straight) {
        out.push(v);
        continue;
      }
      const t1 = Math.min(0.25, maxCut / d1);
      const t2 = Math.min(0.25, maxCut / d2);
      out.push([v[0] - d1x * t1, v[1] - d1y * t1]);
      out.push([v[0] + d2x * t2, v[1] + d2y * t2]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}
