/**
 * GlobeScene — the 3D-globe renderer. Replaces the old flat Equal-Earth scene.
 * The ETL still ships flat Equal-Earth geometry; at load we spherify every layer
 * (see sphere.ts) onto a globe of radius GLOBE_R and orbit it with a perspective
 * camera (OrbitCamera) so zooming in flattens the view like Google Earth and
 * edge countries (NZ, the poles) render correctly.
 *
 * Occlusion is depth-based: an opaque ocean sphere is the base globe; opaque land
 * fills sit just above it and write depth, so the far hemisphere of every
 * translucent/overlay layer is correctly hidden. An atmosphere shell adds the rim.
 *
 * Layer order (radii ascending, render via depth + renderOrder):
 *   ocean → fills → relief → sea tint → lakes → rivers → borders → cities → atmosphere
 */
import * as THREE from 'three';
import type { FlatMapData } from '@/map/data/mapLoader';
import { GLOBE_R, spherifyPositions, spherifyPoint } from '@/map/data/sphere';
import {
  fillVertex,
  fillFragment,
  oceanVertex,
  oceanFragment,
  lakeVertex,
  lakeFragment,
  riverVertex,
  riverFragment,
  overlayVertex,
  reliefFragment,
  satelliteFragment,
  atmosphereVertex,
  atmosphereFragment,
  quadVertex,
  compositeFragment,
} from '@/map/shaders/globe.glsl';
import { DATA, GLOBE, PICK } from '@/config/gameConfig';
import { OverlayController } from './OverlayController';
import { OrbitCamera } from './OrbitCamera';
import { detectQuality } from './quality';
import { hexToRgb } from '@/lib/color';
import { color, mapViz } from '@/config/tokens';
import { useUIStore } from '@/store/uiStore';
import { useSessionStore, type Screen } from '@/store/sessionStore';
import { useDiplomacyStore } from '@/store/diplomacyStore';
import { getProvince } from '@/store/worldStore';
import { useLabelStore, type CityLabel } from '@/store/labelStore';
import { registerMapControl } from '@/map/mapControl';

