/**
 * Owns the overlay palette texture: a 1-row RGBA float texture indexed by
 * province ID. Switching overlays recomputes target colors and CROSS-FADES the
 * palette over ~300ms (no jarring instant snap) — one tiny GPU upload per frame
 * during the fade, nothing re-uploaded on the globe geometry.
 */
import * as THREE from 'three';
import type { Nation, OverlayId, WorldData } from '@/types';
import { getOverlay } from '@/config/overlays';
import { hexToRgb } from '@/lib/color';
import { motion, color as tokenColor, mapViz } from '@/config/tokens';

/** Palette is a 2D texture so province count can exceed GL_MAX_TEXTURE_SIZE
 *  (district-level has ~50k provinces; a 1-row texture would overflow 16384). */
const PALETTE_W = 2048;

export class OverlayController {
  readonly texture: THREE.DataTexture;
  /** Static per-province terrain palette: rgb = terrain colour, a = style seed
   *  (0 = no terrain tint, i.e. sea provinces / ocean). Built once. */
  readonly terrainTexture: THREE.DataTexture;
  readonly width = PALETTE_W;
  readonly height: number;

  private from: Float32Array;
  private to: Float32Array;
  private data: Float32Array; // backing store for the texture (RGBA)
  private t = 1; // fade progress 0..1 (1 = settled)
  private readonly nationsById: Map<string, Nation>;
  private readonly provinces: WorldData['provinces'];

  constructor(world: WorldData) {
    this.height = Math.ceil((world.meta.provinceCount + 1) / PALETTE_W);
    this.provinces = world.provinces;
    this.nationsById = new Map(world.nations.map((n) => [n.id, n]));

    const texels = PALETTE_W * this.height * 4;
    this.data = new Float32Array(texels);
    this.from = new Float32Array(texels);
    this.to = new Float32Array(texels);

    this.texture = new THREE.DataTexture(this.data, PALETTE_W, this.height, THREE.RGBAFormat, THREE.FloatType);
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;

    // Seed with the sovereignty overlay, fully settled (no opening fade).
    this.computeInto(this.to, 'sovereignty');
    this.data.set(this.to);
    this.from.set(this.to);
    this.texture.needsUpdate = true;

    // Terrain palette (static — terrain types don't change at runtime).
    const tdata = new Float32Array(texels);
    const palette = mapViz.terrain.palette;
    const styleIndex = new Map(Object.keys(palette).map((k, i) => [k, i + 1]));
    for (const p of this.provinces) {
      const t = p.data.terrain;
      const hex = t && t !== 'OCEAN' ? palette[t] : undefined;
      if (!hex) continue;
      const c = hexToRgb(hex);
      const o = p.id * 4;
      tdata[o] = c.r;
      tdata[o + 1] = c.g;
      tdata[o + 2] = c.b;
      tdata[o + 3] = (styleIndex.get(t) ?? 1) / 32; // style seed for the grain
    }
    this.terrainTexture = new THREE.DataTexture(tdata, PALETTE_W, this.height, THREE.RGBAFormat, THREE.FloatType);
    this.terrainTexture.magFilter = THREE.NearestFilter;
    this.terrainTexture.minFilter = THREE.NearestFilter;
    this.terrainTexture.generateMipmaps = false;
    this.terrainTexture.needsUpdate = true;
  }

  /** Begin a cross-fade to a new overlay. */
  setOverlay(id: OverlayId) {
    this.from.set(this.data); // fade from whatever is on screen now
    this.computeInto(this.to, id);
    this.t = 0;
  }

  /** Mid-fade? (Keeps the render loop at full rate until the fade settles.) */
  get animating(): boolean {
    return this.t < 1;
  }

  /** Advance the fade; returns true while still animating. */
  update(dtSeconds: number): boolean {
    if (this.t >= 1) return false;
    this.t = Math.min(1, this.t + dtSeconds / motion.duration.slow);
    const e = easeOut(this.t);
    for (let i = 0; i < this.data.length; i++) {
      this.data[i] = this.from[i] + (this.to[i] - this.from[i]) * e;
    }
    this.texture.needsUpdate = true;
    return this.t < 1;
  }

  private computeInto(buf: Float32Array, id: OverlayId) {
    const overlay = getOverlay(id);
    const ocean = hexToRgb(tokenColor.navy);
    buf[0] = ocean.r;
    buf[1] = ocean.g;
    buf[2] = ocean.b;
    buf[3] = 1;
    for (const p of this.provinces) {
      const c = hexToRgb(overlay.colorFor(p, { nationsById: this.nationsById }));
      const o = p.id * 4;
      buf[o] = c.r;
      buf[o + 1] = c.g;
      buf[o + 2] = c.b;
      // Ownerless International Waters carry no tint — the open ocean reads as
      // one living sea, not a Voronoi patchwork (cells stay hover/selectable).
      buf[o + 3] = p.isSea && !p.nationId ? 0 : 1;
    }
  }
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
