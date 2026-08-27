/**
 * ============================================================================
 *  AETHERION — GEO ETL CONFIG  (vector / Equal-Earth pipeline)
 * ============================================================================
 *
 *  The ETL turns open-license vector data into a flat, equal-area (Equal Earth)
 *  VECTOR map the runtime renders as crisp triangles + border lines — sharp at
 *  any zoom. Artifacts (in public/data/map/):
 *    fill.bin / fill_id.bin  triangulated province fills + per-vertex id
 *    borders.bin             province boundary line segments
 *    rivers.bin / lakes.bin  hydrography
 *    ../world.json           nation + province metadata (projected centroids)
 *    cities.json             populated places (projected)
 *    map.json                bounds + buffer counts
 *
 *  Switch PROVINCE_SOURCE to scale from provinces (fast) to districts (heavy).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PATHS = {
  cache: path.resolve(__dirname, '.cache'),
  dataOut: path.resolve(__dirname, '../../public/data'),
  mapOut: path.resolve(__dirname, '../../public/data/map'),
};

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

/**
 * PROVINCE_SOURCE:
 *   'admin1' → Natural Earth states/provinces (~4,600). Public domain, fast.
 *   'adm2'   → geoBoundaries CGAZ districts (~48,000). CC-BY, district-level
 *              granularity for realistic combat. Big (550 MB raw) — simplify
 *              first (see scripts/etl/simplify-adm2.md).
 */
export const PROVINCE_SOURCE = 'adm2';

export const SOURCES = {
  admin0: { url: `${NE}/ne_10m_admin_0_countries.geojson`, file: 'ne_10m_admin_0_countries.geojson' },
  admin1: { url: `${NE}/ne_10m_admin_1_states_provinces.geojson`, file: 'ne_10m_admin_1_states_provinces.geojson' },
  cities: { url: `${NE}/ne_10m_populated_places.geojson`, file: 'ne_10m_populated_places.geojson' },
  rivers: { url: `${NE}/ne_10m_rivers_lake_centerlines.geojson`, file: 'ne_10m_rivers_lake_centerlines.geojson' },
  lakes: { url: `${NE}/ne_10m_lakes.geojson`, file: 'ne_10m_lakes.geojson' },
  // Elevation is a REAL DEM now (NASA/GEBCO, public domain), downloaded and
  // downsampled by scripts/etl/build-elevation.mjs (`pnpm etl:elev`) — the old
  // turban bump map hillshaded its painted desert stipple into blotches.
  // ADM2 is fetched separately (Git-LFS media URL) — see simplify-adm2.md.
  adm2: { file: 'geoBoundariesCGAZ_ADM2.simplified.geojson', raw: 'geoBoundariesCGAZ_ADM2.geojson' },
};

/** Restrict to specific ISO-A3 nation codes for a fast regional slice, or null. */
export const SCOPE = { onlyNations: null };

/** Keep cities with at least this population (caps the marker count). */
export const CITY_MIN_POP = 5000;