const v3 = (hex: string) => {
  const c = hexToRgb(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
};
// Per-layer radius offsets (in globe radii). Two competing constraints:
//   • spread layers apart so coplanar surfaces don't z-fight;
//   • keep them TIGHT so borders/rivers don't visibly part company from the fill
//     edges at grazing angles / extreme zoom (parallax between shells).
// The whole map stack is squeezed into a thin ~0.0002R band just above the fill,
// with paint order resolved by renderOrder (not radius), so borders trace the
// fill colour exactly. Depth-occlusion of the far hemisphere still works because
// every layer depth-tests against the opaque fill + ocean below it.
const R = {
  ocean: GLOBE_R,
  backstop: GLOBE_R * 1.00050, // solid nation fill BELOW districts; shows only in gaps
  fill: GLOBE_R * 1.00060,
  sea: GLOBE_R * 1.00064,
  lake: GLOBE_R * 1.00066,
  river: GLOBE_R * 1.00068,
  maritime: GLOBE_R * 1.00069,
  borderInt: GLOBE_R * 1.00070,
  relief: GLOBE_R * 1.00072,
  border: GLOBE_R * 1.00074,
  satellite: GLOBE_R * 1.00090,
  city: GLOBE_R * 1.0020,
  atmosphere: GLOBE_R * 1.16,
};

export class GlobeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private pickScene = new THREE.Scene();
  private cam: OrbitCamera;
  private clock = new THREE.Clock();

  private overlay: OverlayController;
  private fillMat: THREE.ShaderMaterial;
  private seaMat?: THREE.ShaderMaterial;
  private oceanMat: THREE.ShaderMaterial;
  private lakeMat!: THREE.ShaderMaterial;
  private reliefMat: THREE.ShaderMaterial;
  private satelliteMat: THREE.ShaderMaterial;
  private internalBorderMat!: THREE.LineBasicMaterial;
  private riverMat?: THREE.ShaderMaterial;
  private riverMesh?: THREE.Mesh;

  private reliefMesh: THREE.Mesh;
  private satelliteMesh: THREE.Mesh;
  private internalObjs: THREE.Object3D[] = [];
  private reliefReveal = 0;
  private reliefTarget = 0;
  private satelliteActive = false;
  private cityHighlightsOn = 1; // city-province tints only on the sovereignty view
  private terrainColorsOn = 0; // terrain colours belong to the Terrain view only

  private cities: FlatMapData['cities'];
  private cityWorld: THREE.Vector3[] = [];
  private labelAccum = 0;

  // -- interaction mode (menu backdrop / new-game country picker / play) -----
  private mode: 'menu' | 'setup' | 'play' = 'play';
  private nationIndex = new Map<string, number>(); // nation id → 1-based index (0 = none)
  private nationCentroid = new Map<string, { lng: number; lat: number; dist: number }>();
  private hoverNationIdx = 0; // nation under the cursor on the setup screen
  private committedNationIdx = 0; // the reviewed (clicked) setup nation

  private compositeMat: THREE.ShaderMaterial;
  private sceneRT: THREE.WebGLRenderTarget;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  private pickTarget: THREE.WebGLRenderTarget;
  private pickBuffer = new Uint8Array(4);

  private raf = 0;
  private disposed = false;
  private lastPick = 0;
  private dragging = false;
  private moved = 0;
  private last = { x: 0, y: 0 };
  private unsub: Array<() => void> = [];

  // -- render-on-demand (GLOBE.idle): full fps while anything moves, ambient
  //    cadence once everything settles. wake() restores full rate instantly.
  private lastActivity = performance.now();
  private lastRender = 0;
  private reliefSettled = true;

  constructor(
    private container: HTMLElement,
    private canvas: HTMLCanvasElement,
    data: FlatMapData,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    const q = detectQuality(this.renderer);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.tier.pixelRatio));
    this.renderer.setClearColor(new THREE.Color(mapViz.post.space), 1);
    if (import.meta.env.DEV) console.info(`[globe] GPU="${q.gpu}" → ${q.name} quality`);

    this.cam = new OrbitCamera();
    this.overlay = new OverlayController(data.world);
    this.cities = data.cities;

    const opts = { depthBuffer: true, stencilBuffer: false };
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, opts);
    this.pickTarget = new THREE.WebGLRenderTarget(1, 1, opts);

    // -- ocean: the opaque base globe -------------------------------------
    this.oceanMat = new THREE.ShaderMaterial({
      vertexShader: oceanVertex,
      fragmentShader: oceanFragment,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: v3(mapViz.ocean.deep) },
        uShallow: { value: v3(mapViz.ocean.shallow) },
        uGlow: { value: v3(mapViz.ocean.glow) },
        uShimmer: { value: mapViz.ocean.shimmer },
        uFlow: { value: mapViz.ocean.flowSpeed },
        uGlint: { value: mapViz.ocean.glint },
        uShore: { value: null },
        uShoreOn: { value: 0 },
        uShoreShimmer: { value: mapViz.ocean.shore.shimmerBoost },
        uShoreGlint: { value: mapViz.ocean.shore.glintBoost },
        uShoreLift: { value: mapViz.ocean.shore.colorLift },
        uShorePulse: { value: mapViz.ocean.shore.pulse },
      },
    });
    const oceanMesh = new THREE.Mesh(new THREE.SphereGeometry(R.ocean, 128, 96), this.oceanMat);
    oceanMesh.renderOrder = -10;
    this.scene.add(oceanMesh);

    // Pick backstop: an opaque, id-0 (black) globe in the PICK scene. Without
    // it a pick ray through a sliver gap between province polygons sails on and
    // hits the far hemisphere — hovering a Kashmir seam reported the antipodal
    // Pacific EEZ ("French Polynesia Waters" at Siachen, "Chile Waters" off
    // Dhaka). Black decodes as id 0 = no province.
    const pickOcean = new THREE.Mesh(
      new THREE.SphereGeometry(R.ocean, 96, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000 }),
    );
    this.pickScene.add(pickOcean);

    // -- province fills ----------------------------------------------------
    // City-class texture: each city province carries its settlement class so
    // the WHOLE province can glow (1 = capital, 2 = major city, 3 = town).
    const cityCls = this.buildCityClassTexture(data.cities);
    // Nation-index texture (province id → 1-based nation index) + per-nation
    // framing centroids, so the country picker can spotlight and fly to a whole
    // nation from a single uniform.
    const nationTex = this.buildNationTexture(data);
    this.buildNationCentroids(data);
    // Shared uniform factory — the sea material reuses the fill shader with the
    // terrain/city features switched off.
    const T2 = mapViz.terrain;
    const C = mapViz.city;
    const fillUniforms = (): Record<string, THREE.IUniform> => ({
      uPalette: { value: this.overlay.texture },
      uPaletteW: { value: this.overlay.width },
      uPaletteH: { value: this.overlay.height },
      uHoveredId: { value: -1 },
      uSelectedId: { value: -1 },
      uPickMode: { value: 0 },
      uTime: { value: 0 },
      uFillAlpha: { value: 1 },
      uHoverTint: { value: v3(color.white) },
      uSelectTint: { value: v3(color.gold) },
      uSat: { value: mapViz.fill.saturation },
      uTone: { value: v3(mapViz.fill.tone) },
      uToneAmt: { value: mapViz.fill.toneAmount },
      uShadeAmt: { value: 1 },
      uHoverAmt: { value: mapViz.fill.hoverTintAmount },
      uHoverBright: { value: mapViz.fill.hoverBrighten },
      uSelectWash: { value: new THREE.Vector2(mapViz.fill.selectWash, mapViz.fill.selectPulse) },
      uSelectBright: { value: mapViz.fill.selectBrighten },
      uDimOthers: { value: mapViz.fill.dimOthers },
      // whole-nation spotlight (New Game country picker)
      uNationTex: { value: nationTex },
      uHiNation: { value: 0 },
      // terrain character (driven per-frame by the relief reveal)
      uTerrainPal: { value: this.overlay.terrainTexture },
      uElev: { value: null },
      uTerrainMix: { value: 0 },
      uTintFloor: { value: mapViz.fill.tintFloor },
      uGrain: { value: T2.grain },
      uGrainAtt: { value: 0 },
      uSnow: { value: v3(T2.snow) },
      uSnowStart: { value: T2.snowStart },
      // city provinces (reveals driven per-frame by altitude bands)
      uCityCls: { value: cityCls },
      uCapTint: { value: v3(C.capital) },
      uCapStrength: { value: C.capitalStrength },
      uCapReveal: { value: 0 },
      uMajTint: { value: v3(C.major) },
      uMajStrength: { value: C.majorStrength },
      uMajReveal: { value: 0 },
      uTownTint: { value: v3(C.town) },
      uTownStrength: { value: C.townStrength },
      uTownReveal: { value: 0 },
    });
    this.fillMat = new THREE.ShaderMaterial({
      vertexShader: fillVertex,
      fragmentShader: fillFragment,
      uniforms: fillUniforms(),
      side: THREE.DoubleSide, // earcut winding varies post-spherify; far side is depth-occluded
      depthTest: true,
      depthWrite: true,
    });
    const fillGeo = sphereGeo(spherifyPositions(data.fill, R.fill), { aId: data.fillId }, data.fillIdx);
    const fillMesh = new THREE.Mesh(fillGeo, this.fillMat);
    fillMesh.renderOrder = 0;
    this.scene.add(fillMesh);
    const pickMesh = new THREE.Mesh(fillGeo, this.fillMat);
    this.pickScene.add(pickMesh);

    // -- backstop: solid dissolved-nation fill beneath the districts, so the gaps
    //    between simplified district polygons show the nation colour instead of
    //    the dark ocean sphere ("dark blue patches"). Same palette material, so
    //    it limb-darkens + recolours with overlays identically. Not pickable.
    if (data.fillBk.length > 0) {
      const bkGeo = sphereGeo(spherifyPositions(data.fillBk, R.backstop), { aId: data.fillBkId }, data.fillBkIdx);
      const bkMesh = new THREE.Mesh(bkGeo, this.fillMat);
      bkMesh.renderOrder = -5; // after the ocean (-10), before the district fills (0)
      this.scene.add(bkMesh);
    }

    // -- relief (hillshade, multiplied over fills) ------------------------
    const T = mapViz.terrain;
    const az = (T.lightAz * Math.PI) / 180, alt = (T.lightAlt * Math.PI) / 180;
    const lightDir = new THREE.Vector3(
      Math.cos(alt) * Math.sin(az),
      Math.cos(alt) * Math.cos(az),
      Math.sin(alt),
    );
    this.reliefMat = new THREE.ShaderMaterial({
      vertexShader: overlayVertex,
      fragmentShader: reliefFragment,
      uniforms: {
        uElev: { value: null },
        uElevTexel: { value: new THREE.Vector2(1 / 4096, 1 / 2048) },
        uLightDir: { value: lightDir },
        uExagg: { value: T.exaggeration },
        uAmbient: { value: T.ambient },
        uReveal: { value: 0 },
        uShadowTint: { value: v3(T.shadowTint) },
        uLightTint: { value: v3(T.lightTint) },
      },
      transparent: true,
      blending: THREE.MultiplyBlending,
      depthTest: true,
      depthWrite: false,
    });
    // 512×256 segments: at 192 the sphere's chord sag (R·(1−cos(π/192)) ≈
    // 1.3e-4·R) exceeds the 1.2e-4·R shell gap above the (subdivided, tight)
    // fill, so the whole relief pass loses the depth test and vanishes.
    this.reliefMesh = new THREE.Mesh(new THREE.SphereGeometry(R.relief, 512, 256), this.reliefMat);
    this.reliefMesh.renderOrder = 0.5;
    this.reliefMesh.visible = false;
    this.scene.add(this.reliefMesh);

    // -- satellite (Blue Marble; SAT overlay only) ------------------------
    this.satelliteMat = new THREE.ShaderMaterial({
      vertexShader: overlayVertex,
      fragmentShader: satelliteFragment,
      uniforms: { uTex: { value: null }, uOpacity: { value: 1 } },
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    this.satelliteMesh = new THREE.Mesh(new THREE.SphereGeometry(R.satellite, 192, 128), this.satelliteMat);
    this.satelliteMesh.renderOrder = 6;
    this.satelliteMesh.visible = false;
    this.scene.add(this.satelliteMesh);

    // posToUV puts the north pole at v = 0 (first image row), so equirect
    // textures must NOT be flipped — with the default flipY the DEM samples
    // mirrored latitude: the Alps read as South-Atlantic sea and the whole
    // relief pass discards itself.
    const texLoad = new THREE.TextureLoader();
    texLoad.load(DATA.map.terrain, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      this.satelliteMat.uniforms.uTex.value = tex;
    });
    texLoad.load(DATA.map.elevation, (tex) => {
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      const img = tex.image as { width?: number; height?: number };
      if (img?.width && img?.height)
        this.reliefMat.uniforms.uElevTexel.value.set(1 / img.width, 1 / img.height);
      this.reliefMat.uniforms.uElev.value = tex;
      this.fillMat.uniforms.uElev.value = tex; // snowline in the fill shader
    });
    // Distance-to-coast field (built by `pnpm etl:sea`) → coastal water pulse.
    // Optional: the ocean simply stays calm if the texture isn't built yet.
    texLoad.load(DATA.map.shore, (tex) => {
      tex.colorSpace = THREE.NoColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      this.oceanMat.uniforms.uShore.value = tex;
      this.oceanMat.uniforms.uShoreOn.value = 1;
    }, undefined, () => void 0);

    // -- sea provinces (faint owner tint, selectable) ---------------------
    if (data.seaFill.length > 0) {
      const seaUniforms = fillUniforms();
      seaUniforms.uFillAlpha.value = mapViz.sea.tintOpacity;
      seaUniforms.uSat.value = 1;
      seaUniforms.uToneAmt.value = 0;
      seaUniforms.uShadeAmt.value = 0.5;
      seaUniforms.uDimOthers.value = 1; // the faint EEZ tints don't join the focus dim
      this.seaMat = new THREE.ShaderMaterial({
        vertexShader: fillVertex,
        fragmentShader: fillFragment,
        uniforms: seaUniforms,
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      });
      const seaGeo = sphereGeo(spherifyPositions(data.seaFill, R.sea), { aId: data.seaId }, data.seaIdx);
      const seaMesh = new THREE.Mesh(seaGeo, this.seaMat);
      seaMesh.renderOrder = 1;
      this.scene.add(seaMesh);
      const seaPick = new THREE.Mesh(seaGeo, this.fillMat);
      this.pickScene.add(seaPick);
      this.scene.add(lineLayer(spherifyPositions(data.seaBorders, R.maritime), mapViz.border.maritime, mapViz.border.maritimeOpacity, 4.15));
    }

    // -- lakes (shaded flowing water, not flat dark holes) ----------------
    this.lakeMat = new THREE.ShaderMaterial({
      vertexShader: lakeVertex,
      fragmentShader: lakeFragment,
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: v3(mapViz.lake.deep) },
        uShallow: { value: v3(mapViz.lake.shallow) },
        uGlow: { value: v3(mapViz.lake.glow) },
        uShimmer: { value: mapViz.lake.shimmer },
        uFlow: { value: mapViz.lake.flowSpeed },
        uGlint: { value: mapViz.lake.glint },
      },
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    });
    const lakeMesh = new THREE.Mesh(sphereGeo(spherifyPositions(data.lakes, R.lake), {}, data.lakesIdx), this.lakeMat);
    lakeMesh.renderOrder = 2;
    this.scene.add(lakeMesh);

    // -- rivers: tapered flowing-water ribbons -----------------------------
    const riverGeo = buildRiverRibbons(data.rivers, R.river);
    if (riverGeo) {
      const RV = mapViz.river;
      this.riverMat = new THREE.ShaderMaterial({
        vertexShader: riverVertex,
        fragmentShader: riverFragment,
        uniforms: {
          uTime: { value: 0 },
          uBoost: { value: 1 },
          uCore: { value: v3(RV.core) },
          uMid: { value: v3(RV.mid) },
          uBank: { value: v3(RV.bank) },
          uGlint: { value: v3(RV.glint) },
          uFlow: { value: RV.flowSpeed },
          uOpacity: { value: RV.opacity },
          uZoom: { value: 0 },
          uFadeMajor: { value: new THREE.Vector2(...RV.fadeMajor) },
          uFadeMinor: { value: new THREE.Vector2(...RV.fadeMinor) },
        },
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: true,
        depthWrite: false,
      });
      this.riverMesh = new THREE.Mesh(riverGeo, this.riverMat);
      this.riverMesh.frustumCulled = false;
      this.riverMesh.renderOrder = 3;
      this.riverMesh.visible = false;
      this.scene.add(this.riverMesh);
    }

    // -- borders -----------------------------------------------------------
    const internalSeg = internalBorderLayer(spherifyPositions(data.bordersInternal, R.borderInt), data.bordersInternalCol);
    this.internalBorderMat = internalSeg.material as THREE.LineBasicMaterial;
    this.internalObjs = [internalSeg];
    this.scene.add(internalSeg);
    this.scene.add(lineLayer(spherifyPositions(data.bordersIntl, R.border), mapViz.border.intl, mapViz.border.intlOpacity, 4.1));

    // -- city label anchors (cities render as coloured PROVINCES, not dots;
    //    only their name labels need world positions) ------------------------
    for (const c of data.cities) {
      const [x, y, z] = spherifyPoint(c.x, c.y, R.city);
      this.cityWorld.push(new THREE.Vector3(x, y, z));
    }

    // -- atmosphere rim ----------------------------------------------------
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: {
        uColor: { value: v3(mapViz.globe.atmosphere) },
        uStrength: { value: mapViz.globe.atmosphereStrength },
      },
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
    const atmos = new THREE.Mesh(new THREE.SphereGeometry(R.atmosphere, 64, 48), atmosMat);
    atmos.renderOrder = 20;
    this.scene.add(atmos);

    // -- final composite (vignette + grade) -------------------------------
    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: quadVertex,
      fragmentShader: compositeFragment,
      uniforms: {
        uScene: { value: this.sceneRT.texture },
        uVignette: { value: mapViz.post.vignette },
        uGradeShadow: { value: v3(mapViz.post.gradeShadow) },
        uGradeHi: { value: v3(mapViz.post.gradeHighlight) },
        uGradeStrength: { value: mapViz.post.gradeStrength },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMat);
    quad.frustumCulled = false;
    this.quadScene.add(quad);

    // -- store bindings ----------------------------------------------------
    this.unsub.push(
      useUIStore.subscribe((s, prev) => {
        if (s.activeOverlay !== prev.activeOverlay) {
          this.overlay.setOverlay(s.activeOverlay);
          this.reliefTarget = s.activeOverlay === 'terrain' ? 1 : 0;
          this.satelliteActive = s.activeOverlay === 'satellite';
          // Gold capitals over a GDP heat map would lie — political view only.
          this.cityHighlightsOn = s.activeOverlay === 'sovereignty' ? 1 : 0;
          // Terrain colours stay on the Terrain view; Sovereignty keeps its
          // political fills at every zoom (relief shading still applies).
          this.terrainColorsOn = s.activeOverlay === 'terrain' ? 1 : 0;
          this.wake();
        }
        if (s.selectedProvinceId !== prev.selectedProvinceId) {
          this.fillMat.uniforms.uSelectedId.value = s.selectedProvinceId ?? -1;
          if (this.seaMat) this.seaMat.uniforms.uSelectedId.value = s.selectedProvinceId ?? -1;
          this.wake();
        }
      }),
    );

    // -- session bindings: drive the interaction mode + country picker -------
    // NB: wake only on REAL transitions — sessionStore also mutates on every
    // 2s autosave, which must not hold the renderer at full rate.
    this.unsub.push(
      useSessionStore.subscribe((s, prev) => {
        if (s.screen !== prev.screen) {
          this.applyScreen(s.screen);
          this.wake();
        }
        if (s.setupNationId !== prev.setupNationId) {
          this.onSetupNationChanged(s.setupNationId);
          this.wake();
        }
      }),
    );
    this.applyScreen(useSessionStore.getState().screen);

    // -- diplomacy binding: the DIP/COA overlays are LIVE — recolour when any
    //    relationship changes while one of them is on screen.
    this.unsub.push(
      useDiplomacyStore.subscribe((s, prev) => {
        if (s.rev === prev.rev) return;
        const active = useUIStore.getState().activeOverlay;
        if (active === 'diplomatic' || active === 'coalition') {
          this.overlay.setOverlay(active);
          this.wake();
        }
      }),
    );

    // -- events ------------------------------------------------------------
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('resize', this.resize);

    this.resize();
    this.loop();

    registerMapControl({
      zoomBy: (f) => this.cam.zoomBy(f),
      resetView: () => this.cam.resetTo(),
    });

    if (import.meta.env.DEV) (window as unknown as { __globe: GlobeScene }).__globe = this;
  }

  resetView() {
    this.cam.resetTo();
  }

  private resize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const pr = this.renderer.getPixelRatio();
    this.renderer.setSize(w, h, false);
    this.sceneRT.setSize(Math.max(1, w * pr), Math.max(1, h * pr));
    this.cam.resize(w, h);
    this.wake();
  };

  /** id-indexed texture (palette layout): r = settlement class of the province
   *  (0 none / 1 capital / 2 major city / 3 town). Strongest class wins when a
   *  province holds several cities. */
  private buildCityClassTexture(cities: FlatMapData['cities']) {
    const w = this.overlay.width;
    const h = this.overlay.height;
    const data = new Float32Array(w * h * 4);
    for (const c of cities) {
      if (!c.province || c.province * 4 >= data.length) continue;
      // Small towns keep their label but don't tint the province — otherwise
      // dense regions turn into a patchwork of highlighted provinces.
      if (!c.cap && c.pop < mapViz.city.townMinPop) continue;
      const cls = c.cap ? 1 : c.pop >= mapViz.city.majorMinPop ? 2 : 3;
      const o = c.province * 4;
      if (data[o] === 0 || cls < data[o]) data[o] = cls;
    }
    const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  /** id-indexed texture: r = 1-based nation index of the province owner (0 =
   *  none / International Waters). Lets the fill shader glow a whole nation from
   *  a single uniform for the New Game country picker. */
  private buildNationTexture(data: FlatMapData) {
    const w = this.overlay.width;
    const h = this.overlay.height;
    data.world.nations.forEach((n, i) => this.nationIndex.set(n.id, i + 1));
    const buf = new Float32Array(w * h * 4);
    for (const p of data.world.provinces) {
      if (!p.nationId || p.id * 4 >= buf.length) continue;
      buf[p.id * 4] = this.nationIndex.get(p.nationId) ?? 0;
    }
    const tex = new THREE.DataTexture(buf, w, h, THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

  /** Population-weighted framing centroid per nation (a spherical mean of its
   *  province centroids, so it's robust across the antimeridian and lands on the
   *  populous mainland rather than an overseas territory). The camera distance
   *  is derived from the weighted angular spread so the whole nation frames up. */
  private buildNationCentroids(data: FlatMapData) {
    interface A { x: number; y: number; z: number; w: number }
    const acc = new Map<string, A>();
    for (const p of data.world.provinces) {
      if (!p.nationId || p.isSea) continue;
      const [x, y, z] = spherifyPoint(p.centroid[0], p.centroid[1], 1);
      const w = Math.max(1, p.data.population || 1);
      const a = acc.get(p.nationId) ?? { x: 0, y: 0, z: 0, w: 0 };
      a.x += x * w; a.y += y * w; a.z += z * w; a.w += w;
      acc.set(p.nationId, a);
    }
    // Mean direction per nation.
    const mean = new Map<string, THREE.Vector3>();
    for (const [id, a] of acc) {
      const v = new THREE.Vector3(a.x, a.y, a.z);
      if (v.lengthSq() < 1e-9) continue;
      v.normalize();
      mean.set(id, v);
      const lng = Math.atan2(v.x, v.z);
      const lat = Math.asin(Math.max(-1, Math.min(1, v.y)));
      this.nationCentroid.set(id, { lng, lat, dist: GLOBE.maxDist });
    }
    // Weighted angular spread → framing distance.
    const spreadW = new Map<string, { s: number; w: number }>();
    for (const p of data.world.provinces) {
      if (!p.nationId || p.isSea) continue;
      const m = mean.get(p.nationId);
      if (!m) continue;
      const [x, y, z] = spherifyPoint(p.centroid[0], p.centroid[1], 1);
      const dot = Math.max(-1, Math.min(1, x * m.x + y * m.y + z * m.z));
      const ang = Math.acos(dot);
      const w = Math.max(1, p.data.population || 1);
      const s = spreadW.get(p.nationId) ?? { s: 0, w: 0 };
      s.s += ang * w; s.w += w;
      spreadW.set(p.nationId, s);
    }
    for (const [id, s] of spreadW) {
      const meanAng = s.w > 0 ? s.s / s.w : 0.05;
      const c = this.nationCentroid.get(id);
      if (c) c.dist = Math.max(1.2, Math.min(GLOBE.maxDist * 0.94, 1.14 + meanAng * 3.4));
    }
  }

  /** Apply the interaction mode for a screen: menu = slow-orbit backdrop (no
   *  picking), setup = country picker, playing = normal province interaction. */
  private applyScreen(screen: Screen) {
    this.mode = screen === 'menu' ? 'menu' : screen === 'setup' ? 'setup' : 'play';
    this.fillMat.uniforms.uHoveredId.value = -1;
    if (this.seaMat) this.seaMat.uniforms.uHoveredId.value = -1;
    this.hoverNationIdx = 0;

    if (this.mode === 'menu') {
      useUIStore.getState().setHovered(null);
      this.committedNationIdx = 0;
      this.setHighlightNation(0);
      this.cam.resetTo();
    } else if (this.mode === 'setup') {
      useUIStore.getState().setHovered(null);
      this.cam.resetTo();
      this.onSetupNationChanged(useSessionStore.getState().setupNationId);
    } else {
      this.committedNationIdx = 0;
      this.setHighlightNation(0);
      const pn = useSessionStore.getState().playerNation;
      if (pn) this.flyToNation(pn); // cinematic entry to the player's nation
    }
  }

  private onSetupNationChanged(id: string | null) {
    this.committedNationIdx = id ? this.nationIndex.get(id) ?? 0 : 0;
    this.updateHighlight();
    if (id) this.flyToNation(id);
  }

  /** Effective spotlight = the nation under the cursor if any, else the reviewed
   *  nation. Applied to both the land fills and the faint EEZ tint. */
  private updateHighlight() {
    const idx = this.hoverNationIdx > 0 ? this.hoverNationIdx : this.committedNationIdx;
    this.setHighlightNation(idx);
  }

  private setHighlightNation(idx: number) {
    this.fillMat.uniforms.uHiNation.value = idx;
    if (this.seaMat) this.seaMat.uniforms.uHiNation.value = idx;
  }

  private flyToNation(id: string) {
    const c = this.nationCentroid.get(id);
    if (c) this.cam.flyTo(c.lng, c.lat, c.dist);
  }

  private pick(px: number, py: number): number {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.fillMat.uniforms.uPickMode.value = 1;
    this.cam.camera.setViewOffset(w, h, px, py, 1, 1);
    this.renderer.setRenderTarget(this.pickTarget);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.clear();
    this.renderer.render(this.pickScene, this.cam.camera);
    this.renderer.readRenderTargetPixels(this.pickTarget, 0, 0, 1, 1, this.pickBuffer);
    this.renderer.setRenderTarget(null);
    this.cam.camera.clearViewOffset();
    this.fillMat.uniforms.uPickMode.value = 0;
    const [r, g, b] = this.pickBuffer;
    return r | (g << 8) | (b << 16);
  }

  /** Restore full frame rate (render-on-demand). Cheap — just a timestamp. */
  private wake() {
    this.lastActivity = performance.now();
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.moved = 0;
    this.last = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture(e.pointerId);
    this.wake();
  };

  private onMove = (e: PointerEvent) => {
    this.wake();
    useUIStore.getState().setPointer(e.clientX, e.clientY);
    if (this.dragging) {
      const dx = e.clientX - this.last.x;
      const dy = e.clientY - this.last.y;
      this.moved += Math.abs(dx) + Math.abs(dy);
      this.cam.rotateByPixels(dx, dy);
      this.last = { x: e.clientX, y: e.clientY };
      return;
    }
    if (this.mode === 'menu') return; // backdrop: no picking, just the slow orbit
    const now = performance.now();
    if (now - this.lastPick < PICK.throttleMs) return;
    this.lastPick = now;
    const id = this.pick(this.localX(e), this.localY(e));

    if (this.mode === 'setup') {
      // Country picker: hover spotlights the whole nation under the cursor.
      const nid = id > 0 ? getProvince(id)?.nationId ?? '' : '';
      this.hoverNationIdx = nid ? this.nationIndex.get(nid) ?? 0 : 0;
      this.updateHighlight();
      const cur = useSessionStore.getState().setupHoverNationId;
      const next = nid || null;
      if (cur !== next) useSessionStore.getState().setSetupHover(next);
      return;
    }

    // play: province hover feeds the HUD tooltip + fill highlight.
    useUIStore.getState().setHovered(id > 0 ? id : null);
    this.fillMat.uniforms.uHoveredId.value = id > 0 ? id : -1;
    if (this.seaMat) this.seaMat.uniforms.uHoveredId.value = id > 0 ? id : -1;
  };

  private onUp = (e: PointerEvent) => {
    this.dragging = false;
    this.wake();
    if (this.moved >= 6) return; // a drag, not a click
    if (this.mode === 'menu') return;
    const id = this.pick(this.localX(e), this.localY(e));
    if (this.mode === 'setup') {
      // Commit the clicked nation as the reviewed candidate (ocean = no-op).
      const nid = id > 0 ? getProvince(id)?.nationId : undefined;
      if (nid) useSessionStore.getState().setSetupNation(nid);
      return;
    }
    useUIStore.getState().select(id > 0 ? id : null);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1 / GLOBE.wheelZoomStep : GLOBE.wheelZoomStep;
    this.cam.zoomBy(factor);
    this.wake();
  };

  private localX = (e: { clientX: number }) => e.clientX - this.canvas.getBoundingClientRect().left;
  private localY = (e: { clientY: number }) => e.clientY - this.canvas.getBoundingClientRect().top;

  private loop = () => {
    if (this.disposed) return;

    // -- render-on-demand gate (GLOBE.idle) --------------------------------
    // Full frame rate while anything moves: dragging, camera easing, an overlay
    // cross-fade, a relief reveal, the menu auto-orbit, or any interaction in
    // the last grace window. Once still, drop to the ambient cadence — the
    // ocean keeps breathing at idle.fps while the iGPU rests.
    const nowMs = performance.now();
    const active =
      this.mode === 'menu' ||
      this.dragging ||
      !this.cam.settled ||
      this.overlay.animating ||
      !this.reliefSettled ||
      nowMs - this.lastActivity < GLOBE.idle.graceMs;
    if (!active && nowMs - this.lastRender < 1000 / GLOBE.idle.fps) {
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    this.lastRender = nowMs;

    const dt = this.clock.getDelta();
    // Menu backdrop: the planet turns slowly on its own (paused while dragging).
    if (this.mode === 'menu' && !this.dragging) this.cam.orbit(dt * 0.028);
    this.cam.update(dt);
    this.overlay.update(dt);
    const t = this.clock.elapsedTime;
    this.fillMat.uniforms.uTime.value = t;
    this.oceanMat.uniforms.uTime.value = t;
    this.lakeMat.uniforms.uTime.value = t;
    if (this.seaMat) this.seaMat.uniforms.uTime.value = t;

    const alt = this.cam.altitude;
    const z01 = this.cam.zoom01;
    // Rivers: boosted width for readability when far out, real km width close.
    if (this.riverMat && this.riverMesh) {
      const RV = mapViz.river;
      this.riverMat.uniforms.uZoom.value = z01;
      this.riverMat.uniforms.uTime.value = t;
      this.riverMat.uniforms.uBoost.value = 1 + (RV.widthBoostFar - 1) * Math.pow(1 - z01, 1.5);
      this.riverMesh.visible = z01 > RV.fadeMajor[0];
    }

    // Reveals keyed on altitude (start > end because closer = lower altitude).
    const band = (b: { start: number; end: number }) =>
      Math.max(0, Math.min(1, (b.start - alt) / (b.start - b.end)));
    const zr = band(GLOBE.reliefReveal);
    const bCap = band(GLOBE.capitalReveal);
    const bMaj = band(GLOBE.cityReveal);
    const bTown = band(GLOBE.townReveal);
    this.fillMat.uniforms.uCapReveal.value = bCap * this.cityHighlightsOn;
    this.fillMat.uniforms.uMajReveal.value = bMaj * this.cityHighlightsOn;
    this.fillMat.uniforms.uTownReveal.value = bTown * this.cityHighlightsOn;

    const target = Math.max(zr, this.reliefTarget);
    this.reliefReveal += (target - this.reliefReveal) * (1 - Math.pow(1 - 0.16, dt * 60));
    this.reliefSettled = Math.abs(target - this.reliefReveal) < 0.004;
    const reliefOn = !this.satelliteActive && this.reliefReveal > 0.01;
    this.reliefMat.uniforms.uReveal.value = this.satelliteActive ? 0 : this.reliefReveal;
    // Terrain character (Civ-6 close-up look) — Terrain view only; the
    // Sovereignty map stays honestly political at every zoom.
    this.fillMat.uniforms.uTerrainMix.value =
      (this.satelliteActive ? 0 : this.reliefReveal) * mapViz.terrain.mix * this.terrainColorsOn;
    // Grain is a close-up detail; from a vista it aliases into a dot lattice.
    this.fillMat.uniforms.uGrainAtt.value = band({ start: 0.4, end: 0.15 });
    this.reliefMesh.visible = reliefOn;
    this.satelliteMesh.visible = this.satelliteActive;
    this.internalBorderMat.opacity = zr * mapViz.border.internalOpacity;
    for (const o of this.internalObjs) o.visible = zr > 0.015;

    // Render the globe → RT, then composite (vignette + grade) → screen.
    this.renderer.setClearColor(new THREE.Color(mapViz.post.space), 1);
    this.renderer.setRenderTarget(this.sceneRT);
    this.renderer.clear();
    this.renderer.render(this.scene, this.cam.camera);
    this.compositeMat.uniforms.uScene.value = this.sceneRT.texture;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCam);

    // DOM labels — projected a few times a second, LOD-gated by reveal class.
    this.labelAccum += dt;
    if (this.labelAccum > 0.1) {
      this.labelAccum = 0;
      if (this.mode === 'play' && bCap > 0.02) this.projectLabels(bCap, bMaj, bTown);
      else if (useLabelStore.getState().labels.length) useLabelStore.getState().setLabels([]);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Project visible city labels to screen px (backside culled, decluttered).
   *  Capitals first, then metropolises, then towns — each fading in with its
   *  own reveal band (the same ladder that colours their provinces). */
  private projectLabels(bCap: number, bMaj: number, bTown: number) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const out: CityLabel[] = [];
    const placed: { x: number; y: number; sx: number }[] = [];
    const scratch = { x: 0, y: 0 };
    const MAX = 150;
    const tryPlace = (i: number, cls: 1 | 2 | 3, alpha: number, sepX: number) => {
      if (out.length >= MAX) return;
      if (!this.cam.worldToScreen(this.cityWorld[i], scratch)) return;
      if (scratch.x < -40 || scratch.x > w + 40 || scratch.y < -20 || scratch.y > h + 20) return;
      for (const p of placed) {
        if (Math.abs(p.x - scratch.x) < Math.max(sepX, p.sx) && Math.abs(p.y - scratch.y) < 20) return;
      }
      placed.push({ x: scratch.x, y: scratch.y, sx: sepX });
      out.push({ id: i, name: this.cities[i].name, x: scratch.x, y: scratch.y, cls, alpha });
    };
    for (let i = 0; i < this.cities.length && out.length < MAX; i++)
      if (this.cities[i].cap) tryPlace(i, 1, bCap, 64);
    if (bMaj > 0.02)
      for (let i = 0; i < this.cities.length && out.length < MAX; i++) {
        const c = this.cities[i];
        if (!c.cap && c.pop >= mapViz.city.majorMinPop) tryPlace(i, 2, bMaj, 50);
      }
    if (bTown > 0.02)
      for (let i = 0; i < this.cities.length && out.length < MAX; i++) {
        const c = this.cities[i];
        if (!c.cap && c.pop < mapViz.city.majorMinPop) tryPlace(i, 3, bTown, 44);
      }
    useLabelStore.getState().setLabels(out);
  }

  dispose() {
    this.disposed = true;
    registerMapControl(null);
    cancelAnimationFrame(this.raf);
    this.unsub.forEach((u) => u());
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.resize);
    useLabelStore.getState().setLabels([]);
    this.sceneRT.dispose();
    this.pickTarget.dispose();
    this.renderer.dispose();
  }
}

/* ---- geometry helpers ----------------------------------------------------*/
function sphereGeo(positions3: Float32Array, attrs: Record<string, Float32Array> = {}, index?: Uint32Array) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions3, 3));
  for (const [name, arr] of Object.entries(attrs)) {
    g.setAttribute(name, new THREE.BufferAttribute(arr, 1));
  }
  if (index) g.setIndex(new THREE.BufferAttribute(index, 1));
  // No normal attribute needed — shaders derive the sphere normal from position.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), GLOBE_R * 1.1);
  return g;
}

