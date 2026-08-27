/**
 * Globe shaders — every layer lives on a sphere of radius GLOBE_R.
 *
 *  • fill      — province fills, palette by per-vertex id, with gentle limb
 *                darkening. On zoom the province blends toward its TERRAIN
 *                colour (Civ-6 character: 16 types + procedural grain + snow
 *                from the elevation map), and city provinces glow: capital =
 *                gold, metropolis = warm lift, town = whisper. Doubles as the
 *                GPU pick pass (uPickMode=1 → id-encoded).
 *  • ocean     — the base globe: deep water with a latitude gradient, shimmer,
 *                and a brightening fresnel rim.
 *  • river     — tapered ribbon water: bright glacial core over shadowed banks
 *                with a drifting downstream shimmer.
 *  • relief    — hillshade from the elevation heightmap (Sobel normals), cool
 *                shadows / warm lit slopes; MULTIPLY over the fills.
 *  • satellite — Blue Marble, sampled the same way (Satellite overlay only).
 *  • atmosphere— a fresnel shell → soft blue halo around the planet.
 *  • composite — final fullscreen vignette + cinematic grade.
 */

const PI = '3.141592653589793';

// Shared: lng/lat (radians) from a sphere position → equirectangular UV. Must
// match lonLatToSphere in sphere.ts (x=cosLat·sinLng, z=cosLat·cosLng).
const POS_TO_UV = /* glsl */ `
  vec2 posToUV(vec3 p) {
    vec3 n = normalize(p);
    float lng = atan(n.x, n.z);
    float lat = asin(clamp(n.y, -1.0, 1.0));
    return vec2(lng / (2.0 * ${PI}) + 0.5, 0.5 - lat / ${PI});
  }
`;

