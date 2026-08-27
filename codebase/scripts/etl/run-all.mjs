/**
 * Full geo ETL: download sources → flags + colors → build the vector map.
 * Usage:  pnpm etl
 */
import { download } from './01-download.mjs';
import { buildFlags } from './flags.mjs';
import { buildElevation } from './build-elevation.mjs';
import { buildMap } from './build-map.mjs';
import { buildSea } from './build-sea.mjs';
import { buildResources } from './build-resources.mjs';
import { log } from './lib/util.mjs';

const t0 = Date.now();
await download();
await buildFlags();
await buildElevation();
buildMap();
await buildSea(); // sea provinces + land terrain classification
buildResources(); // deposits + economy (needs terrain from buildSea)
log.step(`ALL DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s — data in public/data/`);
