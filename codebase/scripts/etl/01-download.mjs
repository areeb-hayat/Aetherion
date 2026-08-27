/**
 * ETL STEP 1 — Download raw Natural Earth boundary data (cached on disk).
 * Public domain. Re-runs are free; cached files are reused.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, SOURCES } from './config.mjs';
import { downloadCached, log } from './lib/util.mjs';

export async function download() {
  log.step('Download Natural Earth sources (public domain)');
  for (const key of Object.keys(SOURCES)) {
    const src = SOURCES[key];
    if (!src.url) continue; // e.g. ADM2 is fetched separately (Git-LFS) — see simplify-adm2.md
    await downloadCached(src.url, path.join(PATHS.cache, src.file));
  }
}

// Allow running standalone: `node scripts/etl/01-download.mjs`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  download().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
