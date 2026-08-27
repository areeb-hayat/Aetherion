/**
 * BUILD-ELEVATION — real smooth DEM for relief, snow and terrain types.
 *
 * The old turban `elev_bump_4k.jpg` was a BUMP map: deserts are painted with
 * dune/rock stipple that hillshades into blotchy dot-lattices at map scales.
 * This replaces it with NASA's GEBCO-derived topography (public domain,
 * Earth Observatory "Blue Marble: Next Generation" collection): a genuine
 * elevation raster — ocean = 0, Tibet ≈ 0.8 — downsampled from the 2 km/px
 * source to 8192×4096 (≈5 km/px, the sweet spot for an 8-bit JPEG the iGPU
 * can hold as a texture).
 *
 * Output: .cache/gebco_08_rev_elev_8192.jpg + public/data/map/elevation.jpg
 * Standalone: `pnpm etl:elev` (skipped if the cache already has the result).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import jpeg from 'jpeg-js';
import { PATHS } from './config.mjs';
import { downloadCached, log } from './lib/util.mjs';

const SOURCE_URL =
  'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_21600x10800.jpg';
const SOURCE_FILE = 'gebco_08_rev_elev_21600x10800.jpg';
const OUT_FILE = 'gebco_08_rev_elev_8192.jpg';
const W = 8192;
const H = 4096;

export async function buildElevation() {
  log.step('BUILD ELEVATION — GEBCO DEM (NASA Earth Observatory, public domain)');
  const cached = path.join(PATHS.cache, OUT_FILE);
  const dest = path.join(PATHS.mapOut, 'elevation.jpg');
  if (!fs.existsSync(cached)) {
    const src = await downloadCached(SOURCE_URL, path.join(PATHS.cache, SOURCE_FILE));
    log.info('decoding 21600×10800 source (this takes ~30s)…');
    const img = jpeg.decode(fs.readFileSync(src), {
      useTArray: true,
      maxMemoryUsageInMB: 6144,
      maxResolutionInMP: 300,
    });
    const out = Buffer.alloc(W * H * 4);
    // Box-filter downsample (grayscale — red channel is enough).
    for (let y = 0; y < H; y++) {
      const sy0 = Math.floor((y * img.height) / H);
      const sy1 = Math.floor(((y + 1) * img.height) / H);
      for (let x = 0; x < W; x++) {
        const sx0 = Math.floor((x * img.width) / W);
        const sx1 = Math.floor(((x + 1) * img.width) / W);
        let sum = 0, n = 0;
        for (let sy = sy0; sy < sy1; sy++) {
          const row = sy * img.width;
          for (let sx = sx0; sx < sx1; sx++) {
            sum += img.data[(row + sx) * 4];
            n++;
          }
        }
        const v = Math.round(sum / n);
        const o = (y * W + x) * 4;
        out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = 255;
      }
    }
    fs.writeFileSync(cached, jpeg.encode({ data: out, width: W, height: H }, 92).data);
  }
  fs.mkdirSync(PATHS.mapOut, { recursive: true });
  fs.copyFileSync(cached, dest);
  log.ok(`elevation.jpg — ${(fs.statSync(dest).size / 1e6).toFixed(1)} MB (${W}×${H} GEBCO DEM)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildElevation().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
