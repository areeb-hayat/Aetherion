**AETHERION**

Map Data & Geographic Sources Reference

INTERNAL DEVELOPMENT DOCUMENT · v1.0

# **Overview & Purpose**

This document is the definitive reference for all geographic, topographic, and administrative boundary data required to build Aetherion's world map. It covers every data source needed — from sovereign nation boundaries down to district-level (tehsil/county/municipality) topology — and explains exactly how to acquire, process, and integrate each dataset into the game engine.

The map target is approximately 80,000 district-level nodes globally, organized into ~5,000–8,000 provinces, ~500–800 regions, and 195+ sovereign nations. All data is either open-license or government-published and free to use in commercial products.

**Primary goals:** real-world coastlines and borders at province/district resolution; terrain elevation for combat width calculations; river and mountain ranges for movement penalties; population density per district for POP seeding; road and rail networks for supply line pathfinding.

# **1. Political Boundary Data**

## **1.1 Nation-Level Boundaries — Natural Earth**

Natural Earth is the gold standard for nation-level cartography. It is public domain, maintained by cartographers, and directly used by QGIS, D3.js, and Three.js globe projects worldwide.

| **Dataset** | **Resolution** | **Format** | **URL** | **License** |
| --- | --- | --- | --- | --- |
| Admin 0 — Sovereign Nations | 1:10m (hi-res) | GeoJSON / Shapefile | naturalearthdata.com/downloads/10m-cultural-vectors/ | Public Domain |
| Admin 0 — Disputed Areas | 1:10m | GeoJSON | naturalearthdata.com (same) | Public Domain |
| Admin 1 — States/Provinces | 1:10m | GeoJSON / Shapefile | naturalearthdata.com/downloads/10m-cultural-vectors/ | Public Domain |
| Coastlines | 1:10m | GeoJSON | naturalearthdata.com/downloads/10m-physical-vectors/ | Public Domain |
| Ocean / Land mask | 1:10m | GeoJSON | naturalearthdata.com/downloads/10m-physical-vectors/ | Public Domain |

**NOTE:** *Natural Earth Admin 0 covers 255 territories. Admin 1 covers ~5,000 first-level subdivisions (states, oblasts, provinces, governorates). This is the starting backbone for the entire map.*

## **1.2 District-Level Boundaries — GADM**

GADM (Global Administrative Areas) is the most comprehensive open dataset for sub-national administrative boundaries. It provides up to level 5 boundaries for most countries (nation → state → county → municipality → locality).

| **Level** | **Real-World Equivalent** | **Global Count (approx)** | **GADM Level** | **Primary Use in Aetherion** |
| --- | --- | --- | --- | --- |
| Nation | Sovereign state | ~195 | GADM 0 | Diplomacy, GDP, AI scoring |
| Province / State | Oblast, Wilayah, Departamento | ~5,000–8,000 | GADM 1–2 | Economic aggregation, unrest tracking |
| District | County, Tehsil, Arrondissement | ~50,000–80,000 | GADM 2–3 | Combat, POP granularity, terrain detail |
| Municipality | City, Town, Village | ~500,000+ | GADM 4–5 | City nodes only; not full coverage |

* Download URL: gadm.org/download\_world.html
* Format: GeoJSON, Shapefile, GeoPackage (GPKG) — use GeoPackage for efficient loading
* License: Free for non-commercial use; academic/research use permitted. For commercial game release, the GADM team grants permission on request — email admin@gadm.org
* File size: ~2 GB for full world at all levels in GeoPackage format; ~800 MB for levels 0–3 only

**NOTE:** *For the MVP Phase 1 (500-node test), use GADM level 1 for 5 test nations. For Phase 3 onward, switch to GADM level 2–3 globally. Do NOT attempt to load all 500,000 level-4+ nodes — only load city-node districts for major urban centers.*

## **1.3 OpenStreetMap — Fallback & Urban Detail**

For countries where GADM district boundaries are incomplete or outdated (especially post-2020 administrative reorganizations in Central Asia, Africa, and Middle East), OpenStreetMap provides current boundary data.