function lineLayer(positions3: Float32Array, hex: string, opacity: number, order: number) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions3, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), GLOBE_R * 1.1);
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(hex),
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(g, mat);
  lines.frustumCulled = false;
  lines.renderOrder = order;
  return lines;
}

/**
 * Expand the river stream ([nPts, importance, x,y ...] per polyline) into a
 * tapered ribbon: every point emits two vertices; the lateral half-width offset
 * (in the sphere's local tangent plane) is stored as an attribute so the vertex
 * shader can boost width when zoomed out without rebuilding geometry.
 */
function buildRiverRibbons(stream: Float32Array, radius: number): THREE.BufferGeometry | null {
  if (!stream || stream.length < 6) return null;
  const RV = mapViz.river;
  const KM = 1 / 6371; // world units per km (GLOBE_R = 1 earth radius)

  let i = 0, totalPts = 0, lines = 0;
  while (i + 2 <= stream.length) {
    const n = Math.round(stream[i]);
    if (n < 2) break;
    totalPts += n;
    lines++;
    i += 2 + n * 2;
  }
  if (totalPts < 2) return null;

  const vCount = totalPts * 2;
  const pos = new Float32Array(vCount * 3);
  const off = new Float32Array(vCount * 3);
  const across = new Float32Array(vCount);
  const along = new Float32Array(vCount);
  const imp = new Float32Array(vCount);
  const idx = new Uint32Array((totalPts - lines) * 6);
  let v = 0, ii = 0;
  i = 0;
  const tan = new THREE.Vector3(), lat = new THREE.Vector3(), nrm = new THREE.Vector3();
  while (i + 2 <= stream.length) {
    const n = Math.round(stream[i++]);
    if (n < 2) break;
    const importance = stream[i++];
    const pts: THREE.Vector3[] = new Array(n);
    for (let k = 0; k < n; k++) {
      const [x, y, z] = spherifyPoint(stream[i + k * 2], stream[i + k * 2 + 1], radius);
      pts[k] = new THREE.Vector3(x, y, z);
    }
    i += n * 2;
    const wFull = (RV.widthMinKm + Math.pow(importance, RV.widthPow) * (RV.widthKm - RV.widthMinKm)) * KM;
    const cum = new Float32Array(n); // km downstream
    for (let k = 1; k < n; k++) cum[k] = cum[k - 1] + pts[k].distanceTo(pts[k - 1]) / KM;
    const total = cum[n - 1];
    for (let k = 0; k < n; k++) {
      tan.subVectors(pts[Math.min(n - 1, k + 1)], pts[Math.max(0, k - 1)]);
      nrm.copy(pts[k]).normalize();
      lat.crossVectors(nrm, tan);
      const L = lat.length();
      if (L > 1e-12) lat.multiplyScalar(1 / L);
      else lat.set(0, 0, 0);
      // Taper toward source and mouth so segments don't end in blunt bars —
      // low floor = rivers arrive at the sea as a fine point, not a stub.
      const taper = Math.min(1, 0.12 + Math.min(cum[k], total - cum[k]) / RV.taperKm);
      const hw = wFull * 0.5 * taper;
      for (let s = 0; s < 2; s++) {
        const sign = s === 0 ? -1 : 1;
        const o3 = (v + s) * 3;
        pos[o3] = pts[k].x; pos[o3 + 1] = pts[k].y; pos[o3 + 2] = pts[k].z;
        off[o3] = lat.x * hw * sign; off[o3 + 1] = lat.y * hw * sign; off[o3 + 2] = lat.z * hw * sign;
        across[v + s] = sign;
        along[v + s] = cum[k];
        imp[v + s] = importance;
      }
      if (k > 0) {
        const q = v - 2;
        idx[ii++] = q; idx[ii++] = q + 1; idx[ii++] = v;
        idx[ii++] = v; idx[ii++] = q + 1; idx[ii++] = v + 1;
      }
      v += 2;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
  g.setAttribute('aAcross', new THREE.BufferAttribute(across, 1));
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  g.setAttribute('aImp', new THREE.BufferAttribute(imp, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), GLOBE_R * 1.1);
  return g;
}

function internalBorderLayer(positions3: Float32Array, colors: Float32Array) {
  const hasCol = colors.length === (positions3.length / 3) * 3;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions3, 3));
  if (hasCol) g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), GLOBE_R * 1.1);
  const mat = new THREE.LineBasicMaterial({
    color: hasCol ? new THREE.Color(0xffffff) : new THREE.Color('#7c8997'),
    vertexColors: hasCol,
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(g, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 4;
  return lines;
}
