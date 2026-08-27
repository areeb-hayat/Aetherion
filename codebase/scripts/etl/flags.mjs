/**
 * FLAGS — downloads a flag per country and derives a muted, polished map color
 * from its dominant hue.
 *
 *   • Flags: flagcdn.com (free), saved to public/data/flags/<iso2>.png for the
 *     UI (offline-friendly) and cached for color extraction.
 *   • Color: histogram the flag's hues weighted by saturation, take the dominant
 *     hue, then FIX saturation/lightness to muted values so the map reads as a
 *     calm, harmonious palette (not sharp flag primaries).
 *
 * Output: scripts/etl/.cache/flag-colors.json  →  { ISO3: { iso2, color } }
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { PATHS, SOURCES } from './config.mjs';
import { readJson, writeJson, log, prop, hslToHex } from './lib/util.mjs';

const FLAG_W = 80; // flagcdn width bucket (small is plenty for color)
const CONCURRENCY = 24;

// Muted palette targets — the whole map lives in this calm band.
const MUTED_SAT = 0.34;
const MUTED_LIGHT = 0.5;
const NEUTRAL = '#5a6b7a'; // for flags with no dominant hue (mostly grayscale)

function iso2Map() {
  const a0 = readJson(path.join(PATHS.cache, SOURCES.admin0.file));
  const m = new Map();
  for (const f of a0.features) {
    const i3 = prop(f.properties, 'ADM0_A3', 'adm0_a3');
    const i2 = prop(f.properties, 'ISO_A2_EH', 'ISO_A2', 'iso_a2');
    if (i3 && i2 && i2 !== '-99') m.set(i3, i2.toLowerCase());
  }
  return m;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

/** Dominant flag hue (0..360) or null if the flag is essentially grayscale. */
function dominantHue(png) {
  const buckets = new Float64Array(36); // 10° hue buckets, weighted by saturation
  const { data, width, height } = png;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (data[o + 3] < 128) continue;
    const [h, s, l] = rgbToHsl(data[o], data[o + 1], data[o + 2]);
    if (s < 0.18 || l < 0.1 || l > 0.95) continue; // ignore white/black/gray
    buckets[Math.min(35, Math.floor(h / 10))] += s;
  }
  let best = -1;
  let bestVal = 0;
  for (let b = 0; b < 36; b++) if (buckets[b] > bestVal) {
    bestVal = buckets[b];
    best = b;
  }
  return best < 0 ? null : best * 10 + 5;
}

async function fetchFlag(iso2, destPng) {
  if (fs.existsSync(destPng)) return fs.readFileSync(destPng);
  const res = await fetch(`https://flagcdn.com/w${FLAG_W}/${iso2}.png`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPng, buf);
  return buf;
}

export async function buildFlags() {
  log.step('Flags — download + derive muted colors');
  const iso = iso2Map();
  const flagsDir = path.join(PATHS.dataOut, 'flags');
  fs.mkdirSync(flagsDir, { recursive: true });

  const entries = [...iso.entries()];
  const colors = {};
  let done = 0;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ([i3, i2]) => {
        try {
          const buf = await fetchFlag(i2, path.join(flagsDir, `${i2}.png`));
          colors[i3] = { iso2: i2, hue: buf ? dominantHue(PNG.sync.read(buf)) : null };
        } catch {
          colors[i3] = { iso2: i2, hue: null };
        }
        done++;
      }),
    );
  }

  writeJson(path.join(PATHS.cache, 'flag-colors.json'), colors);
  log.ok(`${done} flags → public/data/flags/, colors → flag-colors.json`);
  return colors;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildFlags();
}