| **Tool / Service** | **Use Case** | **URL** | **Format** |
| --- | --- | --- | --- |
| Overpass API | Query specific admin boundaries by country | overpass-api.de | GeoJSON / OSM XML |
| Geofabrik Downloads | Pre-extracted country OSM data | download.geofabrik.de | PBF / Shapefile |
| OSM Boundaries | Visual boundary explorer | osm-boundaries.com | GeoJSON export |
| Protomaps | Tile-based map for visual reference | protomaps.com | PMTiles |

# **2. Terrain, Elevation & Topography**

## **2.1 SRTM — Shuttle Radar Topography Mission**

SRTM is NASA's global elevation dataset collected in 2000. It covers all land between 60°N and 56°S at 30-meter resolution and is the standard source for terrain elevation in game development.

| **Product** | **Resolution** | **Coverage** | **URL** | **Format** |
| --- | --- | --- | --- | --- |
| SRTM 1-Arc (~30m) | ~30 meters/pixel | 60°N to 56°S | earthdata.nasa.gov (search SRTM) | HGT / GeoTIFF |
| SRTM 3-Arc (~90m) | ~90 meters/pixel | Same | srtm.csi.cgiar.org | GeoTIFF |
| GMTED2010 (for polar) | ~250m | Global (90°N–90°S) | usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-global-multi-resolution-terrain-elevation | GeoTIFF |

For Aetherion, process SRTM at 3-arc (~90m) resolution. The pipeline is:

* Download per-tile GeoTIFF files covering each nation
* Merge tiles using GDAL: gdal\_merge.py -o world\_dem.tif tiles/\*.tif
* Resample to match district node resolution: gdalwarp -ts 10000 5000 world\_dem.tif dem\_resampled.tif
* Calculate per-district mean elevation and max slope gradient
* Assign terrain type (PLAINS / HILL / MOUNTAIN) using slope thresholds: <5° = PLAINS, 5°–20° = HILL, >20° = MOUNTAIN

## **2.2 Terrain Classification Logic**

Each district's combat\_width and movement modifier in Aetherion derives from its classified terrain type. Use the following classification pipeline:

| **Terrain Type** | **Elevation Threshold** | **Slope Threshold** | **Overrides** | **Combat Width** |
| --- | --- | --- | --- | --- |
| PLAINS | 0–500m | <5° | River valley, coastal flat | 8–12 divisions |
| HILL | 300–1500m | 5°–20° | Plateau edges, rolling terrain | 4–6 divisions |
| MOUNTAIN | >1500m OR >20° slope | >20° | None | 1–2 divisions |
| URBAN | Any elevation | Any | Population > 500k in district | 4–6 divisions |
| DESERT | Any elevation | <5° | Aridity index > 0.05 (see CGIAR) | 6–8 divisions |
| JUNGLE | 0–1000m | <15° | Tropical forest cover > 60% | 2–3 divisions |
| SWAMP | 0–100m | <2° | Wetland cover > 40% | 2–3 divisions |
| COAST | 0–50m | <3° | District borders ocean | 6–8 divisions |

## **2.3 River & Water Body Data**

Rivers are critical for Aetherion's combat system — river crossings impose -40% breakthrough penalties and define defensive lines. Use the following sources:

| **Dataset** | **Content** | **URL** | **Format** | **License** |
| --- | --- | --- | --- | --- |
| HydroSHEDS | Global river network, watersheds, drainage | hydrosheds.org/hydrosheds-core-downloads | Shapefile / GeoTIFF | Free (WWF) |
| Natural Earth Rivers | Major rivers (simplified) | naturalearthdata.com/downloads/10m-physical-vectors/ | GeoJSON | Public Domain |
| GSHHG Coastlines | High-res coastline + lake outlines | soest.hawaii.edu/pwessel/gshhg/ | Shapefile | LGPL |
| Global Lakes & Wetlands | Lakes, reservoirs, wetlands | worldwildlife.org/pages/global-lakes-and-wetlands-database | Shapefile | Free research |

**NOTE:** *Flag any district node that contains a major river crossing (HydroSHEDS ORDER >= 5) with river\_crossing: true in the District schema. This triggers the combat penalty automatically.*

# **3. Population & Demographic Data**

## **3.1 WorldPop — Gridded Population Density**

WorldPop provides 100-meter resolution population grids for every country, updated annually. This is the primary source for seeding POP arrays in each district node.

