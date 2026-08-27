/**
 * Equal Earth projection (Šavrič, Patterson & Jenny, 2018).
 *
 * An equal-AREA pseudocylindrical projection: every region's on-screen area is
 * proportional to its true area (so Africa dwarfs Greenland — unlike Mercator),
 * while still looking natural and sleek. We project in the ETL and ship the
 * resulting flat XY, so the runtime never needs the projection math.
 *
 * Input: lng/lat in degrees. Output: [x, y] in projection units
 * (x ≈ ±2.7, y ≈ ±1.3); the renderer fits these to the viewport.
 */
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;
const DEG = Math.PI / 180;

export function equalEarth(lngDeg, latDeg) {
  const lng = lngDeg * DEG;
  const lat = latDeg * DEG;
  const theta = Math.asin(M * Math.sin(lat));
  const t2 = theta * theta;
  const t6 = t2 * t2 * t2;
  const t8 = t6 * t2;
  const denom = A1 + 3 * A2 * t2 + 7 * A3 * t6 + 9 * A4 * t8;
  const x = (2 * Math.sqrt(3) * lng * Math.cos(theta)) / (3 * denom);
  const y = A1 * theta + A2 * theta * t2 + A3 * theta * t6 + A4 * theta * t8;
  return [x, y];
}

/** Inverse Equal Earth: projection XY → [lngDeg, latDeg]. Newton-solves the
 *  parametric latitude (same iteration the terrain shader uses). Returns null if
 *  the point is outside the map oval. */
export function invEqualEarth(x, y) {
  let th = y;
  for (let i = 0; i < 8; i++) {
    const t2 = th * th, t6 = t2 * t2 * t2, t8 = t6 * t2;
    const f = A1 * th + A2 * th * t2 + A3 * th * t6 + A4 * th * t8 - y;
    const df = A1 + 3 * A2 * t2 + 7 * A3 * t6 + 9 * A4 * t8;
    th -= f / df;
  }
  const t2 = th * th, t6 = t2 * t2 * t2, t8 = t6 * t2;
  const denom = A1 + 3 * A2 * t2 + 7 * A3 * t6 + 9 * A4 * t8;
  const lng = (x * 3 * denom) / (2 * Math.sqrt(3) * Math.cos(th));
  const sinphi = Math.sin(th) / M;
  if (Math.abs(sinphi) > 1 || Math.abs(lng) > Math.PI) return null;
  return [(lng / DEG), (Math.asin(sinphi) / DEG)];
}
