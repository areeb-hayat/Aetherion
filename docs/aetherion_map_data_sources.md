| AETHERION |           | —    | Map         | Data | Sources |           | & Geo- |
| --------- | --------- | ---- | ----------- | ---- | ------- | --------- | ------ |
| graphic   | Reference |      |             |      |         |           |        |
| Document  | Type:     | Data | Acquisition |      | Guide   | · Version | 1.0    |
| Companion | to TDD    | v1.0 | — Chapter   |      | 02, 05, | 06, 07    |        |
Overview
Aetherion requires three tiers of geographic data to build the world map at full
fidelity:
| 1. Administrative |           | Boundaries     |            | — sovereign | borders,  | provinces, | districts |
| ----------------- | --------- | -------------- | ---------- | ----------- | --------- | ---------- | --------- |
| (~80,000          | nodes)    |                |            |             |           |            |           |
| 2. Physical       | Geography |                | — terrain, | elevation,  | rivers,   | coastlines |           |
| 3. Topology       | &         | Infrastructure |            | — roads,    | railways, | ports,     | airfields |
All data sources listed below are either open-license (CC0, ODbL, public do-
main) or have a free tier suﬀicient for game development use. Every source is
a known, stable project as of 2025. Always verify the current license before
shipping.
| PART             | 1 — Administrative |                        |             | Boundaries |            |                |         |
| ---------------- | ------------------ | ---------------------- | ----------- | ---------- | ---------- | -------------- | ------- |
| 1.1 Natural      | Earth              | (naturalearthdata.com) |             |            |            |                |         |
| The essential    | starting           | point                  | for         | every      | tier of    | the hierarchy. |         |
|                  |                    |                        | What        | You        |            |                |         |
| Dataset          | Scale              |                        | Get         |            | Format     |                | License |
| Admin            | 0 — 1:10m          | /                      | 195         | sovereign  | Shapefile, |                | Public  |
| Countries        | 1:50m              | /                      | states      | +          | GeoJSON    |                | Domain  |
|                  | 1:110m             |                        | territories |            |            |                |         |
| Admin            | 1 — 1:10m          |                        | ~4,800      |            | Shapefile, |                | Public  |
| States/Provinces |                    |                        | first-level |            | GeoJSON    |                | Domain  |
divisions
| Admin          | 2 — 1:10m |     | ~60,000      |      | Shapefile, |     | Public |
| -------------- | --------- | --- | ------------ | ---- | ---------- | --- | ------ |
| Coun-          |           |     | second-level |      | GeoJSON    |     | Domain |
| ties/Districts |           |     | divisions    |      |            |     |        |
| Urban Areas    | 1:10m     |     | Major        | city | Shapefile, |     | Public |
|                |           |     | polygons     |      | GeoJSON    |     | Domain |
| Populated      | 1:10m     |     | 7,300+       |      | Shapefile, |     | Public |
| Places         |           |     | named        |      | GeoJSON    |     | Domain |
settlements
1

Recommended download: All Admin 0/1/2 at 1:10m scale. This gives you
your T2 Province and T4 Nation layers immediately, and Admin 2 covers most
| of the T1 | District layer    | in             | developed | countries. |           |     |     |     |     |
| --------- | ----------------- | -------------- | --------- | ---------- | --------- | --- | --- | --- | --- |
| Tool to   | convert Shapefile |                | →         | GeoJSON:   |           |     |     |     |     |
| ogr2ogr   | -f GeoJSON        | output.geojson |           |            | input.shp |     |     |     |     |
1.2 GADM — Database of Global Administrative Areas (gadm.org)
| Best source | for district-level |     |           | (T1)  | boundaries | worldwide. |            |          |                   |
| ----------- | ------------------ | --- | --------- | ----- | ---------- | ---------- | ---------- | -------- | ----------------- |
| Level       | Coverage           |     | Node      | Count | (approx.)  |            | Format     |          |                   |
| Level 0     | Countries          |     | ~200      |       |            |            | Shapefile, | GeoJSON, | R SpatialPolygons |
| Level 1     | States/Regions     |     | ~3,500    |       |            |            | Same       |          |                   |
| Level 2     | Counties/Districts |     | ~45,000   |       |            |            | Same       |          |                   |
| Level 3     | Sub-districts      |     | ~200,000+ |       | (where     | available) | Same       |          |                   |
| Level 4     | Municipalities     |     | ~500,000+ |       | (select    | countries) | Same       |          |                   |
Key facts: - GADM is the most comprehensive boundary dataset for Level
2 and below. - License: Free for academic/non-commercial. For a commer-
cial game, check current GADM license terms — they have historically permit-
ted non-commercial use and have a paid commercial license pathway. - Data
quality varies by country. Western Europe, US, Japan are excellent. Some
African/MENAcountriesarecoarser. -Downloadableper-countryorasaglobal
file. Global Level 2 GeoJSON is ~2 GB uncompressed — process per-region for
performance.
Recommended strategy for Aetherion: UseGADMLevel2astheprimary
T1 District source. Supplement with OpenStreetMap (see §1.3) for countries
| where GADM        | Level | 2 coverage | is  | thin. |                     |     |     |     |     |
| ----------------- | ----- | ---------- | --- | ----- | ------------------- | --- | --- | --- | --- |
| 1.3 OpenStreetMap |       | / Overpass |     | API   | (openstreetmap.org) |     |     |     |     |
Crowdsourced; best for infrastructure data. Also has admin bound-
| aries via      | the boundary=administrative |     |                                    |     | relation. |                |              |          |     |
| -------------- | --------------------------- | --- | ---------------------------------- | --- | --------- | -------------- | ------------ | -------- | --- |
| Data Type      |                             |     | OSM                                | Tag |           | Use            | in Aetherion |          |     |
| Administrative |                             |     | boundary=administrativeS,upplement |     |           |                |              | GADM for |     |
| boundaries     |                             |     | admin_level=2–10                   |     |           | detailed       | districts    |          |     |
| Roads          |                             |     | highway=*                          |     |           | Infrastructure |              | tier for |     |
districts
2