| **Dataset** | **Resolution** | **Year** | **URL** | **Format** |
| --- | --- | --- | --- | --- |
| WorldPop Global Mosaic | 100m grid | 2020 | hub.worldpop.org/geodata/summary?id=24777 | GeoTIFF |
| WorldPop UN-adjusted | 1km grid | 2020 | hub.worldpop.org/ | GeoTIFF |
| GPW v4 (CIESIN) | ~5km grid | 2020 | sedac.ciesin.columbia.edu/data/collection/gpw-v4 | GeoTIFF / CSV |
| LandScan Global | ~1km grid | 2022 | oakridge.nnl.gov/landscan/ | GeoTIFF (registration req.) |

Pipeline: Aggregate WorldPop 100m grid cells within each GADM district polygon → sum = district total\_pop. Normalize to UN national totals using 2023 UN Population Division data (population.un.org).

## **3.2 Ethnic & Cultural Distribution**

POP culture and religion fields in Aetherion drive ideology drift, separatism risk, and coalition legitimacy. Seed from:

| **Dataset** | **Content** | **URL** | **License** |
| --- | --- | --- | --- |
| Ethnic Power Relations (EPR) | Ethnic group distribution & political status | icr.ethz.ch/data/epr/ | Free research |
| Joshua Project | Ethnolinguistic group data by country/district | joshuaproject.net/resources/datasets | Free |
| Correlates of War (COW) Religion | Religious denomination % per nation | correlatesofwar.org/data-sets/world-religion-project | Free research |
| CIA World Factbook | Ethnic/language % per nation (national level) | cia.gov/the-world-factbook/ | Public Domain (US Gov) |

# **4. Land Cover & Environmental Data**

## **4.1 ESA WorldCover — Land Use Classification**

ESA WorldCover 2021 provides global land cover at 10m resolution with 11 classes. Use this to assign JUNGLE, DESERT, SWAMP, and URBAN terrain overrides where elevation data alone is insufficient.

| **ESA Class** | **Aetherion Terrain Override** | **URL** |
| --- | --- | --- |
| Tree cover (dense tropical) | JUNGLE | esa-worldcover.org/en/download |
| Shrubland + bare/sparse | DESERT (if arid zone) | esa-worldcover.org/en/download |
| Herbaceous wetland | SWAMP | esa-worldcover.org/en/download |
| Built-up / urban | URBAN (if pop > threshold) | esa-worldcover.org/en/download |
| Cropland | PLAINS (agricultural modifier) | esa-worldcover.org/en/download |
| Open water / permanent water | Block as impassable node | esa-worldcover.org/en/download |

**NOTE:** *ESA WorldCover is free under CC-BY 4.0. The full download is ~300 GB; use GEE (Google Earth Engine) to extract per-district summaries without downloading raw tiles.*

## **4.2 Climate Zones — For Desert & Disaster Risk**

| **Dataset** | **Content** | **URL** | **License** |
| --- | --- | --- | --- |
| Koppen-Geiger Climate Classification | Global climate zones (B = arid/desert) | gloh2o.org/koppen/ | Free |
| CHELSA Climate Data | Precipitation, temperature per grid cell | chelsa-climate.org/downloads/ | CC-BY 4.0 |
| EM-DAT Disaster Database | Historical natural disaster records per nation | emdat.be | Free registration |
| Global Aridity Index (CGIAR) | Aridity index for desert classification | cgiarcsi.community/data/global-aridity-and-pet/ | CC-BY 4.0 |

# **5. Road, Rail & Port Infrastructure**

## **5.1 OpenStreetMap Road & Rail Network**

Aetherion's supply line pathfinding traverses a graph of road and rail edges between district nodes. OpenStreetMap is the only globally comprehensive source for this data.

| **Network Type** | **OSM Tags to Extract** | **Tool** | **Aetherion Use** |
| --- | --- | --- | --- |
| Primary Roads | highway=primary|trunk|motorway | Osmium / Geofabrik extract | Primary supply corridors; high throughput |
| Secondary Roads | highway=secondary|tertiary | Osmium | Secondary supply; slower movement |
| Rail Lines | railway=rail (mainline only) | Osmium | Rail supply route; high capacity |
| Ports / Harbours | amenity=port, harbour=\* | Overpass API | Maritime trade node; naval basing |
| Airports | aeroway=aerodrome (major) | Overpass API | Airfield tier seed data |

