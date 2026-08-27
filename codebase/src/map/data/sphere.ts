/**
 * Runtime spherification — turns the ETL's flat Equal-Earth geometry into 3D
 * positions on a globe of radius `GLOBE_R`. The ETL ships projected XY; here we
 * invert Equal-Earth (XY → lng/lat, the same Newton solve the old terrain shader
 * used) and place each vertex on the sphere. Done once at load, so every layer
 * (fills, borders, rivers, lakes, sea, cities) reuses the existing binaries with
 * no ETL change.
 *
 * Convention (must match the in-shader inverse used for relief/ocean):
 *   x = R·cos(lat)·sin(lng)
 *   y = R·sin(lat)
 *   z = R·cos(lat)·cos(lng)
 *   ⇒ lng = atan2(x, z),  lat = asin(y / R)
 * So (lng 0, lat 0) faces +Z (toward the camera at rest).
 */

export const GLOBE_R = 1.0;

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

/** Inverse Equal-Earth: projected (x,y) → [lngRad, latRad]. Clamps gracefully so
 *  stray edge vertices never produce NaN (every real data vertex is in-range). */
function invEqualEarth(x: number, y: number): [number, number] {
  let th = y;
  for (let i = 0; i < 8; i++) {
    const t2 = th * th, t6 = t2 * t2 * t2, t8 = t6 * t2;
    const f = A1 * th + A2 * th * t2 + A3 * th * t6 + A4 * th * t8 - y;
    const df = A1 + 3 * A2 * t2 + 7 * A3 * t6 + 9 * A4 * t8;
    th -= f / df;
  }
  const t2 = th * th, t6 = t2 * t2 * t2, t8 = t6 * t2;
  const denom = A1 + 3 * A2 * t2 + 7 * A3 * t6 + 9 * A4 * t8;
  let lng = (x * 3 * denom) / (2 * Math.sqrt(3) * Math.cos(th));
  let sinphi = Math.sin(th) / M;
  sinphi = Math.max(-1, Math.min(1, sinphi));
  lng = Math.max(-Math.PI, Math.min(Math.PI, lng));
  return [lng, Math.asin(sinphi)];
}

/** lng/lat (radians) → sphere XYZ at radius r. */
export function lonLatToSphere(lng: number, lat: number, r = GLOBE_R): [number, number, number] {
  const cl = Math.cos(lat);
  return [r * cl * Math.sin(lng), r * Math.sin(lat), r * cl * Math.cos(lng)];
}

/** Equal-Earth XY buffer (2 floats/vertex) → sphere XYZ buffer (3 floats/vertex). */
export function spherifyPositions(xy: Float32Array, r = GLOBE_R): Float32Array {
  const n = xy.length / 2;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [lng, lat] = invEqualEarth(xy[i * 2], xy[i * 2 + 1]);
    const cl = Math.cos(lat);
    out[i * 3] = r * cl * Math.sin(lng);
    out[i * 3 + 1] = r * Math.sin(lat);
    out[i * 3 + 2] = r * cl * Math.cos(lng);
  }
  return out;
}

/** Project a single Equal-Earth XY to sphere XYZ (for cities/labels). */
export function spherifyPoint(x: number, y: number, r = GLOBE_R): [number, number, number] {
  const [lng, lat] = invEqualEarth(x, y);
  return lonLatToSphere(lng, lat, r);
}