| Data Type |     |     | OSM          | Tag |     | Use      | in Aetherion |        |          |
| --------- | --- | --- | ------------ | --- | --- | -------- | ------------ | ------ | -------- |
| Railways  |     |     | railway=rail |     |     | Rail     | tier         | (0-5)  | in       |
|           |     |     |              |     |     | District |              | schema |          |
| Ports     |     |     | harbour=*,   |     |     | Port     | tier         | per    | district |
amenity=ferry_terminal
| Airfields |     |     | aeroway=aerodrome, |     |     | Airfield |     | tier per | district |
| --------- | --- | --- | ------------------ | --- | --- | -------- | --- | -------- | -------- |
aeroway=airstrip
| Military | bases |     |     |     |     | Military |     | base | special |
| -------- | ----- | --- | --- | --- | --- | -------- | --- | ---- | ------- |
landuse=military
zones
| Industrial | zones |     | landuse=industrial |     |     | Industrial |     | special | zone |
| ---------- | ----- | --- | ------------------ | --- | --- | ---------- | --- | ------- | ---- |
seeding
Download options: - Geofabrik (download.geofabrik.de) — pre-packaged
regional .osm.pbf extracts, updated daily. Best option. - Planet.osm — full
planet dump, ~75 GB compressed. Only needed if you want everything at once.
- Overpass API (overpass-api.de) — query specific features on demand (good
| for targeted | infrastructure |     | data) |     |     |     |     |     |     |
| ------------ | -------------- | --- | ----- | --- | --- | --- | --- | --- | --- |
License: Open Database License (ODbL) — attribution required; derivative
| databases   | must     | also be    | open.    | For game | use, attribute | OSM      | in  | credits. |     |
| ----------- | -------- | ---------- | -------- | -------- | -------------- | -------- | --- | -------- | --- |
| Recommended |          | processing |          | stack:   |                |          |     |          |     |
| # Extract   | specific |            | features | from a   | regional       | .osm.pbf |     |          |     |
osmium tags-filter region.osm.pbf n/aeroway=aerodrome -o airfields.osm.pbf
| osmium       | export | airfields.osm.pbf |     | -o  | airfields.geojson |     |     |     |     |
| ------------ | ------ | ----------------- | --- | --- | ----------------- | --- | --- | --- | --- |
| 1.4 Wikidata |        | / WikiShapes      |     |     |                   |     |     |     |     |
Useful for mapping administrative division names to metadata(oﬀicial
| names in   | multiple | languages,         |           | ISO codes,      | capital        | cities, population). |        |        |          |
| ---------- | -------- | ------------------ | --------- | --------------- | -------------- | -------------------- | ------ | ------ | -------- |
| • Query    | at:      | query.wikidata.org |           |                 |                |                      |        |        |          |
| • Every    | country, | province,          |           | and city        | has a Wikidata |                      | QID    | — lets | you link |
| geographic |          | nodes              | to your   | nations.json    | and            | history.json         |        | data   |          |
| Example    | SPARQL   | query              |           | — all countries | with           | ISO                  | codes: |        |          |
| SELECT     | ?country | ?countryLabel      |           | ?isoCode        | WHERE          | {                    |        |        |          |
| ?country   | wdt:P31  |                    | wd:Q6256. |                 |                |                      |        |        |          |
| ?country   | wdt:P297 |                    | ?isoCode. |                 |                |                      |        |        |          |
SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
3

| 1.5 Country-Specific |     |     | High-Resolution |     | Sources |     |     |
| -------------------- | --- | --- | --------------- | --- | ------- | --- | --- |
Forthe most strategically important nations, use oﬀicial government open-data
| portals | for district-level |     | precision: |        |       |                      |     |
| ------- | ------------------ | --- | ---------- | ------ | ----- | -------------------- | --- |
| Country |                    |     | Source     |        |       | URL                  |     |
| United  | States             |     | US         | Census | TIGER | census.gov/geo/maps- |     |
data
| European | Union | (all | GISCO | (Eurostat) |     | gisco-                |     |
| -------- | ----- | ---- | ----- | ---------- | --- | --------------------- | --- |
| members) |       |      |       |            |     | services.ec.europa.eu |     |
United Kingdom ONS Open Geography geoportal.statistics.gov.uk
| India |     |     | Survey | of  | India / | bhuvan.nrsc.gov.in |     |
| ----- | --- | --- | ------ | --- | ------- | ------------------ | --- |
SEDAC
| China |     |     | RESDC |     |     | resdc.cn | (registration |
| ----- | --- | --- | ----- | --- | --- | -------- | ------------- |
required)
| Pakistan |     |     | Pakistan |     | Bureau of | pbs.gov.pk |     |
| -------- | --- | --- | -------- | --- | --------- | ---------- | --- |
Statistics
| Russia        |     |          | ROSREESTR  |       | /         | Indirect                | via GADM |
| ------------- | --- | -------- | ---------- | ----- | --------- | ----------------------- | -------- |
|               |     |          | OKATO      |       |           | Level                   | 3        |
| Brazil        |     |          | IBGE       |       |           | ibge.gov.br/geociencias |          |
| Australia     |     |          | ABS        |       |           | abs.gov.au/geography    |          |
| Canada        |     |          | Statistics |       | Canada    | statcan.gc.ca/geo       |          |
| Japan         |     |          | GSI        | Japan |           | gsi.go.jp               |          |
| PART          | 2 — | Physical | Geography  |       | & Terrain |                         |          |
| 2.1 Elevation |     | Data —   | SRTM       | &     | NASADEM   |                         |          |
Shuttle Radar Topography Mission (SRTM) is the standard global eleva-
tion source.
| Dataset |     | Resolution |     |     | Coverage  |     | Source             |
| ------- | --- | ---------- | --- | --- | --------- | --- | ------------------ |
| SRTM    |     | 30m        |     |     | 60°N–56°S |     | earthdata.nasa.gov |
1-arc-second
(~30m)
| SRTM         |     | 90m |     |     | Same |     | USGS          |
| ------------ | --- | --- | --- | --- | ---- | --- | ------------- |
| 3-arc-second |     |     |     |     |      |     | EarthExplorer |
(~90m)
| NASADEM |     | 30m |     |     | Same (improved |     | earthdata.nasa.gov |
| ------- | --- | --- | --- | --- | -------------- | --- | ------------------ |
SRTM)
| ASTER | GDEM | 30m |     |     | 83°N–83°S |     | earthdata.nasa.gov |
| ----- | ---- | --- | --- | --- | --------- | --- | ------------------ |
v3
4

Dataset Resolution Coverage Source
Copernicus DEM 30m Global including spacedata.copernicus.eu
GLO-30 poles
Use in Aetherion: Derive the elevation field in the District schema. Eleva-
tion bands map to terrain types:
Elevation (m) Default Terrain Tag
0–50 PLAINS or COAST (if coastal)
50–500 PLAINS or HILL
500–1500 HILL
1500+ MOUNTAIN
Any (urban density) URBAN (override)
Any (arid, low precip) DESERT (override)
Tropical belt + high precip JUNGLE (override)
Wetland classification SWAMP (override)
Processing tool: GDAL — gdalwarp, gdal_polygonize to convert raster
elevation to district-level averages.
# Compute mean elevation per district polygon
gdal_rasterize -l districts -a fid districts.geojson district_ids.tif -tr 0.001 0.001
zonal_statistics.py --raster srtm_30m.tif --zones districts.geojson --stat mean --output district_elevation.json
2.2 Terrain Classification — Derived Layers
Dataset Source Use
Global Land Cover esa-landcover-cci.org JUNGLE, SWAMP,
(ESA CCI LC) DESERT, PLAINS
classification
Global Surface Water global-surface- River crossings, coastal
(JRC) water.appspot.com districts
HWSD Soil World fao.org Agricultural RGO
Database potential per district
Koeppen-Geiger koeppen-geiger.vu- Climate overlay layer
Climate Zones wien.ac.at (#13)
Global Aridity Index cgiar-csi.org Desert classification
(CGIAR)
Recommended terrain assignment pipeline: 1. Start with ESA CCI LC
for base terrain tag 2. Override with SRTM elevation for MOUNTAIN/HILL
5

3. OverridecoastaldistrictsusingNaturalEarthcoastline+JRCsurfacewater
4. Override urban districts using population density threshold (WorldPop or
GHS)
| 2.3 Hydrography |       | — Rivers | & Water    | Bodies     |                      |
| --------------- | ----- | -------- | ---------- | ---------- | -------------------- |
| Dataset         |       | Coverage |            | Format     | Source               |
| HydroSHEDS      |       | Global   |            | Shapefile, | hydrosheds.org       |
| River Network   |       |          |            | GeoJSON    |                      |
| Natural         | Earth | Global   | (major     | Shapefile, | naturalearthdata.com |
| Rivers          |       | rivers)  |            | GeoJSON    |                      |
| OpenStreetMap   |       | Global   | (detailed) | OSM        | overpass-api.de      |
waterways
Use in Aetherion: Derive the river_crossing: boolean field in District
schema. Districts that contain a major river crossing get a combat movement
penalty in the military engine. Also feeds the Trade Route pathfinding edge
weights.
2.4 Coastlines
| Dataset |     | Resolution |     |     | Source |
| ------- | --- | ---------- | --- | --- | ------ |
GSHHG (Global 5 levels from 1km to soest.hawaii.edu/pwessel/gshhg
| Self-consistent |          | 25m |     |     |     |
| --------------- | -------- | --- | --- | --- | --- |
| Hierarchical    | High-res |     |     |     |     |
Geography)
| Natural | Earth | 1:10m | / 1:50m |     | naturalearthdata.com |
| ------- | ----- | ----- | ------- | --- | -------------------- |
Coastlines
| OSM coastline |     | Variable |     |     | osmdata.openstreetmap.de |
| ------------- | --- | -------- | --- | --- | ------------------------ |
Use in Aetherion: Derive boolean. Coastal districts unlock port
coastal:
constructionandnavalsupplylines. GSHHGisthemostprecise;NaturalEarth
| is suﬀicient       | for gameplay | purposes.      |      |     |     |
| ------------------ | ------------ | -------------- | ---- | --- | --- |
| PART               | 3 —          | Infrastructure | Data |     |     |
| 3.1 Transportation |              | Networks       |      |     |     |
6

Infrastructure Type Primary Source Secondary
Railways (global) OpenRailwayMap OSM railway=rail
(openrailwaymap.org)
Roads (global) OSM highway=* TomTom (licensed)
Major ports World Port Index OSM
(NGIA) — msi.nga.mil
Airports / Airfields OurAirports OSM
(ourairports.com) — aeroway=aerodrome
free CSV/GeoJSON
Military bases Global Military OSM
Spending DB landuse=military
(Stockholm SIPRI)
OurAirports is particularly valuable: it lists every airport and airfield world-
wide with ICAO/IATA codes, runway length, surface type, elevation, and coor-
dinates. FreedownloadasCSV.Directlymapstoairfield_tierintheDistrict
schema:
Runway Length Airfield Tier
No airfield 0
<1,000m (grass/dirt strip) 1
1,000–2,000m (paved light) 2
2,000–3,000m (regional jet) 3
3,000m+ (long-haul capable) 4
World Port Index (Pub 150): Published by the US National Geospatial-
Intelligence Agency. Lists ~3,500 ports worldwide with harbor size, max vessel
draft, facilities, latitude/longitude. Public domain. Maps to port_tier (0–5)
based on throughput classification.
3.2 Rail Tier Derivation
Use OpenRailwayMap + electrification/speed tags to derive rail infrastructure
tier per district:
Rail Tier Criteria
0 No railway in district
1 Narrow-gauge or heritage line
2 Standard-gauge freight only
3 Passenger rail ￿120 km/h
4 High-speed rail ￿250 km/h
7

|                | Rail Tier | Criteria   |      |                   |      |             |     |
| -------------- | --------- | ---------- | ---- | ----------------- | ---- | ----------- | --- |
|                | 5         | HSR        | >250 | km/h (Shinkansen, | TGV, | CRH tier)   |     |
| PART           | 4 —       | Population |      | Data              |      |             |     |
| 4.1 Population |           | Grids      |      |                   |      |             |     |
| Dataset        |           | Resolution |      | Source            |      | Notes       |     |
| WorldPop       |           | 100m       |      | worldpop.org      |      | Per-country |     |
age/sex
breakdowns
| GHS-POP | (JRC) | 100m/1km |     | ghsl.jrc.ec.europa.eu1975–2030 |     |     | time |
| ------- | ----- | -------- | --- | ------------------------------ | --- | --- | ---- |
series
| GPW      | v4  | 30     | arc-sec | sedac.ciesin.columbiaU.eNd-uadjusted |     |         |     |
| -------- | --- | ------ | ------- | ------------------------------------ | --- | ------- | --- |
| (SEDAC)  |     | (~1km) |         |                                      |     |         |     |
| LandScan |     | 1km    |         | landscan.ornl.gov                    |     | Ambient |     |
population
(day+night)
Use in Aetherion: Seed the total_pop field per district. Divide into POP
classes using GDP/occupation data. WorldPop is the recommended primary
| source           | — free academic |        | download, | high resolution. |     |     |     |
| ---------------- | --------------- | ------ | --------- | ---------------- | --- | --- | --- |
| 4.2 Urbanization |                 | Layers |           |                  |     |     |     |
| Dataset          |                 |        | Source    |                  | Use |     |     |
GHS Urban Centre DB ghsl.jrc.ec.europa.eu Identify URBAN terrain
| (UCDB)     |             |     |                      |     | districts      |         |     |
| ---------- | ----------- | --- | -------------------- | --- | -------------- | ------- | --- |
| Global     | Human       |     | Same                 |     | Urban          | density |     |
| Settlement | Layer       |     |                      |     | classification |         |     |
| Natural    | Earth Urban |     | naturalearthdata.com |     | Simplified     | urban   |     |
| Areas      |             |     |                      |     | polygons       |         |     |
Districts above the GHS urban centre threshold get the URBAN terrain tag and
are candidates for Found a City administrative actions at game start if pop +
| econ | thresholds | are met. |     |     |     |     |     |
| ---- | ---------- | -------- | --- | --- | --- | --- | --- |
8

| PART            | 5 — Data | Processing |               | Pipeline |     |          |
| --------------- | -------- | ---------- | ------------- | -------- | --- | -------- |
| 5.1 Recommended |          | Tool       | Stack         |          |     |          |
| Tool            |          |            | Purpose       |          |     | Install  |
| GDAL            | / OGR    |            | Raster/vector |          |     | gdal.org |
geoprocessing
| QGIS    |              |     | Visual inspection, |            |     | qgis.org    |
| ------- | ------------ | --- | ------------------ | ---------- | --- | ----------- |
|         |              |     | manual             | editing    |     |             |
| PostGIS | + PostgreSQL |     | Spatial            | database   | for | postgis.net |
|         |              |     | large datasets     |            |     |             |
| Turf.js |              |     | GeoJSON            | operations | in  | turfjs.org  |
Node/browser
| mapshaper |     |     | Fast simplification |     | of  | mapshaper.org |
| --------- | --- | --- | ------------------- | --- | --- | ------------- |
GeoJSON
| tippecanoe  |     |     | Convert      | GeoJSON    | to  | github.com/mapbox/tippecanoe |
| ----------- | --- | --- | ------------ | ---------- | --- | ---------------------------- |
|             |     |     | vector tiles |            |     |                              |
| osmium-tool |     |     | OSM data     | processing |     | osmcode.org/osmium-          |
tool
| pyogrio | / geopandas |     | Python | GeoDataFrame |     | geopandas.org |
| ------- | ----------- | --- | ------ | ------------ | --- | ------------- |
processing
| 5.2 GeoJSON | Simplification |     | Strategy |     |     |     |
| ----------- | -------------- | --- | -------- | --- | --- | --- |
Raw GADM Level 2 GeoJSON is far too detailed for a real-time Three.js globe.
| Simplify          | before ingestion:         |                         |                    |       |           |               |
| ----------------- | ------------------------- | ----------------------- | ------------------ | ----- | --------- | ------------- |
| # Simplify        | to ~80,000                |                         | node target        | using | mapshaper |               |
| mapshaper         | gadm_level2_world.geojson |                         |                    |       | \         |               |
| -simplify         | 5%                        | keep-shapes             | \                  |       |           |               |
| -o format=geojson |                           | gadm_simplified.geojson |                    |       |           |               |
| # Or use          | GDAL Douglas-Peucker      |                         |                    |       |           |               |
| ogr2ogr           | -simplify                 | 0.01                    | simplified.geojson |       |           | input.geojson |
Simplification tolerance guide: -Globalview: 0.05°tolerance-Continental:
0.01° tolerance
- Regional/National: 0.005° tolerance - Consider level-of-detail (LOD) tiling —
| serve different | simplification |        | levels | at different | zoom | stages |
| --------------- | -------------- | ------ | ------ | ------------ | ---- | ------ |
| 5.3 Coordinate  |                | System |        |              |      |        |
Use EPSG:4326 (WGS 84 geographic) for all boundary data — this is what
Three.js sphere projection expects. Convert any data in projected CRS (UTM,
9

| national     | grids) | to 4326   | before | ingestion:     |     |               |     |
| ------------ | ------ | --------- | ------ | -------------- | --- | ------------- | --- |
| ogr2ogr      | -t_srs | EPSG:4326 |        | output.geojson |     | input.geojson |     |
| 5.4 District | ID     | Strategy  |        |                |     |               |     |
Each district needs a stable unique ID across all data sources. Recommended
format:
{ISO_ALPHA2}_{GADM_GID}
| e.g. "PK_PAK.3.2.4_1" |     |     | ←   | Pakistan, | Punjab, | Lahore, | district 4 |
| --------------------- | --- | --- | --- | --------- | ------- | ------- | ---------- |
Use GADM’s own GID field as the primary key since it is consistent across
releases. Map OSM relation IDs and Natural Earth admin codes into a lookup
| table keyed | by     | GADM          | GID.  |            |     |        |                   |
| ----------- | ------ | ------------- | ----- | ---------- | --- | ------ | ----------------- |
| PART        | 6 —    | All Countries |       | Reference  |     | List   |                   |
| 6.1 UN      | Member | States        | (193) | + Observer |     | States | + Key Territories |
The following is the complete list structured for nations.json. ISO codes and
natural regions are included for seeding AI archetypes and geographic grouping
| (trade corridors, |       | military | theaters). |       |             |     |                 |
| ----------------- | ----- | -------- | ---------- | ----- | ----------- | --- | --------------- |
| AFRICA            | (54   | states)  |            |       |             |     |                 |
| # Country         |       |          |            | ISO-2 | Capital     |     | Region          |
| 1 Algeria         |       |          |            | DZ    | Algiers     |     | North Africa    |
| 2 Angola          |       |          |            | AO    | Luanda      |     | Central Africa  |
| 3 Benin           |       |          |            | BJ    | Porto-Novo  |     | West Africa     |
| 4 Botswana        |       |          |            | BW    | Gaborone    |     | Southern Africa |
| 5 Burkina         |       | Faso     |            | BF    | Ouagadougou |     | West Africa     |
| 6 Burundi         |       |          |            | BI    | Gitega      |     | East Africa     |
| 7 Cabo            | Verde |          |            | CV    | Praia       |     | West Africa     |
| 8 Cameroon        |       |          |            | CM    | Yaoundé     |     | Central Africa  |
| 9 Central         |       | African  | Republic   | CF    | Bangui      |     | Central Africa  |
| 10 Chad           |       |          |            | TD    | N’Djamena   |     | Central Africa  |
| 11 Comoros        |       |          |            | KM    | Moroni      |     | East Africa     |
| 12 DR             | Congo |          |            | CD    | Kinshasa    |     | Central Africa  |
| 13 Republic       |       | of Congo |            | CG    | Brazzaville |     | Central Africa  |
| 14 Djibouti       |       |          |            | DJ    | Djibouti    |     | East Africa     |
| 15 Egypt          |       |          |            | EG    | Cairo       |     | North Africa    |
| 16 Equatorial     |       | Guinea   |            | GQ    | Malabo      |     | Central Africa  |
| 17 Eritrea        |       |          |            | ER    | Asmara      |     | East Africa     |
10

| # Country        |                 | ISO-2 | Capital      | Region          |
| ---------------- | --------------- | ----- | ------------ | --------------- |
| 18 Eswatini      |                 | SZ    | Mbabane      | Southern Africa |
| 19 Ethiopia      |                 | ET    | Addis Ababa  | East Africa     |
| 20 Gabon         |                 | GA    | Libreville   | Central Africa  |
| 21 Gambia        |                 | GM    | Banjul       | West Africa     |
| 22 Ghana         |                 | GH    | Accra        | West Africa     |
| 23 Guinea        |                 | GN    | Conakry      | West Africa     |
| 24 Guinea-Bissau |                 | GW    | Bissau       | West Africa     |
| 25 Ivory         | Coast           | CI    | Yamoussoukro | West Africa     |
| 26 Kenya         |                 | KE    | Nairobi      | East Africa     |
| 27 Lesotho       |                 | LS    | Maseru       | Southern Africa |
| 28 Liberia       |                 | LR    | Monrovia     | West Africa     |
| 29 Libya         |                 | LY    | Tripoli      | North Africa    |
| 30 Madagascar    |                 | MG    | Antananarivo | East Africa     |
| 31 Malawi        |                 | MW    | Lilongwe     | East Africa     |
| 32 Mali          |                 | ML    | Bamako       | West Africa     |
| 33 Mauritania    |                 | MR    | Nouakchott   | West Africa     |
| 34 Mauritius     |                 | MU    | Port Louis   | East Africa     |
| 35 Morocco       |                 | MA    | Rabat        | North Africa    |
| 36 Mozambique    |                 | MZ    | Maputo       | East Africa     |
| 37 Namibia       |                 | NA    | Windhoek     | Southern Africa |
| 38 Niger         |                 | NE    | Niamey       | West Africa     |
| 39 Nigeria       |                 | NG    | Abuja        | West Africa     |
| 40 Rwanda        |                 | RW    | Kigali       | East Africa     |
| 41 São           | Tomé & Príncipe | ST    | São Tomé     | Central Africa  |
| 42 Senegal       |                 | SN    | Dakar        | West Africa     |
| 43 Seychelles    |                 | SC    | Victoria     | East Africa     |
| 44 Sierra        | Leone           | SL    | Freetown     | West Africa     |
| 45 Somalia       |                 | SO    | Mogadishu    | East Africa     |
| 46 South         | Africa          | ZA    | Pretoria     | Southern Africa |
| 47 South         | Sudan           | SS    | Juba         | East Africa     |
| 48 Sudan         |                 | SD    | Khartoum     | North Africa    |
| 49 Tanzania      |                 | TZ    | Dodoma       | East Africa     |
| 50 Togo          |                 | TG    | Lomé         | West Africa     |
| 51 Tunisia       |                 | TN    | Tunis        | North Africa    |
| 52 Uganda        |                 | UG    | Kampala      | East Africa     |
| 53 Zambia        |                 | ZM    | Lusaka       | Southern Africa |
| 54 Zimbabwe      |                 | ZW    | Harare       | Southern Africa |
| AMERICAS         | (35 states)     |       |              |                 |
| # Country        |                 | ISO-2 | Capital      | Region          |
| 55 Antigua       | & Barbuda       | AG    | St. John’s   | Caribbean       |
11

| # Country      |          |              |       | ISO-2    | Capital        |       | Region    |         |
| -------------- | -------- | ------------ | ----- | -------- | -------------- | ----- | --------- | ------- |
| 56 Argentina   |          |              |       | AR       | Buenos         | Aires | South     | America |
| 57 Bahamas     |          |              |       | BS       | Nassau         |       | Caribbean |         |
| 58 Barbados    |          |              |       | BB       | Bridgetown     |       | Caribbean |         |
| 59 Belize      |          |              |       | BZ       | Belmopan       |       | Central   | America |
| 60 Bolivia     |          |              |       | BO       | Sucre          |       | South     | America |
| 61 Brazil      |          |              |       | BR       | Brasília       |       | South     | America |
| 62 Canada      |          |              |       | CA       | Ottawa         |       | North     | America |
| 63 Chile       |          |              |       | CL       | Santiago       |       | South     | America |
| 64 Colombia    |          |              |       | CO       | Bogotá         |       | South     | America |
| 65 Costa       | Rica     |              |       | CR       | San José       |       | Central   | America |
| 66 Cuba        |          |              |       | CU       | Havana         |       | Caribbean |         |
| 67 Dominica    |          |              |       | DM       | Roseau         |       | Caribbean |         |
| 68 Dominican   |          | Republic     |       | DO       | Santo Domingo  |       | Caribbean |         |
| 69 Ecuador     |          |              |       | EC       | Quito          |       | South     | America |
| 70 El          | Salvador |              |       | SV       | San Salvador   |       | Central   | America |
| 71 Grenada     |          |              |       | GD       | St. George’s   |       | Caribbean |         |
| 72 Guatemala   |          |              |       | GT       | Guatemala      | City  | Central   | America |
| 73 Guyana      |          |              |       | GY       | Georgetown     |       | South     | America |
| 74 Haiti       |          |              |       | HT       | Port-au-Prince |       | Caribbean |         |
| 75 Honduras    |          |              |       | HN       | Tegucigalpa    |       | Central   | America |
| 76 Jamaica     |          |              |       | JM       | Kingston       |       | Caribbean |         |
| 77 Mexico      |          |              |       | MX       | Mexico         | City  | North     | America |
| 78 Nicaragua   |          |              |       | NI       | Managua        |       | Central   | America |
| 79 Panama      |          |              |       | PA       | Panama         | City  | Central   | America |
| 80 Paraguay    |          |              |       | PY       | Asunción       |       | South     | America |
| 81 Peru        |          |              |       | PE       | Lima           |       | South     | America |
| 82 Saint       | Kitts    | & Nevis      |       | KN       | Basseterre     |       | Caribbean |         |
| 83 Saint       | Lucia    |              |       | LC       | Castries       |       | Caribbean |         |
| 84 Saint       | Vincent  | & Grenadines |       | VC       | Kingstown      |       | Caribbean |         |
| 85 Suriname    |          |              |       | SR       | Paramaribo     |       | South     | America |
| 86 Trinidad    | &        | Tobago       |       | TT       | Port of        | Spain | Caribbean |         |
| 87 United      | States   |              |       | US       | Washington     | D.C.  | North     | America |
| 88 Uruguay     |          |              |       | UY       | Montevideo     |       | South     | America |
| 89 Venezuela   |          |              |       | VE       | Caracas        |       | South     | America |
| ASIA-PACIFIC   |          | (48 states)  |       |          |                |       |           |         |
| # Country      |          |              | ISO-2 | Capital  |                |       | Region    |         |
| 90 Afghanistan |          |              | AF    | Kabul    |                |       | South     | Asia    |
| 91 Australia   |          |              | AU    | Canberra |                |       | Oceania   |         |
| 92 Azerbaijan  |          |              | AZ    | Baku     |                |       | Central   | Asia    |
| 93 Bahrain     |          |              | BH    | Manama   |                |       | Middle    | East    |
12

| # Country       |            | ISO-2 | Capital             | Region      |      |
| --------------- | ---------- | ----- | ------------------- | ----------- | ---- |
| 94 Bangladesh   |            | BD    | Dhaka               | South       | Asia |
| 95 Bhutan       |            | BT    | Thimphu             | South       | Asia |
| 96 Brunei       |            | BN    | Bandar Seri Begawan | Southeast   | Asia |
| 97 Cambodia     |            | KH    | Phnom Penh          | Southeast   | Asia |
| 98 China        |            | CN    | Beijing             | East        | Asia |
| 99 Fiji         |            | FJ    | Suva                | Oceania     |      |
| 100 India       |            | IN    | New Delhi           | South       | Asia |
| 101 Indonesia   |            | ID    | Jakarta             | Southeast   | Asia |
| 102 Iran        |            | IR    | Tehran              | Middle      | East |
| 103 Iraq        |            | IQ    | Baghdad             | Middle      | East |
| 104 Israel      |            | IL    | Jerusalem           | Middle      | East |
| 105 Japan       |            | JP    | Tokyo               | East        | Asia |
| 106 Jordan      |            | JO    | Amman               | Middle      | East |
| 107 Kazakhstan  |            | KZ    | Astana              | Central     | Asia |
| 108 Kiribati    |            | KI    | South Tarawa        | Oceania     |      |
| 109 Kuwait      |            | KW    | Kuwait City         | Middle      | East |
| 110 Kyrgyzstan  |            | KG    | Bishkek             | Central     | Asia |
| 111 Laos        |            | LA    | Vientiane           | Southeast   | Asia |
| 112 Lebanon     |            | LB    | Beirut              | Middle      | East |
| 113 Malaysia    |            | MY    | Kuala Lumpur        | Southeast   | Asia |
| 114 Maldives    |            | MV    | Malé                | South       | Asia |
| 115 Marshall    | Islands    | MH    | Majuro              | Oceania     |      |
| 116 Micronesia  |            | FM    | Palikir             | Oceania     |      |
| 117 Mongolia    |            | MN    | Ulaanbaatar         | East        | Asia |
| 118 Myanmar     |            | MM    | Naypyidaw           | Southeast   | Asia |
| 119 Nauru       |            | NR    | Yaren               | Oceania     |      |
| 120 Nepal       |            | NP    | Kathmandu           | South       | Asia |
| 121 New         | Zealand    | NZ    | Wellington          | Oceania     |      |
| 122 North       | Korea      | KP    | Pyongyang           | East        | Asia |
| 123 Oman        |            | OM    | Muscat              | Middle      | East |
| 124 Pakistan    |            | PK    | Islamabad           | South       | Asia |
| 125 Palau       |            | PW    | Ngerulmud           | Oceania     |      |
| 126 Papua       | New Guinea | PG    | Port Moresby        | Oceania     |      |
| 127 Philippines |            | PH    | Manila              | Southeast   | Asia |
| 128 Qatar       |            | QA    | Doha                | Middle      | East |
| 129 Samoa       |            | WS    | Apia                | Oceania     |      |
| 130 Saudi       | Arabia     | SA    | Riyadh              | Middle      | East |
| 131 Singapore   |            | SG    | Singapore           | Southeast   | Asia |
| 132 Solomon     | Islands    | SB    | Honiara             | Oceania     |      |
| 133 South       | Korea      | KR    | Seoul               | East        | Asia |
| 134 Sri         | Lanka      | LK    | Sri Jayawardenepura | Kotte South | Asia |
| 135 Syria       |            | SY    | Damascus            | Middle      | East |
| 136 Taiwan      |            | TW    | Taipei              | East        | Asia |
| 137 Tajikistan  |            | TJ    | Dushanbe            | Central     | Asia |
13

| # Country         |               | ISO-2 Capital |            |                  | Region         |
| ----------------- | ------------- | ------------- | ---------- | ---------------- | -------------- |
| 138 Thailand      |               | TH Bangkok    |            |                  | Southeast Asia |
| 139 Timor-Leste   |               | TL Dili       |            |                  | Southeast Asia |
| 140 Tonga         |               | TO Nuku’alofa |            |                  | Oceania        |
| 141 Turkmenistan  |               | TM Ashgabat   |            |                  | Central Asia   |
| 142 Tuvalu        |               | TV Funafuti   |            |                  | Oceania        |
| 143 UAE           |               | AE Abu        | Dhabi      |                  | Middle East    |
| 144 Uzbekistan    |               | UZ Tashkent   |            |                  | Central Asia   |
| 145 Vanuatu       |               | VU Port       | Vila       |                  | Oceania        |
| 146 Vietnam       |               | VN Hanoi      |            |                  | Southeast Asia |
| 147 Yemen         |               | YE Sana’a     |            |                  | Middle East    |
| EUROPE            | (44 states)   |               |            |                  |                |
| # Country         |               | ISO-2         | Capital    | Region           |                |
| 148 Albania       |               | AL            | Tirana     | Balkans          |                |
| 149 Andorra       |               | AD            | Andorra    | la Vella Western | Europe         |
| 150 Armenia       |               | AM            | Yerevan    | Caucasus         |                |
| 151 Austria       |               | AT            | Vienna     | Central          | Europe         |
| 152 Belarus       |               | BY            | Minsk      | Eastern          | Europe         |
| 153 Belgium       |               | BE            | Brussels   | Western          | Europe         |
| 154 Bosnia        | & Herzegovina | BA            | Sarajevo   | Balkans          |                |
| 155 Bulgaria      |               | BG            | Sofia      | Balkans          |                |
| 156 Croatia       |               | HR            | Zagreb     | Balkans          |                |
| 157 Cyprus        |               | CY            | Nicosia    | Mediterranean    |                |
| 158 Czech         | Republic      | CZ            | Prague     | Central          | Europe         |
| 159 Denmark       |               | DK            | Copenhagen | Northern         | Europe         |
| 160 Estonia       |               | EE            | Tallinn    | Northern         | Europe         |
| 161 Finland       |               | FI            | Helsinki   | Northern         | Europe         |
| 162 France        |               | FR            | Paris      | Western          | Europe         |
| 163 Georgia       |               | GE            | Tbilisi    | Caucasus         |                |
| 164 Germany       |               | DE            | Berlin     | Central          | Europe         |
| 165 Greece        |               | GR            | Athens     | Mediterranean    |                |
| 166 Hungary       |               | HU            | Budapest   | Central          | Europe         |
| 167 Iceland       |               | IS            | Reykjavik  | Northern         | Europe         |
| 168 Ireland       |               | IE            | Dublin     | Western          | Europe         |
| 169 Italy         |               | IT            | Rome       | Mediterranean    |                |
| 170 Kosovo        |               | XK            | Pristina   | Balkans          |                |
| 171 Latvia        |               | LV            | Riga       | Northern         | Europe         |
| 172 Liechtenstein |               | LI            | Vaduz      | Central          | Europe         |
| 173 Lithuania     |               | LT            | Vilnius    | Northern         | Europe         |
| 174 Luxembourg    |               | LU            | Luxembourg | City Western     | Europe         |
| 175 Malta         |               | MT            | Valletta   | Mediterranean    |                |
14

| # Country       |                  | ISO-2         | Capital    | Region             |     |
| --------------- | ---------------- | ------------- | ---------- | ------------------ | --- |
| 176 Moldova     |                  | MD            | Chișinău   | Eastern Europe     |     |
| 177 Monaco      |                  | MC            | Monaco     | Western Europe     |     |
| 178 Montenegro  |                  | ME            | Podgorica  | Balkans            |     |
| 179 Netherlands |                  | NL            | Amsterdam  | Western Europe     |     |
| 180 North       | Macedonia        | MK            | Skopje     | Balkans            |     |
| 181 Norway      |                  | NO            | Oslo       | Northern Europe    |     |
| 182 Poland      |                  | PL            | Warsaw     | Central Europe     |     |
| 183 Portugal    |                  | PT            | Lisbon     | Western Europe     |     |
| 184 Romania     |                  | RO            | Bucharest  | Eastern Europe     |     |
| 185 Russia      |                  | RU            | Moscow     | Eastern Europe     |     |
| 186 San         | Marino           | SM            | San Marino | Mediterranean      |     |
| 187 Serbia      |                  | RS            | Belgrade   | Balkans            |     |
| 188 Slovakia    |                  | SK            | Bratislava | Central Europe     |     |
| 189 Slovenia    |                  | SI            | Ljubljana  | Balkans            |     |
| 190 Spain       |                  | ES            | Madrid     | Western Europe     |     |
| 191 Sweden      |                  | SE            | Stockholm  | Northern Europe    |     |
| 192 Switzerland |                  | CH            | Bern       | Central Europe     |     |
| 193 Turkey      |                  | TR            | Ankara     | Transcontinental   |     |
| 194 Ukraine     |                  | UA            | Kyiv       | Eastern Europe     |     |
| 195 United      | Kingdom          | GB            | London     | Western Europe     |     |
| 196 Vatican     | City             | VA            | Vatican    | Mediterranean      |     |
| DISPUTED        | / CONTESTED      | (key entities | to model)  |                    |     |
| Entity          | Status           |               | Capital    | Notes              |     |
| Palestine       | UN Observer      |               | Ramallah   | Model West         |     |
|                 | State            |               |            | Bank + Gaza        | as  |
|                 |                  |               |            | occupied districts |     |
| Western Sahara  | Contested        | (Mo-          | El Aaiún   | Model as           |     |
|                 | rocco/Polisario) |               |            | occupied +         |     |
separatist_flag
| Somaliland | De facto | state | Hargeisa | Unrecognized | —   |
| ---------- | -------- | ----- | -------- | ------------ | --- |
model as
autonomous
region
| Transnistria | De facto | state | Tiraspol | Unrecognized | —   |
| ------------ | -------- | ----- | -------- | ------------ | --- |
in Moldova
border
| Abkhazia | Contested |     | Sukhumi |     |     |
| -------- | --------- | --- | ------- | --- | --- |
(Georgia/Russia)
| South Ossetia | Contested |     | Tskhinvali |     |     |
| ------------- | --------- | --- | ---------- | --- | --- |
(Georgia/Russia)
15

| Entity   |     | Status          |        | Capital |     |     | Notes     |     |         |
| -------- | --- | --------------- | ------ | ------- | --- | --- | --------- | --- | ------- |
| Nagorno- |     | Contested       | (Arme- | —       |     |     | Post-2023 |     | status: |
| Karabakh |     | nia/Azerbaijan) |        |         |     |     | under     |     |         |
Azerbaijani
control
| Northern    | Cyprus | Recognized  | only   | North       | Nicosia |       |               |      |         |
| ----------- | ------ | ----------- | ------ | ----------- | ------- | ----- | ------------- | ---- | ------- |
|             |        | by Turkey   |        |             |         |       |               |      |         |
| Taiwan      |        | De facto    |        | Taipei      |         |       | UN            | seat | held by |
|             |        | independent |        |             |         |       | PRC           |      |         |
| Kosovo      |        | Partially   |        | Pristina    |         |       | ~100          | UN   |         |
|             |        | recognized  |        |             |         |       | recognitions  |      |         |
| Sahrawi     | Arab   | Recognized  | by     | Tifariti    |         |       |               |      |         |
| DR          |        | AU, ~50     | states |             |         |       |               |      |         |
| PART        | 7 —    | Data Format |        | & Ingestion |         | Notes |               |      |         |
| 7.1 GeoJSON |        | Feature     | Schema | (Minimum    | Fields  |       | per District) |      |         |
{
| "type":         | "Feature",      |               |     |     |     |     |     |     |     |
| --------------- | --------------- | ------------- | --- | --- | --- | --- | --- | --- | --- |
| "properties":   |                 | {             |     |     |     |     |     |     |     |
| "id":           | "PK_PAK.3.2_1", |               |     |     |     |     |     |     |     |
| "name":         | "Lahore",       |               |     |     |     |     |     |     |     |
| "name_local":   |                 | "￿￿￿￿￿",      |     |     |     |     |     |     |     |
| "nation_id":    |                 | "PK",         |     |     |     |     |     |     |     |
| "province_id":  |                 | "PK_PAK.3_1", |     |     |     |     |     |     |     |
| "admin_level":  |                 | 2,            |     |     |     |     |     |     |     |
| "capital":      |                 | false,        |     |     |     |     |     |     |     |
| "area_km2":     |                 | 1772,         |     |     |     |     |     |     |     |
| "centroid_lat": |                 | 31.558,       |     |     |     |     |     |     |     |
| "centroid_lng": |                 | 74.357        |     |     |     |     |     |     |     |
},
| "geometry":    |            | {   |        |     |     |     |     |     |     |
| -------------- | ---------- | --- | ------ | --- | --- | --- | --- | --- | --- |
| "type":        | "Polygon", |     |        |     |     |     |     |     |     |
| "coordinates": |            | [[  | ... ]] |     |     |     |     |     |     |
}
}
| 7.2 Recommended |                | Data          | Build    | Order       |         |              |     |           |          |
| --------------- | -------------- | ------------- | -------- | ----------- | ------- | ------------ | --- | --------- | -------- |
| 1. Download     |                | Natural Earth | Admin    | 0/1         | → seed  | nations.json |     | (T4       | Nations, |
| T3              | Regions)       |               |          |             |         |              |     |           |          |
| 2. Download     |                | GADM Level    | 2 global | →           | primary | T1 District  |     | mesh      |          |
| 3. Run          | simplification | pipeline      |          | (mapshaper, | 5%      | for MVP,     | 1%  | for Phase | 5)       |
16

| 4. Overlay | SRTM | elevation |      | → derive | terrain | tags         |          |         |
| ---------- | ---- | --------- | ---- | -------- | ------- | ------------ | -------- | ------- |
| 5. Overlay |      | ESA CCI   | land | cover →  | refine  | terrain tags | (JUNGLE, | DESERT, |
SWAMP)
| 6. Overlay | OurAirports    |      | →      | seed airfield_tier |                     |     |             |     |
| ---------- | -------------- | ---- | ------ | ------------------ | ------------------- | --- | ----------- | --- |
| 7. Overlay | World          | Port | Index  | → seed             | port_tier           |     |             |     |
| 8. Overlay | OpenRailwayMap |      |        | →                  | seed infrastructure |     | (rail tier) |     |
| 9. Overlay | WorldPop       |      | → seed | total_pop          |                     |     |             |     |
10. Validate all district boundaries: check for gaps, overlaps, invalid geome-
tries
| 11. Export | to             | InstancedMesh-ready |        |     | flat JSON | for Three.js |     |     |
| ---------- | -------------- | ------------------- | ------ | --- | --------- | ------------ | --- | --- |
| 7.3 MVP    | Simplification |                     | (Phase |     | 1)        |              |     |     |
ForthePhase1MVP(500-nodetest),select5nationsandextracttheirGADM
| Level 1 (province) |         | boundaries |          | only:     |     |     |     |     |
| ------------------ | ------- | ---------- | -------- | --------- | --- | --- | --- | --- |
| # Example:         | extract |            | Pakistan | provinces |     |     |     |     |
ogr2ogr -where "GID_0 = 'PAK'" pakistan.geojson gadm_level1_world.geojson
This gives you a fast-loading, correctly structured test dataset before scaling to
| the full 80,000-node |     | globe. |     |     |     |     |     |     |
| -------------------- | --- | ------ | --- | --- | --- | --- | --- | --- |
DocumentmaintainedalongsideTDDv1.0. UpdatedatasourceURLsasprojects
| evolve — | all listed | sources | are | active | as of 2025. |     |     |     |
| -------- | ---------- | ------- | --- | ------ | ----------- | --- | --- | --- |
17