* Primary download: download.geofabrik.de — per-continent and per-country PBF extracts
* Processing tool: osmium-tool (osmcode.org/osmium-tool/) — extract specific highway/railway tags
* Convert to graph: use osm2graph or custom script to build adjacency graph matching province node centroids

## **5.2 Port & Maritime Data**

| **Dataset** | **Content** | **URL** | **License** |
| --- | --- | --- | --- |
| World Port Index (NGA) | All major world ports — coordinates, depth, facilities | msi.nga.mil/Publications/WPI | Public Domain (US Gov) |
| OpenSeaMap | Maritime navigation data | openseamap.org | CC-BY-SA |
| NIMA Port Database | 400+ major commercial ports | Included in NGA WPI | Public Domain |

# **6. Data Processing Pipeline**

## **6.1 Recommended Toolchain**

| **Tool** | **Purpose** | **Install** | **Cost** |
| --- | --- | --- | --- |
| QGIS 3.x | Visual GIS editor; inspect, merge, reproject all datasets | qgis.org | Free/Open Source |
| GDAL/OGR | Command-line raster/vector processing | gdal.org (bundled with QGIS) | Free |
| Osmium Tool | Process OpenStreetMap PBF files | osmcode.org/osmium-tool/ | Free |
| Python + GeoPandas | Batch processing boundary + elevation data | geopandas.org | Free |
| Google Earth Engine | Cloud processing of large rasters (ESA, SRTM) | earthengine.google.com | Free (registration) |
| Tippecanoe | Convert GeoJSON to map tiles for Three.js | github.com/felt/tippecanoe | Free |
| MapShaper | Simplify/merge GeoJSON boundaries; reduce file size | mapshaper.org | Free |
| Node.js + turf.js | Spatial operations in JS (centroid, intersection, bbox) | turfjs.org | Free |

## **6.2 Step-by-Step Processing Workflow**

**Step 1 — Download Base Boundaries**

* Download GADM world GeoPackage (gadm.org) — all levels 0–3
* Download Natural Earth 10m Admin 0 + Admin 1 + Coastlines
* Download SRTM 3-arc GeoTIFF tiles for all continents

**Step 2 — Build District Node Graph**

* Load GADM level 2–3 polygons in QGIS
* Calculate centroid for each polygon: Vector > Geometry Tools > Centroids
* Export centroid coordinates + admin names as CSV: id, name, lat, lng, nation\_id, province\_id
* Build adjacency list: for each district, find all polygons that share a border edge (touch) — this is the province node graph

**Step 3 — Attach Terrain Classification**

* Zonal statistics in QGIS: Raster > Zonal Statistics — apply SRTM DEM to GADM polygons
* Output: mean\_elevation, max\_slope per district
* Apply terrain classification thresholds (see Section 2.2) in Python/GeoPandas
* Apply ESA WorldCover overrides for JUNGLE/SWAMP/DESERT/URBAN

**Step 4 — Attach Population**

* WorldPop 1km grid: Zonal Statistics — sum population within each GADM district polygon
* Normalize totals to UN national population figures
* Distribute into POP class arrays using CIA World Factbook % data

**Step 5 — Flag River Crossings & Coasts**

* HydroSHEDS: flag districts containing rivers of ORDER >= 5 as river\_crossing: true
* Natural Earth Coastlines: flag districts bordering ocean as coastal: true

**Step 6 — Export to Game Format**

* Export final district table as provinces.json matching the District schema in TDD Chapter 2
* Simplify GeoJSON boundaries using MapShaper (set tolerance to ~0.001 degrees) to reduce file size
* Target: provinces.json ~ 40–80 MB for full 80,000-node world

## **6.3 Nation List — All 195 Sovereign States**

The following table lists all UN-recognized sovereign nations plus key observer/de-facto states. These are the base 200+ nations for Aetherion. ISO codes match Natural Earth and GADM datasets.

