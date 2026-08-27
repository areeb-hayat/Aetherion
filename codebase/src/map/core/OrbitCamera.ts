/**
 * Perspective orbit camera for the 3D globe. The globe is fixed at the origin;
 * the camera orbits it (longitude/latitude) and dollies in/out (distance). A
 * perspective projection means the visible patch naturally flattens out as you
 * approach the surface — the "Google Earth" feel — so edge countries (NZ, the
 * poles) read correctly instead of warping at a flat map's rim.
 */
import * as THREE from 'three';
import { GLOBE_R } from '@/map/data/sphere';
import { GLOBE } from '@/config/gameConfig';

const clamp = THREE.MathUtils.clamp;

export class OrbitCamera {
  readonly camera: THREE.PerspectiveCamera;

  private lng = 0;            // camera azimuth (radians)
  private lat = 0.35;         // camera latitude (radians)
  private dist: number = GLOBE.maxDist;
  private tLng = 0;
  private tLat = 0.35;
  private tDist: number = GLOBE.maxDist;
  private w = 1;
  private h = 1;
  private pos = new THREE.Vector3();

  constructor() {
    this.camera = new THREE.PerspectiveCamera(GLOBE.fov, 1, 0.01, 100);
    this.apply();
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = Math.max(1, h);
    this.camera.aspect = w / this.h;
    this.camera.updateProjectionMatrix();
  }

  /** Drag → rotate the globe. Rotation slows as you zoom in (grab feel). */
  rotateByPixels(dx: number, dy: number) {
    const fovY = (this.camera.fov * Math.PI) / 180;
    const k = (fovY / this.h) * clamp((this.tDist - GLOBE_R) / this.tDist, 0.12, 1.0);
    this.tLng -= dx * k;
    this.tLat = clamp(this.tLat + dy * k, -GLOBE.maxLat, GLOBE.maxLat);
  }

  /** Wheel → dolly toward / away from the surface. */
  zoomBy(factor: number) {
    this.tDist = clamp(this.tDist * factor, GLOBE.minDist, GLOBE.maxDist);
  }

  /** Continuous slow spin for the menu backdrop. Nudges the current AND target
   *  azimuth together so orbit damping never fights the rotation. */
  orbit(dLng: number) {
    this.lng += dLng;
    this.tLng += dLng;
  }

  /** Ease the camera to frame a point on the globe (used by the country picker
   *  and the campaign-entry intro). Chooses the nearest equivalent azimuth so
   *  the globe never spins the long way around. */
  flyTo(lng: number, lat: number, dist: number) {
    const twoPi = Math.PI * 2;
    let d = ((lng - this.tLng + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
    this.tLng = this.tLng + d;
    this.tLat = clamp(lat, -GLOBE.maxLat, GLOBE.maxLat);
    this.tDist = clamp(dist, GLOBE.minDist, GLOBE.maxDist);
  }

  update(dt: number) {
    const k = 1 - Math.pow(1 - GLOBE.damping, dt * 60);
    this.lng += (this.tLng - this.lng) * k;
    this.lat += (this.tLat - this.lat) * k;
    this.dist += (this.tDist - this.dist) * k;
    this.apply();
  }

  /** True once the inertial easing has converged — the camera is visually
   *  still. Gates the render-on-demand idle throttle (see GlobeScene.loop). */
  get settled() {
    return (
      Math.abs(this.tLng - this.lng) + Math.abs(this.tLat - this.lat) < 1e-4 &&
      Math.abs(this.tDist - this.dist) < 1e-4
    );
  }

  /** Altitude above the surface (0 at the ground). Drives layer reveals. */
  get altitude() {
    return this.dist - GLOBE_R;
  }
  /** 0 (fully zoomed out) → 1 (at the surface). */
  get zoom01() {
    return clamp(1 - (this.dist - GLOBE.minDist) / (GLOBE.maxDist - GLOBE.minDist), 0, 1);
  }
  get distance() {
    return this.dist;
  }

  /** Project a world point to canvas pixels; also reports if it's on the near
   *  (visible) hemisphere — points beyond the horizon are culled by callers. */
  worldToScreen(p: THREE.Vector3, out: { x: number; y: number }): boolean {
    const v = p.clone().project(this.camera);
    out.x = (v.x * 0.5 + 0.5) * this.w;
    out.y = (-v.y * 0.5 + 0.5) * this.h;
    // On the visible hemisphere when the surface point faces the camera enough
    // to clear the horizon: cos(angle) > R / dist.
    const facing = p.clone().normalize().dot(this.pos.clone().normalize());
    return facing > GLOBE_R / this.dist && v.z < 1;
  }

  resetTo() {
    this.tLng = 0;
    this.tLat = 0.35;
    this.tDist = GLOBE.maxDist;
  }

  private apply() {
    const cl = Math.cos(this.lat);
    this.pos.set(
      this.dist * cl * Math.sin(this.lng),
      this.dist * Math.sin(this.lat),
      this.dist * cl * Math.cos(this.lng),
    );
    this.camera.position.copy(this.pos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    // Keep depth precision tight around the globe shell.
    this.camera.near = Math.max(0.005, this.dist - GLOBE_R * 1.6);
    this.camera.far = this.dist + GLOBE_R * 1.6;
    this.camera.updateProjectionMatrix();
  }
}