const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Province fills                                                             */
/* -------------------------------------------------------------------------- */
export const fillVertex = /* glsl */ `
  attribute float aId;
  varying float vId;
  varying float vShade;
  varying float vSel;
  varying vec3 vPos;
  uniform float uSelectedId;
  void main() {
    vId = aId;
    vPos = position;
    // Headlight limb darkening: how much the surface faces the camera.
    vec3 nrm = normalize(position);
    vec3 vn = normalize(normalMatrix * nrm);
    vShade = 0.70 + 0.30 * clamp(vn.z, 0.0, 1.0);
    vSel = abs(aId - uSelectedId) < 0.5 ? 1.0 : 0.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fillFragment = /* glsl */ `
  precision highp float;
  varying float vId;
  varying float vShade;
  varying float vSel;
  varying vec3 vPos;
  uniform sampler2D uPalette;
  uniform float uPaletteW;
  uniform float uPaletteH;
  uniform float uHoveredId;
  uniform float uSelectedId;
  uniform float uPickMode;     // 0 = colour, 1 = pick (id)
  uniform float uTime;
  uniform float uFillAlpha;
  uniform vec3 uHoverTint;
  uniform vec3 uSelectTint;
  uniform float uSat;          // keep this fraction of chroma
  uniform vec3 uTone;          // unifying tone
  uniform float uToneAmt;      // how far to rotate toward it
  uniform float uShadeAmt;     // 0 = flat, 1 = full limb darkening
  uniform float uHoverAmt;     // hover tint mix
  uniform float uHoverBright;  // hover brightness lift
  uniform vec2 uSelectWash;    // [steady wash, breathing amplitude]
  uniform float uSelectBright; // brightness lift on the selected province
  uniform float uDimOthers;    // focus: everything else recedes while selected

  // -- whole-nation spotlight (New Game country picker) ----------------------
  uniform sampler2D uNationTex; // r = 1-based nation index of this province (0 none)
  uniform float uHiNation;      // nation index to spotlight (0 = none)

  // -- terrain character (Civ-6): revealed on zoom --------------------------
  uniform sampler2D uTerrainPal; // rgb = terrain colour, a = style seed (0 = no terrain)
  uniform sampler2D uElev;       // elevation heightmap (for snow)
  uniform float uTerrainMix;     // 0 political → tokens value at full reveal
  uniform float uTintFloor;      // political wash kept over the terrain
  uniform float uGrain;          // procedural detail amplitude
  uniform float uGrainAtt;       // altitude-keyed reveal: grain is a close-up detail
  uniform vec3 uSnow;
  uniform float uSnowStart;

  // -- city provinces --------------------------------------------------------
  uniform sampler2D uCityCls;    // r = 0 none / 1 capital / 2 major / 3 town
  uniform vec3 uCapTint;   uniform float uCapStrength;   uniform float uCapReveal;
  uniform vec3 uMajTint;   uniform float uMajStrength;   uniform float uMajReveal;
  uniform vec3 uTownTint;  uniform float uTownStrength;  uniform float uTownReveal;

  ${POS_TO_UV}
  ${NOISE}

  vec3 encodeId(float id) {
    float r = mod(id, 256.0);
    float g = mod(floor(id / 256.0), 256.0);
    float b = floor(id / 65536.0);
    return vec3(r, g, b) / 255.0;
  }

  vec3 unify(vec3 c) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 desat = mix(vec3(l), c, uSat);
    vec3 toned = mix(desat, uTone * (0.55 + 0.9 * l), uToneAmt);
    return toned;
  }

  void main() {
    if (uPickMode > 0.5) { gl_FragColor = vec4(encodeId(vId), 1.0); return; }

    float px = mod(vId, uPaletteW);
    float py = floor(vId / uPaletteW);
    vec2 puv = vec2((px + 0.5) / uPaletteW, (py + 0.5) / uPaletteH);
    vec4 pal = texture2D(uPalette, puv);
    vec3 col = unify(pal.rgb);

    // Terrain character: blend toward the province's terrain colour with fine
    // procedural grain (two octaves) + snow above the snowline.
    if (uTerrainMix > 0.003) {
      vec4 ter = texture2D(uTerrainPal, puv);
      float mask = step(0.001, ter.a);
      vec2 uv = posToUV(vPos);
      float n = vnoise(uv * vec2(2800.0, 1400.0) + ter.a * 311.0) * 0.55
              + vnoise(uv * vec2(900.0, 450.0) + ter.a * 97.0) * 0.45;
      vec3 tcol = ter.rgb * (1.0 + (n - 0.5) * uGrain * 2.0 * uGrainAtt);
      float h = dot(texture2D(uElev, uv).rgb, vec3(0.299, 0.587, 0.114));
      tcol = mix(tcol, uSnow, smoothstep(uSnowStart, uSnowStart + 0.12, h) * 0.85);
      col = mix(col, mix(tcol, col, uTintFloor), uTerrainMix * mask);
    }

    // City provinces: the whole province carries the settlement's glow.
    float cls = texture2D(uCityCls, puv).r;
    if (cls > 0.5) {
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float isCap  = step(0.5, cls) * (1.0 - step(1.5, cls));
      float isMaj  = step(1.5, cls) * (1.0 - step(2.5, cls));
      float isTown = step(2.5, cls);
      col = mix(col, uCapTint  * (0.85 + 0.7 * lum), isCap  * uCapReveal  * uCapStrength);
      col = mix(col, uMajTint  * (0.72 + 0.6 * lum), isMaj  * uMajReveal  * uMajStrength);
      col = mix(col, uTownTint * (0.72 + 0.6 * lum), isTown * uTownReveal * uTownStrength);
    }

    col *= mix(1.0, vShade, uShadeAmt);

    // Whole-nation spotlight: does THIS province belong to the highlighted nation?
    float nat = texture2D(uNationTex, puv).r;
    float hiN = (uHiNation > 0.5 && abs(nat - uHiNation) < 0.5) ? 1.0 : 0.0;

    float a = uFillAlpha * pal.a;  // ownerless waters carry alpha 0 in the palette
    if (abs(vId - uHoveredId) < 0.5) {
      col = mix(col, uHoverTint, uHoverAmt);
      col *= uHoverBright;
      a = max(a, 0.34);
    }
    if (vSel > 0.5) {
      // A steady gold wash with a slow breath — luminous, not flashing.
      float p = 0.5 + 0.5 * sin(uTime * 2.2);
      col = mix(col, uSelectTint, uSelectWash.x + uSelectWash.y * p);
      col *= uSelectBright;
      a = max(a, 0.55);
    } else if (hiN > 0.5) {
      // The chosen nation glows as one body while the world recedes around it.
      float p = 0.5 + 0.5 * sin(uTime * 2.0);
      col = mix(col, uSelectTint, uSelectWash.x + uSelectWash.y * p);
      col *= uSelectBright;
      a = max(a, 0.62);
    } else if (uSelectedId > 0.0 || uHiNation > 0.5) {
      col *= uDimOthers;              // the rest of the world recedes a touch
    }
    gl_FragColor = vec4(col, a);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Ocean — the base globe sphere                                              */
/* -------------------------------------------------------------------------- */
export const oceanVertex = /* glsl */ `
  varying vec3 vPos;
  varying float vFacing;
  void main() {
    vPos = position;
    vec3 vn = normalize(normalMatrix * normalize(position));
    vFacing = clamp(vn.z, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const oceanFragment = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  varying float vFacing;
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uGlow;
  uniform float uShimmer;
  uniform float uFlow;
  uniform float uGlint;
  // Shore proximity (ETL distance-to-coast texture): coastal water carries the
  // same living pulse as the rivers that feed it, so mouths don't end abruptly.
  uniform sampler2D uShore;
  uniform float uShoreOn;
  uniform float uShoreShimmer;  // extra wave contrast at the coast
  uniform float uShoreGlint;    // extra travelling sparkle at the coast
  uniform float uShoreLift;     // base colour lift toward the shallow tone
  uniform float uShorePulse;    // slow breathing swell amplitude
  ${POS_TO_UV}
  ${NOISE}

  // 3-octave fractal noise → soft, organic swell rather than a single ripple.
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 3; i++) { v += a * vnoise(p); p = p * 2.03 + 19.1; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = posToUV(vPos);
    float band = smoothstep(0.0, 1.0, abs(vPos.y));        // lighter near equator
    float shore = uShoreOn * texture2D(uShore, uv).r;      // 1 at the coast → 0 offshore
    vec3 base = mix(uShallow, uDeep, 0.42 + 0.44 * band);
    base = mix(base, uShallow, shore * uShoreLift);        // shelf water lightens

    // Two fine wave fields drifting in different directions → a living, flowing
    // sea. Higher spatial frequency = a fine sheen rather than big blotches.
    vec2 q = uv * vec2(150.0, 75.0);
    float t = uTime * uFlow;
    float w1 = fbm(q + vec2(t, t * 0.55));
    float w2 = vnoise(q * 2.3 - vec2(t * 0.8, t * 1.1));
    float waves = w1 * 0.65 + w2 * 0.35;
    float shimmer = uShimmer * (1.0 + uShoreShimmer * shore);
    vec3 col = base + (waves - 0.5) * shimmer;

    // Travelling sun-glint: crests catch the light where both fields peak.
    // Coastal water sparkles harder — the river glints carry on into the sea.
    float crest = pow(max(0.0, w1 * w2), 5.0);
    col += uGlow * crest * uGlint * (1.0 + uShoreGlint * shore) * vFacing;

    // Slow surf breathing along the coast, phased by the wave field so the
    // pulse rolls along the shoreline instead of blinking in unison.
    col += uGlow * shore * uShorePulse * (0.5 + 0.5 * sin(uTime * 1.1 + w1 * 9.0)) * vFacing;

    col *= 0.72 + 0.28 * vFacing;                          // limb darkening
    float rim = pow(1.0 - vFacing, 3.0);                   // bright water rim
    col += uGlow * rim * 0.35;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Lakes & inland seas — shaded flowing water (not flat dark holes)           */
/* -------------------------------------------------------------------------- */
export const lakeVertex = /* glsl */ `
  varying vec3 vPos;
  varying float vFacing;
  void main() {
    vPos = position;
    vec3 vn = normalize(normalMatrix * normalize(position));
    vFacing = clamp(vn.z, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const lakeFragment = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  varying float vFacing;
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uGlow;
  uniform float uShimmer;
  uniform float uFlow;
  uniform float uGlint;   // travelling-sparkle strength (matches the rivers)
  ${POS_TO_UV}
  ${NOISE}

  void main() {
    vec2 uv = posToUV(vPos);
    // Higher spatial frequency than the ocean — lakes are small, want fine ripple.
    vec2 q = uv * vec2(240.0, 120.0);
    float t = uTime * uFlow;
    float n1 = vnoise(q + vec2(t, t * 0.6));
    float n2 = vnoise(q * 2.0 - vec2(t * 0.8, t));
    float n = n1 * 0.6 + n2 * 0.4;
    vec3 col = mix(uShallow, uDeep, 0.5) + (n - 0.5) * uShimmer;
    // Same crest arithmetic as the river shader, so a river crossing a lake
    // sparkles with the same cadence instead of going dead at the waterline.
    float g = pow(max(0.0, n1 * n2 * 2.2 - 0.35), 3.0);
    col += uGlow * g * uGlint * vFacing;
    float sheen = pow(n, 3.0);
    col += uGlow * sheen * 0.22 * vFacing;
    col *= 0.80 + 0.20 * vFacing;                          // gentle limb darkening
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Rivers — tapered ribbons with flowing water                                */
/* -------------------------------------------------------------------------- */
export const riverVertex = /* glsl */ `
  attribute vec3 aOff;     // lateral half-width offset (world units, signed)
  attribute float aAcross; // -1 … +1 across the channel
  attribute float aAlong;  // km downstream
  attribute float aImp;    // 0..1 importance grade
  varying float vAcross;
  varying float vAlong;
  varying float vImp;
  varying float vShade;
  uniform float uBoost;    // width multiplier (readability boost when far out)
  void main() {
    vAcross = aAcross;
    vAlong = aAlong;
    vImp = aImp;
    vec3 nrm = normalize(position);
    vec3 vn = normalize(normalMatrix * nrm);
    vShade = 0.78 + 0.22 * clamp(vn.z, 0.0, 1.0);
    vec3 p = position + aOff * uBoost;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const riverFragment = /* glsl */ `
  precision highp float;
  varying float vAcross;
  varying float vAlong;
  varying float vImp;
  varying float vShade;
  uniform float uTime;
  uniform vec3 uCore;
  uniform vec3 uMid;
  uniform vec3 uBank;
  uniform vec3 uGlint;
  uniform float uFlow;
  uniform float uOpacity;
  uniform float uZoom;       // zoom01
  uniform vec2 uFadeMajor;   // [start, full] for importance 1
  uniform vec2 uFadeMinor;   // [start, full] for importance 0
  ${NOISE}
  void main() {
    // Importance-weighted zoom fade: trunks appear early, brooks up close.
    vec2 f = mix(uFadeMinor, uFadeMajor, vImp);
    float vis = clamp((uZoom - f.x) / max(0.001, f.y - f.x), 0.0, 1.0);
    if (vis < 0.01) discard;

    float x = abs(vAcross);
    // Bright core → main channel → shadowed banks.
    vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.5, x));
    col = mix(col, uBank, smoothstep(0.45, 1.0, x));

    // Downstream drift: fine ripples + slow surges + travelling glints.
    float rip = vnoise(vec2(vAlong * 0.22 - uTime * uFlow, vAcross * 1.6));
    float surge = vnoise(vec2(vAlong * 0.05 - uTime * uFlow * 0.35, 7.3));
    col += (rip - 0.5) * 0.16 * (1.0 - x * 0.8);
    col += (surge - 0.5) * 0.10;
    float g = pow(max(0.0, rip * surge * 2.2 - 0.35), 3.0);
    col += uGlint * g * (1.0 - x) * 0.5;

    col *= vShade;
    float edge = smoothstep(1.0, 0.78, x);   // soft banks (AA)
    gl_FragColor = vec4(col, uOpacity * edge * vis);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Relief + Satellite — full-sphere overlays sampled by lng/lat               */
/* -------------------------------------------------------------------------- */
export const overlayVertex = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const reliefFragment = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  uniform sampler2D uElev;
  uniform vec2 uElevTexel;
  uniform vec3 uLightDir;
  uniform float uExagg;
  uniform float uAmbient;
  uniform float uReveal;
  uniform vec3 uShadowTint;  // shadows lean cool
  uniform vec3 uLightTint;   // lit slopes lean warm
  ${POS_TO_UV}

  float elevAt(vec2 uv) { return dot(texture2D(uElev, uv).rgb, vec3(0.299, 0.587, 0.114)); }

  void main() {
    if (uReveal <= 0.001) discard;
    vec2 uv = posToUV(vPos);
    float h = elevAt(uv);
    if (h < 0.035) discard;                                // sea — leave it alone

    // Sobel normals (8 taps) — smoother, richer slopes than a 4-tap cross.
    float tx = uElevTexel.x, ty = uElevTexel.y;
    float hL = elevAt(uv - vec2(tx, 0.0));
    float hR = elevAt(uv + vec2(tx, 0.0));
    float hD = elevAt(uv - vec2(0.0, ty));
    float hU = elevAt(uv + vec2(0.0, ty));
    float hLD = elevAt(uv + vec2(-tx, -ty));
    float hRD = elevAt(uv + vec2(tx, -ty));
    float hLU = elevAt(uv + vec2(-tx, ty));
    float hRU = elevAt(uv + vec2(tx, ty));
    float gx = ((hL - hR) * 2.0 + (hLD - hRD) + (hLU - hRU)) * 0.25;
    float gy = ((hD - hU) * 2.0 + (hLD - hLU) + (hRD - hRU)) * 0.25;
    vec3 n = normalize(vec3(gx * uExagg, gy * uExagg, 1.0));
    float lit = max(0.0, dot(n, normalize(uLightDir)));
    float shade = uAmbient + (1.0 - uAmbient) * lit;
    shade += smoothstep(0.55, 1.0, lit) * 0.22;
    shade = clamp(shade, 0.35, 1.0);
    // Fade shading in with elevation: the 8-bit DEM's JPEG block noise reads
    // as streaky mottling over near-sea-level plains if shaded at full force.
    float amp = uReveal * smoothstep(0.04, 0.14, h);
    shade = mix(1.0, shade, amp);
    // Painterly relief: shadows cool, light warm (still a multiply pass).
    vec3 tint = mix(uShadowTint, uLightTint, smoothstep(0.2, 0.9, lit));
    tint = mix(vec3(1.0), tint, amp);
    gl_FragColor = vec4(tint * shade, 1.0);               // MultiplyBlending
  }
`;

export const satelliteFragment = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  uniform sampler2D uTex;
  uniform float uOpacity;
  ${POS_TO_UV}
  void main() {
    if (uOpacity <= 0.001) discard;
    gl_FragColor = vec4(texture2D(uTex, posToUV(vPos)).rgb, uOpacity);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Atmosphere — back-side fresnel halo                                        */
/* -------------------------------------------------------------------------- */
export const atmosphereVertex = /* glsl */ `
  varying float vRim;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 nrm = normalize(normalMatrix * normalize(position));
    vec3 toCam = normalize(-mv.xyz);
    // 0 facing the camera (disk centre) → 1 at the grazing limb. Tight power so
    // the glow is a halo ring, not a wash over the whole planet.
    vRim = pow(1.0 - max(dot(nrm, toCam), 0.0), 3.0);
    gl_Position = projectionMatrix * mv;
  }
`;

export const atmosphereFragment = /* glsl */ `
  precision highp float;
  varying float vRim;
  uniform vec3 uColor;
  uniform float uStrength;
  void main() {
    gl_FragColor = vec4(uColor, vRim * uStrength);
  }
`;

/* -------------------------------------------------------------------------- */
/*  Composite — final vignette + cinematic grade                              */
/* -------------------------------------------------------------------------- */
export const quadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const compositeFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene;
  uniform float uVignette;
  uniform vec3 uGradeShadow;
  uniform vec3 uGradeHi;
  uniform float uGradeStrength;
  void main() {
    vec3 col = texture2D(uScene, vUv).rgb;
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 graded = col + (uGradeShadow * (1.0 - l) + uGradeHi * l - vec3(0.5)) * uGradeStrength;
    col = graded;
    vec2 d = vUv - 0.5;
    float vig = smoothstep(0.95, 0.25, dot(d, d) * 2.0);
    col *= mix(1.0, vig, uVignette);
    gl_FragColor = vec4(col, 1.0);
  }
`;