| **Region** | **Nations (ISO-3 codes)** |
| --- | --- |
| North America | USA, CAN, MEX, GTM, BLZ, HND, SLV, NIC, CRI, PAN, CUB, JAM, HTI, DOM, PRI, TTO, BRB, LCA, VCT, GRD, ATG, DMA, KNA |
| South America | COL, VEN, GUY, SUR, BRA, ECU, PER, BOL, CHL, ARG, URY, PRY |
| Western Europe | GBR, IRL, FRA, BEL, NLD, LUX, DEU, CHE, AUT, LIE, MCO, AND, ESP, PRT, ITA, SMR, VAT, MLT, GRC, CYP |
| Northern Europe | NOR, SWE, DNK, FIN, ISL, EST, LVA, LTU, POL, CZE, SVK, HUN, SVN, HRV, BIH, SRB, MNE, MKD, ALB, KOS |
| Eastern Europe / Russia | RUS, UKR, BLR, MDA, ROU, BGR |
| Middle East | TUR, SYR, LBN, ISR, PSE, JOR, IRQ, IRN, KWT, SAU, BHR, QAT, ARE, OMN, YEM |
| Central Asia | KAZ, UZB, TKM, KGZ, TJK, AFG |
| South Asia | PAK, IND, BGD, NPL, BTN, LKA, MDV |
| East Asia | CHN, MNG, PRK, KOR, JPN, TWN |
| Southeast Asia | MMR, THA, LAO, KHM, VNM, PHL, MYS, BRN, SGP, IDN, TLS |
| Oceania | AUS, NZL, PNG, FJI, SLB, VUT, WSM, TON, KIR, FSM, MHL, PLW, NRU, TUV |
| Central / West Africa | CMR, NGA, NER, TCD, CAF, COD, COG, GAB, GNQ, STP, BEN, TGO, GHA, CIV, LBR, SLE, GIN, GNB, SEN, GMB, MLI, BFA, CPV, MRT |
| East Africa | ETH, ERI, DJI, SOM, SSD, SDN, KEN, UGA, RWA, BDI, TZA, MOZ, ZMB, MWI, ZWE, COM, MDG, MUS, SYC |
| North Africa | MAR, DZA, TUN, LBA, EGY |
| Southern Africa | NAM, BWA, ZAF, LSO, SWZ, AGO |
| Caucasus / Black Sea | ARM, AZE, GEO |
| De-facto / Observer States | TWN, XKX (Kosovo), XSO (Somaliland), XSE (Sahrawi), PSE, HKG (Special Admin) |

# **7. Three.js Map Integration Notes**

## **7.1 GeoJSON to Three.js Mesh Pipeline**

The Three.js renderer uses InstancedMesh with one instance per district. The conversion from GeoJSON polygon boundaries to Three.js geometries follows this pipeline:

* Load simplified provinces.json GeoJSON at startup
* For each GeoJSON Feature (district polygon): project coordinates to sphere surface using THREE.SphericalMercator or equirectangular UV mapping
* Triangulate the polygon using earcut.js (already bundled with Three.js as THREE.ShapeUtils.triangulateShape)
* Create a BufferGeometry from the triangulated mesh; store as one instance in InstancedMesh
* Store centroid [lat, lng] in a parallel array for raycasting and label placement
* Border edges: extract exterior ring of each polygon; render as LineSegments on a separate BorderLayer (not part of InstancedMesh)

## **7.2 Projection Recommendation**

For a globe (sphere), use equirectangular projection (simple lat/lng to UV). For flat map view (if implemented), use Natural Earth projection or Winkel Tripel for minimum distortion. Three.js globe uses spherical projection:

* Longitude → azimuthal angle (phi): phi = (lng + 180) \* (Math.PI / 180)
* Latitude → polar angle (theta): theta = (90 - lat) \* (Math.PI / 180)
* Sphere radius: 200 units (arbitrary; scale other elements accordingly)
* Border lines: extrude slightly above sphere surface (radius \* 1.001) to prevent z-fighting

## **7.3 File Size & LOD Strategy**

