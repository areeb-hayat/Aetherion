# District-level data (geoBoundaries ADM2)

The committed `public/data/map/` is already built at **district level** (~49k
districts). This note explains how to regenerate it from scratch.

geoBoundaries CGAZ ADM2 is open data (CC-BY 4.0) — ~48,000 districts globally,
but the raw file is **550 MB**, so we download it once and simplify it before
the build reads it.

## 1. Download the raw districts (Git-LFS media URL, 550 MB)

```bash
curl -L --retry 5 -C - \
  "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/main/releaseData/CGAZ/geoBoundariesCGAZ_ADM2.geojson" \
  -o scripts/etl/.cache/geoBoundariesCGAZ_ADM2.geojson
```

## 2. Simplify (525 MB → ~70 MB, keeps every district)

```bash
node --max-old-space-size=8192 node_modules/mapshaper/bin/mapshaper \
  scripts/etl/.cache/geoBoundariesCGAZ_ADM2.geojson \
  -simplify 10% keep-shapes \
  -o scripts/etl/.cache/geoBoundariesCGAZ_ADM2.simplified.geojson
```

Tune `-simplify` (e.g. `6%` for lighter, `20%` for crisper district outlines).

## 3. Build

`PROVINCE_SOURCE` in `config.mjs` is already `'adm2'`. Then:

```bash
pnpm etl:build       # or: pnpm etl  (downloads NE sources first)
```

## Switching back to provinces (faster, lighter)

Set `PROVINCE_SOURCE = 'admin1'` in `config.mjs` and run `pnpm etl:build`.
That uses Natural Earth states/provinces (~4,600) — public domain, no ADM2
download needed.
