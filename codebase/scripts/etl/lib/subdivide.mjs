/**
 * SUBDIVIDE — keep spherified triangles hugging the globe.
 *
 * The runtime lifts each VERTEX onto the sphere, so a large triangle is a flat
 * chord whose middle sags below the opaque ocean shell by the sagitta
 * R·(1−cosθ) — far more than the ~0.0006R layer offsets once θ exceeds ~2°.
 * The middle then loses the depth test and the ocean shows through ("holes in
 * the Sahara"). This walks an earcut result and splits any triangle whose
 * longest edge exceeds `maxEdge` (projected units) at that edge's midpoint,
 * memoising midpoints per edge so neighbours split identically (no T-junction
 * cracks within a polygon).
 *
 *   flat       [x0,y0,x1,y1,...] polygon vertices (GROWS: midpoints appended)
 *   tris       earcut index output
 *   maxEdge    longest allowed edge (projected Equal-Earth units)
 *   onVertex   (x, y) called for every appended midpoint (mirror to buffers)
 *   onTriangle (a, b, c) called with LOCAL indices for every final triangle
 */
export function emitSubdividedTris(flat, tris, maxEdge, onVertex, onTriangle) {
  const px = (i) => flat[i * 2];
  const py = (i) => flat[i * 2 + 1];
  const d2 = (i, j) => {
    const dx = px(i) - px(j), dy = py(i) - py(j);
    return dx * dx + dy * dy;
  };
  const maxSq = maxEdge * maxEdge;
  const edgeMid = new Map();
  const stack = [];
  for (let i = 0; i < tris.length; i += 3) stack.push(tris[i], tris[i + 1], tris[i + 2]);
  while (stack.length) {
    const c = stack.pop(), b = stack.pop(), a = stack.pop();
    const ab = d2(a, b), bc = d2(b, c), ca = d2(c, a);
    const m = Math.max(ab, bc, ca);
    if (m <= maxSq) {
      onTriangle(a, b, c);
      continue;
    }
    let i0, i1, i2; // longest edge (i0,i1), opposite vertex i2
    if (m === ab) { i0 = a; i1 = b; i2 = c; }
    else if (m === bc) { i0 = b; i1 = c; i2 = a; }
    else { i0 = c; i1 = a; i2 = b; }
    const key = i0 < i1 ? i0 * 16777216 + i1 : i1 * 16777216 + i0;
    let mid = edgeMid.get(key);
    if (mid === undefined) {
      mid = flat.length / 2;
      const mx = (px(i0) + px(i1)) / 2;
      const my = (py(i0) + py(i1)) / 2;
      flat.push(mx, my);
      onVertex(mx, my);
      edgeMid.set(key, mid);
    }
    stack.push(i0, mid, i2, mid, i1, i2);
  }
}