| **LOD Level** | **District Count** | **File Size (est.)** | **When Loaded** | **How Generated** |
| --- | --- | --- | --- | --- |
| LOD 0 — Globe | ~195 nation polygons | ~2 MB | Always | Natural Earth Admin 0 |
| LOD 1 — Continental | ~5,000 province polygons | ~15 MB | Zoom 1–2 | GADM level 1 + MapShaper simplify 0.01 |
| LOD 2 — Regional | ~20,000 district polygons | ~60 MB | Zoom 3–4 | GADM level 2 + MapShaper simplify 0.005 |
| LOD 3 — National | ~80,000 district polygons | ~200 MB | Zoom 4+ | GADM level 3 + MapShaper simplify 0.001 |

**NOTE:** *Stream LOD 3 data on demand per-region as the player zooms in, rather than loading the full 200MB at startup. Three.js supports this via async geometry loading while the InstancedMesh is already rendered with LOD 2 data.*

# **8. Disputed Territories & Special Cases**

Aetherion includes disputed territories as separate map entities with ambiguous sovereignty. The following cases require special handling in the boundary data:

| **Territory** | **Claimants** | **GADM/NE Handling** | **Aetherion Implementation** |
| --- | --- | --- | --- |
| Taiwan (ROC) | PRC claims; ROC governs | Natural Earth includes as separate Admin 0 | Separate nation node; PRC has 'claim' flag |
| Kosovo | Serbia claims; ~100 nations recognize | Natural Earth: optional layer | Separate nation; disputed province flag on Serbia map |
| Kashmir | India, Pakistan, China all claim portions | GADM: split by de-facto control line | Three district groups: IND-admin, PAK-admin, CHN-admin; all flagged disputed |
| Palestine (West Bank / Gaza) | Israel / PA control split | GADM: separate admin areas | Two sub-nation zones; occupation flag active |
| Western Sahara | Morocco administers; Sahrawi claims | Natural Earth: separate with note | Morocco-controlled with Sahrawi separatist insurgency seed |
| Crimea | Russia controls since 2014; Ukraine claims | GADM: shown as Ukraine; NE: ambiguous | Russia-occupied flag; Ukraine claim; sanctions active |
| South China Sea Islands | Multiple claimants | NE: no sovereignty assigned | Floating province nodes; claim flags for CHN/VNM/PHL/MYS |
| Falkland Islands | UK governs; Argentina claims | GADM: UK territory | UK sovereign; ARG historical claim in Epochal Memory |
| Abkhazia / S. Ossetia | Russia recognizes; Georgia claims | GADM: Georgia admin | Separate nodes; Russian-backed; Georgian claim |
| Northern Cyprus | Turkey recognizes; Cyprus/UN don't | NE: Cyprus-administered | Separate node; Turkish-backed; CYP claim |

# **9. Quick Reference — All Sources**

| **Category** | **Primary Source** | **Backup Source** | **URL** |
| --- | --- | --- | --- |
| Nation boundaries | Natural Earth 10m | GADM level 0 | naturalearthdata.com |
| Province/state boundaries | GADM level 1 | Natural Earth Admin 1 | gadm.org |
| District boundaries | GADM level 2–3 | OpenStreetMap | gadm.org |
| Elevation / terrain | SRTM 3-arc | GMTED2010 (polar) | earthdata.nasa.gov |
| Rivers | HydroSHEDS | Natural Earth Rivers | hydrosheds.org |
| Coastlines | GSHHG | Natural Earth Coastlines | soest.hawaii.edu/pwessel/gshhg |
| Land cover / jungle/desert | ESA WorldCover 2021 | Koppen-Geiger Climate | esa-worldcover.org |
| Population density | WorldPop 1km | GPW v4 (CIESIN) | hub.worldpop.org |
| Ethnic/cultural distribution | EPR Dataset | Joshua Project | icr.ethz.ch/data/epr |
| Roads / rail | OpenStreetMap (Geofabrik) | OSM Overpass API | download.geofabrik.de |
| Ports | NGA World Port Index | OpenSeaMap | msi.nga.mil |
| Climate zones | Koppen-Geiger | CHELSA | gloh2o.org/koppen |
| Processing / GIS | QGIS + GDAL | Google Earth Engine | qgis.org |
| JS spatial ops | Turf.js | D3-geo | turfjs.org |

AETHERION · Map Data Reference v1.0 · CONFIDENTIAL INTERNAL DOCUMENT