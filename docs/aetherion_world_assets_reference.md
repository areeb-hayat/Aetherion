| AETHERION |           |     | — World    | Assets |              | Reference |         |     |
| --------- | --------- | --- | ---------- | ------ | ------------ | --------- | ------- | --- |
| Natural   | Resources |     | · Military |        | Capabilities | ·         | Defense | In- |
dustries
| Document  | Type: | Game | Data Reference  |     | · Version | 1.0    |     |     |
| --------- | ----- | ---- | --------------- | --- | --------- | ------ | --- | --- |
| Companion | to    | TDD  | v1.0 — Chapters |     | 11, 12,   | 13, 16 |     |     |
Overview
This document catalogs the real-world data sources and baseline values
needed to populate: - nations.json — military, economic, nuclear status
- hardware.json — all modeled aircraft, armor, naval, missile systems -
District-level RGO (Resource-Generating Operations) seeding - AI archetype
| and utility | weight | initialization |     |     |     |     |     |     |
| ----------- | ------ | -------------- | --- | --- | --- | --- | --- | --- |
Data is organized into five sections: Natural Resources, Defense Industries,
Army/Ground Forces, Air Forces, and Naval Forces. Nuclear and missile ca-
pabilities follow. For each domain, both data sources (where to get current
| figures)     | and representative |         | values    | (for seeding | game   | start) are | provided. |     |
| ------------ | ------------------ | ------- | --------- | ------------ | ------ | ---------- | --------- | --- |
| PART         | 1 —                | Natural | Resources | &            | RGO    | System     |           |     |
| 1.1 Resource | Categories         |         | for the   | RGO          | System |            |           |     |
Each district can have one or more RGOs. RGO type determines which com-
modities that district produces and feeds into the market.worker commodity
table (~200 commodities). Below are the primary resource categories and key
| real-world   | deposits. |          |        |          |          |            |          |     |
| ------------ | --------- | -------- | ------ | -------- | -------- | ---------- | -------- | --- |
| 1.2 Energy   | Resources |          |        |          |          |            |          |     |
| Petroleum    | & Natural |          | Gas    |          |          |            |          |     |
|              |           | Proven   | Oil    | Key      | Fields   | / RGO      | District |     |
| Country      |           | Reserves | (Gbbl) | Regions  |          | Tags       |          |     |
| Venezuela    |           | ~303     |        | Orinoco  | Belt     | PETROLEUM, |          |     |
|              |           |          |        | (Bolivar | State)   | HEAVY_OIL  |          |     |
| Saudi Arabia |           | ~267     |        | Ghawar,  | Safaniya | PETROLEUM  |          |     |
(Eastern
Province)
1

|         | Proven   | Oil Key Fields | / RGO      | District |
| ------- | -------- | -------------- | ---------- | -------- |
| Country | Reserves | (Gbbl) Regions | Tags       |          |
| Iran    | ~210     | Ahvaz,         | PETROLEUM, |          |
Khuzestan, NATU-
South Pars RAL_GAS
| Iraq | ~145 | Rumaila, | Kirkuk, PETROLEUM |     |
| ---- | ---- | -------- | ----------------- | --- |
Basra
| Kuwait | ~102 | Greater     | Burgan PETROLEUM |     |
| ------ | ---- | ----------- | ---------------- | --- |
|        |      | (Al Ahmadi) |                  |     |
| UAE    | ~98  | Abu Dhabi   | — PETROLEUM      |     |
ADCO/ADMA
concessions
| Russia | ~80 | West Siberia, | PETROLEUM, |     |
| ------ | --- | ------------- | ---------- | --- |
|        |     | Volga-Ural,   | NATU-      |     |
Sakhalin RAL_GAS
| Libya      | ~48 | Sirte Basin     | PETROLEUM    |     |
| ---------- | --- | --------------- | ------------ | --- |
| Nigeria    | ~37 | Niger Delta     | PETROLEUM    |     |
| Kazakhstan | ~30 | Tengiz,Kashagan | PETROLEUM    |     |
|            |     | (Atyrau         | Oblast)      |     |
| Qatar      | ~25 | North Field     | NATURAL_GAS, |     |
|            |     | (world’s        | largest LNG  |     |
gas field)
| United States | ~44 | Permian    | Basin PETROLEUM, |     |
| ------------- | --- | ---------- | ---------------- | --- |
|               |     | (TX), Gulf | of SHALE_OIL     |     |
Mexico, Bakken
(ND)
| Canada | ~170 (oil | sands) Athabasca | OIL_SANDS |     |
| ------ | --------- | ---------------- | --------- | --- |
(Alberta)
| Brazil | ~13 | Pre-salt | Santos PETROLEUM |     |
| ------ | --- | -------- | ---------------- | --- |
Basin (offshore)
| Norway  | ~8  | North Sea       | PETROLEUM  |     |
| ------- | --- | --------------- | ---------- | --- |
|         |     | (Johan          | Sverdrup)  |     |
| Algeria | ~12 | Hassi Messaoud, | PETROLEUM, |     |
Hassi R’Mel NATU-
RAL_GAS
| Mexico | ~7  | Cantarell, | PETROLEUM |     |
| ------ | --- | ---------- | --------- | --- |
Ku-Maloob-Zaap
(Campeche)
| Angola | ~8  | Cabinda, | PETROLEUM |     |
| ------ | --- | -------- | --------- | --- |
Deep-water
blocks
| Natural Gas | Giants (BCM | reserves): |     |     |
| ----------- | ----------- | ---------- | --- | --- |
2

| Country       | Reserves (TCM) | Key Regions  |                  |             |
| ------------- | -------------- | ------------ | ---------------- | ----------- |
| Russia        | ~38            | Yamal,       | Urengoy, Kovykta |             |
| Iran          | ~34            | South Pars   | (shared with     | Qatar)      |
| Qatar         | ~25            | North Field  |                  |             |
| Turkmenistan  | ~19            | Galkynysh    | (Mary Province)  |             |
| United States | ~12            | Appalachian, | Permian,         | Haynesville |
| China         | ~8             | Sichuan,     | Tarim, Ordos     |             |
| Venezuela     | ~6             | Deltana      | Platform         |             |
Datasource: USEnergyInformationAdministration(EIA)—eia.gov/international;
BP Statistical Review of World Energy (annual, free PDF); OPEC Annual
| Statistical Bulletin | (free download) |     |     |     |
| -------------------- | --------------- | --- | --- | --- |
Coal
| Country       | Reserves (Mt) | Rank            |     | Key Regions    |
| ------------- | ------------- | --------------- | --- | -------------- |
| United States | ~253,000      | Bituminous/Sub- |     | Wyoming (PRB), |
|               |               | bit             |     | West Virginia, |
Kentucky
| Russia | ~162,000 | All ranks |     | Kuznetsk, |
| ------ | -------- | --------- | --- | --------- |
Tungus, Lena
basins
| Australia | ~150,000 | Bituminous |     | Bowen Basin |
| --------- | -------- | ---------- | --- | ----------- |
(Queensland),
Hunter Valley
(NSW)
| China | ~141,000 | All ranks |     | Shanxi, Inner |
| ----- | -------- | --------- | --- | ------------- |
Mongolia,
Xinjiang
| India | ~111,000 | Bituminous |     | Jharkhand, |
| ----- | -------- | ---------- | --- | ---------- |
Odisha,
Chhattisgarh
| Germany | ~35,900 | Lignite |     | Rhineland, |
| ------- | ------- | ------- | --- | ---------- |
Lusatia, Central
Germany
| Ukraine | ~34,000 | Bituminous |     | Donbas |
| ------- | ------- | ---------- | --- | ------ |
(Donetsk/Luhansk)
| Kazakhstan | ~25,600 | Bituminous |     | Karaganda, |
| ---------- | ------- | ---------- | --- | ---------- |
Ekibastuz
| Indonesia | ~38,000 | Sub-bituminous |     | South |
| --------- | ------- | -------------- | --- | ----- |
Kalimantan, East
Kalimantan
3

| Country      | Reserves | (Mt) |     | Rank       |     | Key Regions    |
| ------------ | -------- | ---- | --- | ---------- | --- | -------------- |
| Poland       | ~26,500  |      |     | Bituminous |     | Silesian Basin |
| South Africa | ~9,900   |      |     | Bituminous |     | Mpumalanga,    |
Limpopo
Data source: World Energy Council World Energy Resources (free report);
| BGR Reserves | and Resources | (German | Federal |     | Institute | for Geosciences) |
| ------------ | ------------- | ------- | ------- | --- | --------- | ---------------- |
Uranium
| Country      | Reserves | (kt U) | Key Mines     | /         | Regions      |                       |
| ------------ | -------- | ------ | ------------- | --------- | ------------ | --------------------- |
| Kazakhstan   | ~820     |        | Chu-Sarysu,   |           | Syrdarya     | (in-situ leach)       |
| Australia    | ~1,720   |        | Olympic       | Dam       | (SA),        | Ranger (NT)           |
| Canada       | ~800     |        | Athabasca     | Basin     | (Cigar       | Lake, McArthur River) |
| Russia       | ~490     |        | Streltsov     | cluster   | (Zabaykalsky | Krai)                 |
| Namibia      | ~470     |        | Rössing,      | Husab     | mines        |                       |
| Niger        | ~280     |        | Arlit, Aïr    | Mountains |              |                       |
| Uzbekistan   | ~130     |        | Navoi Mining  |           |              |                       |
| South Africa | ~320     |        | Witwatersrand |           | (by-product  | of gold)              |
| China        | ~290     |        | Xinjiang,     | Inner     | Mongolia     |                       |
| Mongolia     | ~140     |        | Dornod,       | Gobi      |              |                       |
Data source: World Nuclear Association — Country Profiles; IAEA PRIS
| database (nuclear | power);    | Ux Consulting |     | (uranium | market) |     |
| ----------------- | ---------- | ------------- | --- | -------- | ------- | --- |
| 1.3 Metals        | & Minerals |               |     |          |         |     |
Iron Ore
| Country      | Reserves | (Mt) | Key       | Districts     |            |            |
| ------------ | -------- | ---- | --------- | ------------- | ---------- | ---------- |
| Australia    | ~52,000  |      | Pilbara   | (WA)          | — Newman,  | Paraburdoo |
| Brazil       | ~34,000  |      | Minas     | Gerais        | — Carajás, | Itabira    |
| Russia       | ~25,000  |      | Kursk     | Magnetic      | Anomaly,   | Kola       |
| China        | ~21,000  |      | Liaoning, | Hebei,        | Sichuan    |            |
| India        | ~8,100   |      | Odisha,   | Chhattisgarh, |            | Goa        |
| Ukraine      | ~6,500   |      | Kryvyi    | Rih           | (Krivoy    | Rog)       |
| Canada       | ~6,300   |      | Labrador  | Trough        |            |            |
| Sweden       | ~5,000   |      | Kiruna    | (LKAB)        |            |            |
| South Africa | ~1,000   |      | Northern  | Cape          |            |            |
4

| Country       | Reserves | (Mt) | Key Districts |       |         |          |     |
| ------------- | -------- | ---- | ------------- | ----- | ------- | -------- | --- |
| United States | ~3,500   |      | Minnesota     | (Iron | Range), | Michigan |     |
Copper
| Country       | Reserves (Mt)  | Key        | Districts   |            |             |              |               |
| ------------- | -------------- | ---------- | ----------- | ---------- | ----------- | ------------ | ------------- |
| Chile         | ~200           | Atacama    | (Escondida, |            | Collahuasi, |              | Chuquicamata) |
| Peru          | ~88            | Southern   | Andes       | (Antamina, |             | Las          | Bambas)       |
| Australia     | ~97            | Olympic    | Dam         | (SA),      | Mount       | Isa          | (QLD)         |
| Russia        | ~61            | Norilsk    | (Siberia)   |            |             |              |               |
| Mexico        | ~46            | Sonora     | (Cananea,   |            | La Caridad) |              |               |
| DRC           | ~25            | Copperbelt |             | (Katanga)  |             |              |               |
| Zambia        | ~20            | Zambian    | Copperbelt  |            |             |              |               |
| Indonesia     | ~25            | Grasberg   | (Papua)     |            |             |              |               |
| United States | ~48            | Arizona    | (Bingham    |            | Canyon,     | Morenci)     |               |
| Kazakhstan    | ~20            | Zhezkazgan |             |            |             |              |               |
| Rare Earth    | Elements (REE) |            |             |            |             |              |               |
|               | Reserves       | (Mt        |             |            |             | Strategic    |               |
| Country       | REO)           |            | Key         | Districts  |             | Significance |               |
| China         | ~44            |            | Bayan       | Obo        |             | ~70%         | of world      |
|               |                |            | (Inner      | Mongolia), |             | production   |               |
|               |                |            | Southern    | heavy      |             |              |               |
REE
| Vietnam | ~22 |     | Lai   | Châu,      | Lào | Second      | largest |
| ------- | --- | --- | ----- | ---------- | --- | ----------- | ------- |
|         |     |     | Cai   |            |     | reserves    |         |
| Brazil  | ~21 |     | Minas | Gerais,    |     | Large       | but     |
|         |     |     | Bahia |            |     | undeveloped |         |
| Russia  | ~21 |     | Kola  | Peninsula, |     |             |         |
Siberia
| India | ~6.9 |     | Kerala, | Tamil  |     |     |     |
| ----- | ---- | --- | ------- | ------ | --- | --- | --- |
|       |      |     | Nadu    | (beach |     |     |     |
sands)
| Australia | ~4.2 |     | Mount | Weld    |     |     |     |
| --------- | ---- | --- | ----- | ------- | --- | --- | --- |
|           |      |     | (WA), | Olympic |     |     |     |
Dam
| United States | ~1.8 |     | Mountain   |     | Pass | Ramping     | up  |
| ------------- | ---- | --- | ---------- | --- | ---- | ----------- | --- |
|               |      |     | (CA)       |     |      | production  |     |
| Greenland     | ~1.5 |     | Kvanefjeld |     |      | Politically |     |
contested
| Myanmar | ~0.5 |     | Kayah | State |     |     |     |
| ------- | ---- | --- | ----- | ----- | --- | --- | --- |
5

|          | Reserves | (Mt |     |          |           |     | Strategic    |
| -------- | -------- | --- | --- | -------- | --------- | --- | ------------ |
| Country  | REO)     |     |     | Key      | Districts |     | Significance |
| Tanzania | ~0.9     |     |     | Ngualla, | Mrima     |     |              |
Hill
In-game mechanics: REE deposits are strategic RGOs that feed Hi-Tech
factorytier. NationscontrollingREEdepositsgaintechnologyresearchbonuses
| (+R&D output).    | REE trade | embargoes |              | trigger   | HIGH-severity |           | events.     |
| ----------------- | --------- | --------- | ------------ | --------- | ------------- | --------- | ----------- |
| Lithium (Electric | Age       | Resource) |              |           |               |           |             |
| Country           | Reserves  | (Mt)      | Key          | Districts |               |           |             |
| Chile             | ~11       |           | Atacama      |           | Salt Flat     | (Salar    | de Atacama) |
| Australia         | ~7.9      |           | Pilgangoora, |           | Greenbushes   |           | (WA)        |
| Argentina         | ~3.6      |           | Salta,       | Jujuy,    | Catamarca     |           | provinces   |
| China             | ~5.1      |           | Qinghai,     |           | Tibet (Salar  |           | de Tso)     |
| United States     | ~1.0      |           | Silver       | Peak      | (NV),         | Salton    | Sea (CA)    |
| Canada            | ~0.9      |           | Quebec,      |           | Ontario       |           |             |
| Germany           | ~3.0      |           | Electoral    |           | Palatinate    | (recently | discovered) |
| Brazil            | ~0.7      |           | Minas        | Gerais    |               |           |             |
| Zimbabwe          | ~0.5      |           | Bikita,      |           | Arcadia       |           |             |
| Portugal          | ~0.06     |           | Barroso      |           | (developing)  |           |             |
Gold
| Country       | Reserves | (t) | Key           | Districts |                |              |            |
| ------------- | -------- | --- | ------------- | --------- | -------------- | ------------ | ---------- |
| Australia     | ~10,000  |     | Super         | Pit       | (Kalgoorlie    | WA),         | Boddington |
| Russia        | ~7,500   |     | Krasnoyarsk,  |           | Magadan,       |              | Chukotka   |
| South Africa  | ~5,000   |     | Witwatersrand |           | Basin          | (historical) |            |
| United States | ~3,000   |     | Nevada        |           | (Carlin Trend, |              | Cortez)    |
| Indonesia     | ~2,600   |     | Grasberg      |           | (Papua)        |              |            |
| China         | ~2,000   |     | Shandong,     |           | Fujian         |              |            |
| Ghana         | ~1,000   |     | Ashanti       |           | Belt (Obuasi)  |              |            |
| Canada        | ~2,200   |     | Ontario,      |           | British        | Columbia,    | Nunavut    |
| Peru          | ~2,700   |     | Yanacocha,    |           | Lagunas        | Norte        |            |
| Brazil        | ~2,400   |     | Pará          | (Serra    | Pelada         | legacy),     | Goiás      |
Data source: USGS Mineral Resources Program (minerals.usgs.gov) — free
annual Mineral Commodity Summaries; BGS World Mineral Statistics; Global
Mining Finance
6

| 1.4 Agricultural | Resources |             |           |           |     |                        |              |         |
| ---------------- | --------- | ----------- | --------- | --------- | --- | ---------------------- | ------------ | ------- |
| Crop             |           | Top         | Producers |           |     | Key Districts          | /            | Regions |
| Wheat            |           | China,      | India,    | Russia,   |     | Punjab                 |              |         |
|                  |           | USA,        | Australia |           |     | (India/Pakistan),      |              | US      |
|                  |           |             |           |           |     | Great Plains,          | Russian      |         |
|                  |           |             |           |           |     | steppe, Murray-Darling |              |         |
| Rice             |           | China,      | India,    |           |     | Yangtze Delta,         |              | Bengal, |
|                  |           | Bangladesh, |           | Indonesia |     | Java, Mekong           | Delta        |         |
| Corn/Maize       |           | USA,        | China,    | Brazil,   |     | US Corn                | Belt         |         |
|                  |           | Argentina   |           |           |     | (Iowa/Illinois),       |              | Mato    |
|                  |           |             |           |           |     | Grosso, Pampas         |              |         |
| Soybeans         |           | Brazil,     | USA,      | Argentina |     | Mato Grosso,           |              |         |
|                  |           |             |           |           |     | Iowa/Indiana,          | Pampas       |         |
| Cotton           |           | China,      | India,    | USA,      |     | Xinjiang,              | Punjab,      |         |
|                  |           | Brazil      |           |           |     | Texas, São             | Paulo        |         |
| Sugar Cane       |           | Brazil,     | India,    | Thailand  |     | São Paulo,             | Maharashtra, |         |
|                  |           |             |           |           |     | Chiang Mai             |              |         |
| Coffee           |           | Brazil,     | Vietnam,  |           |     | Minas Gerais,          | Central      |         |
|                  |           | Colombia    |           |           |     | Highlands,             | Antioquia    |         |
| Palm Oil         |           | Indonesia,  |           | Malaysia  |     | Riau (Sumatra),        |              |         |
Sabah/Sarawak
| Data source:         | FAO              | FAOSTAT |             | (fao.org/faostat) |        | — free; | USDA | PSD |
| -------------------- | ---------------- | ------- | ----------- | ----------------- | ------ | ------- | ---- | --- |
| (ps&d.fas.usda.gov); | World            | Bank    | Agriculture |                   | data   |         |      |     |
| 1.5 RGO              | Type Enumeration |         | for         | District          | Schema |         |      |     |
| type RGOType         | =                |         |             |                   |        |         |      |     |
// Energy
| 'PETROLEUM' | 'NATURAL_GAS' | 'COAL' | 'URANIUM' | 'OIL_SANDS' | 'SHALE_OIL' | 'LNG'
// Metals
| 'IRON_ORE' | 'COPPER' | 'ALUMINUM' | 'NICKEL' | 'COBALT' | 'TIN' | 'LEAD' | 'ZINC'
// Strategic
| 'RARE_EARTH' | 'LITHIUM' | 'TITANIUM' | 'TUNGSTEN' | 'CHROMIUM' | 'MANGANESE'
// Precious
| | 'GOLD' | | 'SILVER' | | 'PLATINUM' |     |     | | 'DIAMONDS' |     |     |     |
| -------- | ---------- | ------------ | --- | --- | ------------ | --- | --- | --- |
// Agriculture
| 'GRAIN' | 'RICE' | 'COTTON' | 'SOYBEANS' | 'COFFEE' | 'PALM_OIL' | 'SUGAR' | 'LIVESTOCK'
| // Forestry | & Marine |            |     |     |     |     |     |     |
| ----------- | -------- | ---------- | --- | --- | --- | --- | --- | --- |
| | 'TIMBER'  | | 'FISH' | | 'RUBBER' |     |     |     |     |     |     |
// Industrial
| 'PHOSPHATE' | 'POTASH' | 'SULFUR' | 'SALT' | 'SAND_GRAVEL' | 'LIMESTONE'
7

Data source for district-level seeding: USGS MRDS (Mineral Resources
DataSystem)—mrdata.usgs.gov;SNLMetals&Miningdatabase(commercial);
| Global Forest |         | Watch (Global | Fishing    |           | Watch | for maritime |        | RGOs) |     |
| ------------- | ------- | ------------- | ---------- | --------- | ----- | ------------ | ------ | ----- | --- |
| PART          | 2 —     | Defense       | Industries |           |       |              |        |       |     |
| 2.1 Major     | Defense | Contractor    |            | Ecosystem |       | by           | Nation |       |     |
The origin_nation field in the HardwareUnit schema tracks where each plat-
form was built. Nations with domestic defense industries produce hardware
domestically and can export (unlocking EULA mechanics). Nations without
| domestic | industry | depend | entirely | on  | imports. |     |     |     |     |
| -------- | -------- | ------ | -------- | --- | -------- | --- | --- | --- | --- |
Tier 1 — Full-Spectrum Defense Industrial Base These nations can
design,manufacture,andexporthardwareacrossallcategories(aviation,armor,
naval, missiles):
| Nation |        |     | Key      | Defense   | Companies |     | Flagship        | Products |       |
| ------ | ------ | --- | -------- | --------- | --------- | --- | --------------- | -------- | ----- |
| United | States |     | Lockheed | Martin,   |           |     | F-35,           | F-22,    | B-21, |
|        |        |     | Boeing,  | Raytheon, |           |     | Abrams,         | HIMARS,  |       |
|        |        |     | Northrop | Grumman,  |           |     | Virginia-class, |          | AEGIS |
|        |        |     | General  | Dynamics, |           |     |                 |          |       |
|        |        |     | BAE      | Systems   | US,       |     |                 |          |       |
L3Harris
| Russia |     |     | Sukhoi          | (UAC),   | MiG,   |       | Su-57,            | S-400/500, | T-14,     |
| ------ | --- | --- | --------------- | -------- | ------ | ----- | ----------------- | ---------- | --------- |
|        |     |     | Almaz-Antey,    |          |        |       | Borei-class,      |            | Kalibr,   |
|        |     |     | Uralvagonzavod, |          |        | Almaz | Kinzhal           |            |           |
|        |     |     | Shipyard,       |          | Fakel  |       |                   |            |           |
| China  |     |     | AVIC,           | CASC,    | CASIC, |       | J-20,             | J-35,      | Type 055, |
|        |     |     | CSSC,           | Norinco, | CSGC   |       | DF-41,            | HQ-9,      | Type 096  |
| France |     |     | Dassault,       | Naval    | Group, |       | Rafale,           | SCALP,     |           |
|        |     |     | KNDS,           | Thales,  | MBDA,  |       | FREMM,            |            | Le        |
|        |     |     | ArianeGroup     |          |        |       | Triomphant-class, |            |           |
Exocet
| United | Kingdom |     | BAE          | Systems, |        |     | Typhoon,           |     | Astute-class, |
| ------ | ------- | --- | ------------ | -------- | ------ | --- | ------------------ | --- | ------------- |
|        |         |     | Rolls-Royce, |          | MBDA   |     | Dreadnought-class, |     |               |
|        |         |     | UK,          | Babcock, | Thales |     | Brimstone          |     |               |
UK
| Germany |     |     | KNDS               | Germany |         |     | Leopard | 2,   | PzH 2000,  |
| ------- | --- | --- | ------------------ | ------- | ------- | --- | ------- | ---- | ---------- |
|         |     |     | (Rheinmetall+KMW), |         |         |     | Type    | 212A | submarine, |
|         |     |     | Hensoldt,          |         |         |     | IRIS-T  |      |            |
|         |     |     | ThyssenKrupp       |         | Marine, |     |         |      |            |
Diehl
8

| Tier 2 — Significant | Domestic | Industry  | (Multiple |             | Sectors) |          |
| -------------------- | -------- | --------- | --------- | ----------- | -------- | -------- |
| Nation               | Key      | Companies |           | Notable     |          | Products |
| Israel               | IAI,     | Elbit     | Systems,  | Iron        | Dome,    | F-35     |
|                      | Rafael,  | TAAS      |           | components, |          | Merkava, |
Spike ATGM
| South Korea | KAI,   | Hanwha, | Hyundai | KF-21,   | K2  | Black       |
| ----------- | ------ | ------- | ------- | -------- | --- | ----------- |
|             | Rotem, | LIG     | Nex1    | Panther, |     | K9 Thunder, |
Iljin
| Japan | Mitsubishi  |       | Heavy     | F-2,       | Type | 10 MBT,    |
| ----- | ----------- | ----- | --------- | ---------- | ---- | ---------- |
|       | Industries, |       | Kawasaki, | Maya-class |      | destroyer, |
|       | IHI,        | Japan | Marine    | ATD-X      |      |            |
United
| Italy    | Leonardo, |          | Fincantieri, | M-346,       | FREMM     |              |
| -------- | --------- | -------- | ------------ | ------------ | --------- | ------------ |
|          | MBDA      | Italy,   | OTO          | (Bergamini), |           | Centauro,    |
|          | Melara    |          |              | Storm        | Shadow    |              |
| Sweden   | SAAB,     | Volvo    | Aero,        | Gripen       | E,        | Carl Gustaf, |
|          | FMV       |          |              | ARCHER       |           | artillery    |
| Spain    | Airbus    | Spain,   | Navantia,    | C-295,       | F-110     | frigate,     |
|          | Indra,    | Santa    | Bárbara      | S-80         | submarine |              |
| Turkey   | TUSAS,    | TAI,     |              | KAAN,        |           | Bayraktar    |
|          | ROKETSAN, |          | BMC,         | TB2/Akinci,  |           | Altay        |
|          | Aselsan,  | BAYKAR   |              | MBT,         | SOM       | missile      |
| India    | HAL,      | BrahMos, | DRDO,        | Tejas,       | BrahMos,  | Arjun        |
|          | Mazagon   | Dock,    | Garden       | MBT,         | INS       | Vikrant,     |
|          | Reach     |          |              | Agni-V       |           |              |
| Pakistan | PAC,      | HIT,     | POF,         | JF-17        | (with     | China),      |
|          | NESCOM,   |          | PMSA         | Al-Khalid    |           | MBT, Babur   |
cruise missile
| Brazil | Embraer  | Defense, |     | Super  | Tucano, | A-29, |
| ------ | -------- | -------- | --- | ------ | ------- | ----- |
|        | Avibras, | Engesa,  |     | ASTROS |         | MLRS  |
Helibras
| Ukraine | Ukroboronprom, |     |     | An-series, |     | Neptune   |
| ------- | -------------- | --- | --- | ---------- | --- | --------- |
|         | Antonov,       |     |     | missile,   |     | Oplot MBT |
Zorya-Mashproekt
| Netherlands | Damen,       | Fokker      | (legacy), | SIGMA        |            | frigates, naval |
| ----------- | ------------ | ----------- | --------- | ------------ | ---------- | --------------- |
|             | Thales       | Netherlands |           | electronics  |            |                 |
| Australia   | ASC,         | Austal,     | CEA       | Future       | submarines |                 |
|             | Technologies |             |           | (SSN-AUKUS), |            | Evolved         |
Cape-class
| Canada | L3 MAS,  | General      |         | River-class |     | destroyer |
| ------ | -------- | ------------ | ------- | ----------- | --- | --------- |
|        | Dynamics |              | Canada, | program     |     |           |
|        | Irving   | Shipbuilding |         |             |     |           |
9

Nation Key Companies Notable Products
Poland PGZ (Polish Krab SPH, Piorun
Armaments Group), MANPADS, Warmate
WB Electronics
Czechia Excalibur Army, T-72 upgrades, Dana
Czechoslovak Group, howitzer
EVPÚ
Singapore ST Engineering, Dsta Terrex ICV, SAR-21
rifle, frigate upgrades
Iran MODAFL/DIO, IRGC Shahed series,
Aerospace Fateh-110, Karrar
drone, Rezvan
North Korea Rodong Sinmun / Hwasong ICBM series,
Munitions Industry KN-series artillery,
Dept. Mabongryong drones
South Africa Denel (distressed), Rooivalk attack
Paramount Group helicopter, G6 Rhino
howitzer, Casspir
Argentina INVAP, TAMSE IA-63 Pampa, TAM
tank (legacy)
Tier 3 — Licensed Production / Assembly Nationsthatbuymajorplat-
forms and assemble or license-produce domestically. They gain reduced pro-
curement cost but remain dependent on origin-nation EULA:
• Egypt: assembles M1A1 Abrams, F-16 under license
• Saudi Arabia: assembles Typhoon components, building local industry
(SAMI)
• UAE: limited local production via Caracal, EDGE Group
• Indonesia: PT Dirgantara Indonesia (aircraft assembly), PT Pindad
(small arms/AFVs)
• Malaysia: DEFTECH (APC), Royal Ordnance Malaysia
• Taiwan: AIDC (F-CK-1 Ching-kuo), CSBC (submarines under indige-
nous program)
• Romania: assembles F-16, small arms via ROMTEHNICA
• Greece: HAI (aircraft MRO), Hellenic Shipyards (submarines)
Tier 4 — Import Dependent All remaining nations depend on arms im-
ports. Key importer clusters:
Cluster Major Suppliers Notes
NATO small members USA, UK, France, F-16, Eurofighter,
Germany Leopard 2 purchases
10

| Cluster       |               | Major Suppliers  |         | Notes        |                   |
| ------------- | ------------- | ---------------- | ------- | ------------ | ----------------- |
| Former        | Soviet states | Russia (legacy), | now     | MiG/Su       | legacy fleets     |
|               |               | diversifying     | to West |              |                   |
| Gulf states   |               | USA, UK,         | France  | Kuwait,      | Qatar, Bahrain    |
| (non-UAE/SA)  |               |                  |         | — premium    | buyer             |
| Sub-Saharan   | Africa        | Russia, China,   | Ukraine | Mix          | of Soviet legacy  |
|               |               |                  |         | and          | new Chinese sales |
| Southeast     | Asia          | Russia, China,   | USA,    | Vietnam:     | Su-30MK2;         |
| (non-SG/ID)   |               | France           |         | Thailand:    | Gripen;           |
|               |               |                  |         | Philippines: | F-16              |
| Latin America |               | USA, France,     | Brazil  | Chile:       | F-16; Colombia:   |
| (non-BR)      |               |                  |         | Kfir/Super   | Tucano            |
Data source for arms trade flows: SIPRI Arms Transfers Database
(sipri.org/databases/armstransfers) — free, exportable; Stockholm Inter-
national Peace Research Institute (SIPRI) Yearbook; Defense Security
| Cooperation | Agency (DSCA) | notifications | (dsca.mil) |     |     |
| ----------- | ------------- | ------------- | ---------- | --- | --- |
| PART        | 3 — Ground    | Forces        | (Army)     |     |     |
| 3.1 Main    | Battle Tank   | Registry      |            |     |     |
All tanks in the hardware.json registry. Generation maps to the TDD
| generation | field (2–6). |     |             |     |               |
| ---------- | ------------ | --- | ----------- | --- | ------------- |
|            |              |     | Operators   |     | Key Stats for |
| Model      | Origin       | Gen | (key)       |     | Game          |
| M1A2       | USA          | 5   | USA,Kuwait, |     | TUSK urban    |
| SEPv3      |              |     | Egypt,      |     | kit, Trophy   |
| Abrams     |              |     | Poland,     |     | APS, 120mm    |
|            |              |     | Taiwan      |     | L44           |
| M1A1       | USA          | 4   | Egypt,      |     | Older optics, |
| Abrams     |              |     | Morocco,    |     | no APS        |
Australia,
Iraq
| T-14   | Russia | 6   | Russia       |       | Unmanned       |
| ------ | ------ | --- | ------------ | ----- | -------------- |
| Armata |        |     | (limited     | —     | turret, Afghit |
|        |        |     | ~20          |       | APS, 125mm     |
|        |        |     | operational) |       | 2A82           |
| T-90M  | Russia | 5   | Russia,      | India | Relikt ERA,    |
| Proryv |        |     | (T-90S),     |       | SHTORA,        |
|        |        |     | Algeria      |       | 125mm          |
11

|         |        |     | Operators   | Key Stats for |
| ------- | ------ | --- | ----------- | ------------- |
| Model   | Origin | Gen | (key)       | Game          |
| T-72B3  | Russia | 4   | Russia,     | Upgraded      |
|         |        |     | Belarus,    | optics,       |
|         |        |     | former      | Kontakt-5     |
|         |        |     | Warsaw Pact | ERA           |
| T-80BVM | Russia | 4   | Russia      | GTD-1250      |
gas turbine;
fast
| Leopard | Germany | 5   | Germany, | Top NATO     |
| ------- | ------- | --- | -------- | ------------ |
| 2A7/A8  |         |     | Canada,  | standard; no |
|         |         |     | Greece,  | APS on most  |
Netherlands,
Norway,
Denmark,
Sweden,
Finland,
Poland,
Hungary
| Leopard | Germany | 4   | Chile,  |     |
| ------- | ------- | --- | ------- | --- |
| 2A4/A5  |         |     | Turkey, |     |
Spain,
Portugal,
Poland
(mixed)
| Challenger | UK  | 5   | UK  | L30A1 rifled, |
| ---------- | --- | --- | --- | ------------- |
| 3          |     |     |     | Trophy APS,   |
AJAX-
related tech
| Leclerc | France | 5   | France, UAE | Auto-loader, |
| ------- | ------ | --- | ----------- | ------------ |
| XLR     |        |     |             | GALIX,       |
Azur kit
| K2 Black | South Korea | 5   | South Korea, | Auto-loader,   |
| -------- | ----------- | --- | ------------ | -------------- |
| Panther  |             |     | Poland,      | Hunter-killer, |
|          |             |     | Norway       | hard-kill      |
APS
| Type 10 | Japan | 5   | Japan only | 44-tonne; |
| ------- | ----- | --- | ---------- | --------- |
network-
centric
| Merkava | Israel | 5   | Israel only | Trophy APS, |
| ------- | ------ | --- | ----------- | ----------- |
| Mk 4M   |        |     |             | rear troop  |
compartment
| Olifant | South Africa | 4   | South Africa | Upgraded  |
| ------- | ------------ | --- | ------------ | --------- |
| Mk2     |              |     |              | Centurion |
12

|       |          |     | Operators | Key Stats for |
| ----- | -------- | --- | --------- | ------------- |
| Model | Origin   | Gen | (key)     | Game          |
| Arjun | Mk India | 4   | India     | Heavy;        |
| 1A    |          |     |           | domestically  |
developed
| Al-Khalid | / Pakistan/China4 |     | Pakistan, | Chinese   |
| --------- | ----------------- | --- | --------- | --------- |
| VT-1A     |                   |     | Morocco,  | design,   |
|           |                   |     | Myanmar   | Pakistani |
assembly
| Type 99A | China | 5   | China | Laser dazzler, |
| -------- | ----- | --- | ----- | -------------- |
APS variant
developing
| Type 96B | China  | 4   | China,       | Lighter than |
| -------- | ------ | --- | ------------ | ------------ |
|          |        |     | export       | Type 99      |
| Altay    | Turkey | 5   | Turkey (pre- | Indigenous;  |
|          |        |     | production)  | delayed      |
engine
program
| AMX-56 | France | 4   | UAE variant |     |
| ------ | ------ | --- | ----------- | --- |
Leclerc
| T-84 Oplot | Ukraine | 5   | Ukraine, |     |
| ---------- | ------- | --- | -------- | --- |
Thailand
| PT-91  | Poland     | 4   | Poland,  | Upgraded     |
| ------ | ---------- | --- | -------- | ------------ |
| Twardy |            |     | Malaysia | T-72         |
| M60T   | Turkey/USA | 4   | Turkey,  | Upgraded     |
| Sabra  |            |     | Egypt    | M60A3        |
| Ariete | Italy      | 4   | Italy    | Domestically |
developed
| TAM | Argentina | 3   | Argentina | Aging; no |
| --- | --------- | --- | --------- | --------- |
major
upgrade
program
| OF-40 | Italy | 3   | UAE |     |
| ----- | ----- | --- | --- | --- |
(legacy)
| T-55AM | Russia | 2   | Various  | Aging; many |
| ------ | ------ | --- | -------- | ----------- |
|        |        |     | (export, | refurbished |
legacy)
| T-62M | Russia | 2   | Russia |     |
| ----- | ------ | --- | ------ | --- |
(pulled from
reserves),
Syria, Libya
Data source: IISS Military Balance (annual, commercial — but many figures
appear in free summaries); Global Firepower (free, lower accuracy — cross-
13

reference); Jane’s Armour and Artillery (subscription); SIPRI; open-source OS-
| INT via Oryx | (oryxspioenkop.com) |                |     |     |     |
| ------------ | ------------------- | -------------- | --- | --- | --- |
| 3.2 Key      | Artillery &         | Rocket Systems |     |     |     |
Range
| System | Type | Origin | Operators | (km)     | Game Gen |
| ------ | ---- | ------ | --------- | -------- | -------- |
| M270   | MLRS | USA    | USA, UK,  | 85 (M31) | / 4      |
| MLRS   |      |        | Germany,  | 300 (AT- |          |
|        |      |        | France,   | ACMS)    |          |
Italy,
Greece
| M142   | MLRS | USA    | USA,      | 85         | 5   |
| ------ | ---- | ------ | --------- | ---------- | --- |
| HIMARS |      |        | Ukraine,  | (GMLRS)    |     |
|        |      |        | Poland,   | / 300 (AT- |     |
|        |      |        | Romania,  | ACMS) /    |     |
|        |      |        | Lithuania | 499        |     |
|        |      |        | +         | (PrSM)     |     |
| BM-30  | MLRS | Russia | Russia,   | 90         | 4   |
| Smerch |      |        | Ukraine,  |            |     |
India,
Algeria,
UAE,
Peru
| TOS-1A | Thermobaric | Russia | Russia,     | 6   | 4   |
| ------ | ----------- | ------ | ----------- | --- | --- |
|        | MLRS        |        | Iraq, Azer- |     |     |
baijan,
Syria
| PHL-03 | MLRS | China | China, | 130 | 4   |
| ------ | ---- | ----- | ------ | --- | --- |
export
| ASTROS  | MLRS | Brazil | Brazil, | 300 | 4   |
| ------- | ---- | ------ | ------- | --- | --- |
| II / IV |      |        | Saudi   |     |     |
Arabia,
Malaysia,
Iraq
| PzH 2000 | SPH   | Germany | Germany, | 40          | 5   |
| -------- | ----- | ------- | -------- | ----------- | --- |
|          | 155mm |         | Italy,   | (Excalibur: |     |
|          |       |         | Nether-  | 57)         |     |
lands,
Greece,
Finland,
Ukraine
14

Range
| System  | Type  | Origin | Operators | (km)        | Game Gen |
| ------- | ----- | ------ | --------- | ----------- | -------- |
| K9      | SPH   | South  | South     | 40          | 5        |
| Thunder | 155mm | Korea  | Korea,    | (Excalibur: |          |
|         |       |        | Finland,  | 57)         |          |
India,
Norway,
Estonia,
Australia,
Poland
| Caesar | SPH   | France | France,    | 40          | 5   |
| ------ | ----- | ------ | ---------- | ----------- | --- |
|        | 155mm |        | Denmark,   | (Excalibur: |     |
|        |       |        | Lithuania, | 57)         |     |
Ukraine,
Morocco,
Thailand,
Belgium
| M109A7  | SPH   | USA | USA,       | 30          | 4   |
| ------- | ----- | --- | ---------- | ----------- | --- |
| Paladin | 155mm |     | Israel,    | (Excalibur: |     |
|         |       |     | Australia, | 40)         |     |
Saudi
Arabia
| ARCHER | SPH   | Sweden | Sweden, | 40  | 5   |
| ------ | ----- | ------ | ------- | --- | --- |
|        | 155mm |        | Norway, |     |     |
Ukraine
| Krab       | SPH   | Poland | Poland,   | 40          | 4   |
| ---------- | ----- | ------ | --------- | ----------- | --- |
|            | 155mm |        | Ukraine   |             |     |
| 2S19       | SPH   | Russia | Russia,   | 29 (guided: | 4   |
| MSTA-S     | 152mm |        | various   | 42)         |     |
| 2S35       | SPH   | Russia | Russia    | 80          | 5   |
| Koalitsiya | 152mm |        | (limited) |             |     |
| PLZ-05     | SPH   | China  | China,    | 53          | 4   |
|            | 155mm |        | Pakistan  |             |     |
| T-155      | SPH   | Turkey | Turkey,   | 40          | 4   |
| Firtina    | 155mm |        | UAE,      |             |     |
Azerbaijan
| D-30 / | Howitzer | Russia | ~50        | 15         | 2   |
| ------ | -------- | ------ | ---------- | ---------- | --- |
| M-30   | 122mm    |        | operators  |            |     |
| M777   | Towed    | USA/UK | USA, UK,   | 40 (Excal- | 4   |
|        | 155mm    |        | Australia, | ibur)      |     |
Canada,
Ukraine,
India
15

| 3.3 Anti-Tank | Missile | Systems |       |     |           |
| ------------- | ------- | ------- | ----- | --- | --------- |
| System        | Origin  | Gen     | Range |     | Operators |
| Javelin       | USA     | 4       | 4.5   | km  | USA, UK,  |
Ukraine,
Australia,
~20+
| Spike     | Israel | 4   | 8/16/25 | km  | Israel,  |
| --------- | ------ | --- | ------- | --- | -------- |
| (ER/NLOS) |        |     | (NLOS)  |     | Germany, |
Poland,
Spain,
Singapore,
~30
| MILAN | France/Germany3 |     | 3   | km  | ~40 |
| ----- | --------------- | --- | --- | --- | --- |
operators
| Kornet-EM | Russia | 4   | 10  | km  | Russia, Syria, |
| --------- | ------ | --- | --- | --- | -------------- |
Iran, various
| NLAW | UK/Sweden | 4   | 0.8 | km  | UK, Ukraine, |
| ---- | --------- | --- | --- | --- | ------------ |
Finland,
many
| Carl Gustaf | Sweden | 4   | 1   | km direct | Sweden, |
| ----------- | ------ | --- | --- | --------- | ------- |
| M4          |        |     |     |           | USA,    |
Australia,
many
| HJ-12 Red | China | 4   | 4   | km       | China,    |
| --------- | ----- | --- | --- | -------- | --------- |
| Arrow     |       |     |     |          | export    |
| Brimstone | UK    | 4   | 12  | km (air) | UK, Saudi |
Arabia,
Ukraine
| PART 4     | — Air Forces |          |     |     |     |
| ---------- | ------------ | -------- | --- | --- | --- |
| 4.1 Combat | Aircraft     | Registry |     |     |     |
Generationinthegame’shardware.jsonmapstoreal-worldfightergenerations:
| Game Gen |     | Real-World | Equivalent       | Notes       |               |
| -------- | --- | ---------- | ---------------- | ----------- | ------------- |
| 2        |     | 2nd/3rd    | gen jet fighters | MiG-21,     | F-104, Mirage |
|          |     |            |                  | III —       | legacy only   |
| 3        |     | 3rd/4th    | gen              | F-4, Mirage | F1,           |
MiG-23/25
16

| Game Gen |     | Real-World | Equivalent | Notes    |          |
| -------- | --- | ---------- | ---------- | -------- | -------- |
| 4        |     | 4th gen    |            | F-16A/B, | MiG-29A, |
Su-27, F/A-18
| 4+  |     | 4th gen | upgraded | F-16C/D,    | Su-30, Su-35, |
| --- | --- | ------- | -------- | ----------- | ------------- |
|     |     |         |          | F/A-18E/F,  | Typhoon,      |
|     |     |         |          | Rafale,     | Gripen E      |
| 5   |     | 5th gen |          | F-22, F-35, | Su-57, J-20,  |
J-35
| 6              |          | 6th gen   | (emerging) | NGAD,       | Tempest,       |
| -------------- | -------- | --------- | ---------- | ----------- | -------------- |
|                |          |           |            | FCAS,       | B-21 — not yet |
|                |          |           |            | operational | at scale       |
| 5th Generation | Fighters |           |            |             |                |
| Aircraft       | Origin   | Operators | Key Specs  | BVR         | Gen            |
| F-35A          | USA      | USA, UK,  | Stealth,   | Yes         | 5              |
| Light-         |          | Israel,   | AESA       |             |                |
| ning II        |          | Japan,    | AN/APG-    |             |                |
|                |          | South     | 81, 8g     |             |                |
|                |          | Korea,    | limit,     |             |                |
|                |          | Italy,    | 2×AIM-     |             |                |
|                |          | Nether-   | 120        |             |                |
|                |          | lands,    | internal   |             |                |
Norway,
Denmark,
Belgium,
Australia,
Canada,
Singapore,
Poland,
Finland,
Switzer-
land,
Germany
| F-35B   | USA | USA        | Short take-  | Yes | 5   |
| ------- | --- | ---------- | ------------ | --- | --- |
| (STOVL) |     | (USMC),    | off/vertical |     |     |
|         |     | UK, Italy, | land         |     |     |
Singapore,
Japan
| F-35C     | USA | USA    | Carrier    | Yes | 5   |
| --------- | --- | ------ | ---------- | --- | --- |
| (Carrier) |     | (USN), | operations |     |     |
UK (RN)
17

| Aircraft | Origin | Operators | Key Specs    | BVR | Gen |
| -------- | ------ | --------- | ------------ | --- | --- |
| F-22A    | USA    | USA only  | Supercruise, | Yes | 5   |
| Raptor   |        |           | best         |     |     |
kinematic
fighter
| Su-57 | Russia | Russia      | Supercruise | Yes | 5   |
| ----- | ------ | ----------- | ----------- | --- | --- |
| Felon |        | (~25 opera- | capable,    |     |     |
|       |        | tional, ~75 | internal    |     |     |
|       |        | total by    | bays, con-  |     |     |
|       |        | 2025)       | troversial  |     |     |
stealth
| J-20   | China | China   | WS-15    | Yes | 5   |
| ------ | ----- | ------- | -------- | --- | --- |
| Mighty |       | (PLAAF) | engines, |     |     |
| Dragon |       |         | PL-15    |     |     |
missiles,
growing
fleet
| J-35A   | China | China     | Export     | Yes | 5   |
| ------- | ----- | --------- | ---------- | --- | --- |
|         |       | (PLAAF,   | variant    |     |     |
|         |       | PLAN on   | (J-35) in  |     |     |
|         |       | Fujian    | develop-   |     |     |
|         |       | CV)       | ment       |     |     |
| KF-21   | South | South     | 4.5/5th    | Yes | 4+  |
| Boramae | Korea | Korea     | gen        |     |     |
|         |       | (entering | hybrid; no |     |     |
|         |       | service   | full       |     |     |
|         |       | ~2026+)   | internal   |     |     |
bays
initially
| KAAN | Turkey | Turkey     | Indigenous; | Yes | 4+  |
| ---- | ------ | ---------- | ----------- | --- | --- |
|      |        | (prototype | GE F110     |     |     |
|      |        | flying,    | engines     |     |     |
|      |        | IOC        | initially   |     |     |
~2028+)
| 4th Gen+ | Fighters  | (Key) |                   |         |     |
| -------- | --------- | ----- | ----------------- | ------- | --- |
| Aircraft | Origin    |       | Major Operators   | Gen     |     |
| F-16C/D  | Block USA |       | Poland, Bulgaria, | 4+      |     |
| 70/72    |           |       | Bahrain,          | Jordan, |     |
Greece, Morocco
+
18

| Aircraft     | Origin                            | Major      | Operators | Gen |
| ------------ | --------------------------------- | ---------- | --------- | --- |
| F/A-18E/F    | USA                               | USA        | (USN),    | 4+  |
| Super Hornet |                                   | Australia, | Kuwait    |     |
| Eurofighter  | UK/Germany/Italy/USpKa,inGermany, |            |           | 4+  |
| Typhoon      |                                   | Italy,     | Spain,    |     |
|              |                                   | Saudi      | Arabia,   |     |
|              |                                   | Austria,   | Qatar,    |     |
|              |                                   | Kuwait,    | Oman,     |     |
Spain
| Dassault Rafale | France | France, | Egypt,    | 4+  |
| --------------- | ------ | ------- | --------- | --- |
|                 |        | India,  | Qatar,    |     |
|                 |        | Greece, | Croatia,  |     |
|                 |        | UAE,    | Indonesia |     |
+
| Gripen E/F | Sweden | Sweden, | South    | 4+  |
| ---------- | ------ | ------- | -------- | --- |
|            |        | Africa, | Hungary, |     |
Brazil
| Su-           | Russia         | Russia,   | India,    | 4+  |
| ------------- | -------------- | --------- | --------- | --- |
| 30MKI/MKM/SM2 |                | Algeria,  | Malaysia, |     |
|               |                | Vietnam,  | China     |     |
| Su-35S        | Russia         | Russia,   | China,    | 4+  |
|               |                | Iran,     | Egypt     |     |
| MiG-35        | Russia         | Russia    | (limited) | 4+  |
| F-15EX Eagle  | II USA         | USA       | (USAF),   | 4+  |
|               |                | Saudi     | Arabia,   |     |
|               |                | Qatar,    | Singapore |     |
| F-2           | Japan          | Japan     | only      | 4+  |
| J-10C         | China          | China,    | Pakistan  | 4+  |
| JF-17 Thunder | Pakistan/China | Pakistan, |           | 4   |
| Block III     |                | Myanmar,  |           |     |
Nigeria
| Tejas Mk1A | India | India       |     | 4   |
| ---------- | ----- | ----------- | --- | --- |
| FC-31/J-35 | China | —(marketed) |     | 5   |
(export)
| Strategic   | Bombers |           |     |             |
| ----------- | ------- | --------- | --- | ----------- |
| Aircraft    | Origin  | Operators | Gen | Notes       |
| B-21 Raider | USA     | USA (IOC  | 6   | Low-        |
|             |         | 2025+)    |     | observable, |
nuclear
capable
19

| Aircraft       | Origin | Operators    | Gen | Notes        |     |
| -------------- | ------ | ------------ | --- | ------------ | --- |
| B-2 Spirit     | USA    | USA (19      | 5   | Nuclear      |     |
|                |        | operational) |     | capable      |     |
| B-52H          | USA    | USA          | 3   | 100+         |     |
| Stratofortress |        | (reforming   |     | remaining;   |     |
|                |        | with CSRL    |     | ALCM/nuclear |     |
engine)
| B-1B Lancer | USA    | USA          | 4   | Conventional |     |
| ----------- | ------ | ------------ | --- | ------------ | --- |
|             |        | (retiring)   |     | only         |     |
| Tu-160M     | Russia | Russia (~16) | 5   | Supersonic;  |     |
| Blackjack   |        |              |     | nuclear      |     |
cruise
missiles
| Tu-95MSM | Russia | Russia | 3   | Turboprop; |     |
| -------- | ------ | ------ | --- | ---------- | --- |
| Bear     |        |        |     | Kh-101     |     |
cruise missile
| Tu-22M3  | Russia | Russia | 3   | Naval strike | /   |
| -------- | ------ | ------ | --- | ------------ | --- |
| Backfire |        |        |     | conventional |     |
| H-6K/N/J | China  | China  | 3   | Cruise       |     |
missile
carrier
| H-20       | China   | China (in    | 5         | B-2 analogue; |     |
| ---------- | ------- | ------------ | --------- | ------------- | --- |
|            |         | development, |           | stealth       |     |
|            |         | ~2025+)      |           | bomber        |     |
| Key Early  | Warning | & AWACS      |           |               |     |
| Aircraft   |         | Origin       | Operators |               |     |
| E-3 Sentry |         | USA          | USA, UK,  | France,       |     |
|            |         |              | NATO,     | Saudi Arabia, |     |
Japan
| E-7A Wedgetail |       | USA/Boeing | Australia,   | UK             |     |
| -------------- | ----- | ---------- | ------------ | -------------- | --- |
|                |       |            | (replacing   | E-3), Turkey,  |     |
|                |       |            | South        | Korea          |     |
| A-50U Mainstay |       | Russia     | Russia       | (limited after |     |
|                |       |            | losses in    | Ukraine)       |     |
| KJ-500         |       | China      | China        |                |     |
| S-100B Erieye  | ER    | Sweden     | Sweden,      | Brazil,        |     |
|                |       |            | Pakistan,    | UAE,           |     |
|                |       |            | Thailand,    | Greece         |     |
| Phalcon        | (IAI) | Israel     | India (Il-76 | based)         |     |
20

| 4.2 Air Defense | Systems | (SAM/IADS) |             |          |           |
| --------------- | ------- | ---------- | ----------- | -------- | --------- |
|                 |         | Range      |             |          | Key       |
| System          | Origin  | (km)       | Alt Ceiling | Game Gen | Operators |
| S-400           | Russia  | 400        | 30 km       | 5        | Russia,   |
| Triumf          |         | (40N6)     |             |          | China,    |
India,
Turkey,
Belarus
| S-500      | Russia | 600 | 100+ km | 6   | Russia    |
| ---------- | ------ | --- | ------- | --- | --------- |
| Prometheus |        |     | (ABM)   |     | (limited, |
entering
service)
| S-         | Russia | 200 | 27 km | 4   | Russia, |
| ---------- | ------ | --- | ----- | --- | ------- |
| 300PMU2/VM |        |     |       |     | China,  |
Iran,
Algeria,
Syria,
Greece
| Patriot | USA | 50–100 | 24 km | 5   | USA,     |
| ------- | --- | ------ | ----- | --- | -------- |
| PAC-3   |     |        |       |     | Germany, |
| MSE     |     |        |       |     | Nether-  |
lands,
Japan,
South
Korea,
Saudi
Arabia,
UAE,
Israel,
Poland,
Sweden
| THAAD | USA | 200 | 150 km | 5   | USA, |
| ----- | --- | --- | ------ | --- | ---- |
UAE,
Saudi
Arabia,
Israel,
Guam
| Aegis | USA | 500+       | 1,500 km | 5   | USA,   |
| ----- | --- | ---------- | -------- | --- | ------ |
| (BMD) |     | (SM-3      |          |     | Japan, |
|       |     | Block IIA) |          |     | South  |
Korea,
Norway,
Spain,
Australia
21

|        |        | Range |             |          | Key       |
| ------ | ------ | ----- | ----------- | -------- | --------- |
| System | Origin | (km)  | Alt Ceiling | Game Gen | Operators |
| HQ-9B  | China  | 250   | 30 km       | 4        | China,    |
Uzbek-
istan,
Turkey
(con-
tested)
| Iron Dome | Israel | 70  | 10 km | 4   | Israel, |
| --------- | ------ | --- | ----- | --- | ------- |
USA
(stockpile)
| Arrow-3 | Israel/USA | 2,400    | 100+ km | 5   | Israel, |
| ------- | ---------- | -------- | ------- | --- | ------- |
|         |            | (exoatm) |         |     | Germany |
(procur-
ing)
| David’s | Israel | 300 | 15 km | 5   | Israel |
| ------- | ------ | --- | ----- | --- | ------ |
Sling
| SAMP/T | France/Italy | 120 | 25 km | 4   | France, |
| ------ | ------------ | --- | ----- | --- | ------- |
| Mamba  |              |     |       |     | Italy,  |
Ukraine
(procur-
ing)
| NASAMS | USA/Norway40 | (AIM- | 10 km | 4   | Norway, |
| ------ | ------------ | ----- | ----- | --- | ------- |
|        |              | 120C) |       |     | USA,    |
Finland,
Nether-
lands,
Spain,
Lithuania,
Ukraine +
| Barak-8 | India/Israel | 70–100 | 16 km | 4   | India,  |
| ------- | ------------ | ------ | ----- | --- | ------- |
| (MRSAM) |              |        |       |     | Israel  |
| Tor-M2  | Russia       | 16     | 10 km | 4   | Russia, |
Belarus,
Iran,
Egypt
| Pantsir- | Russia | 20  | 15 km | 4   | Russia,    |
| -------- | ------ | --- | ----- | --- | ---------- |
| S1/S2    |        |     |       |     | UAE, Iraq, |
Serbia,
Libya,
Syria
22

| PART        | 5 — Naval | Forces         |                      |         |                  |         |
| ----------- | --------- | -------------- | -------------------- | ------- | ---------------- | ------- |
| 5.1 Surface | Fleet     | — Major        | Warship              | Classes |                  |         |
| Aircraft    | Carriers  |                |                      |         |                  |         |
| Ship /      |           | Class          |                      |         |                  |         |
| Class       | Nation    | Type           | DisplacemenAtircraft |         | ComplemenSttatus |         |
| Gerald      | USA       | CATOBAR100,000 |                      | 75+     | 4,539            | 2 in    |
| R. Ford     |           | nuclear        | t                    |         |                  | service |
| class       |           |                |                      |         |                  | (CVN-   |
78, 79);
4 more
planned
| Nimitz | USA | CATOBAR100,000 |     | 75+ | 5,680 | 10 in   |
| ------ | --- | -------------- | --- | --- | ----- | ------- |
| class  |     | nuclear        | t   |     |       | service |
(replac-
ing with
Ford)
| Queen   | UK     | STOVL         | 65,000 | t 36    | 679   | HMS      |
| ------- | ------ | ------------- | ------ | ------- | ----- | -------- |
| Eliza-  |        |               |        | F-35B + |       | QE,      |
| beth    |        |               |        | rotary  |       | HMS      |
| class   |        |               |        |         |       | PoW      |
| Charles | France | CATOBAR42,500 |        | t 40    | 1,950 | 1 in     |
| de      |        | nuclear       |        |         |       | service; |
| Gaulle  |        |               |        |         |       | PANG     |
succes-
sor
planned
| Liaoning | China | STOBAR | 60,000 | t 36 J-15 | 2,500 | Refit/training |
| -------- | ----- | ------ | ------ | --------- | ----- | -------------- |
(Kuznetsov-
class)
| Shandong | China | STOBAR | 65,000 | t 36 J-15 | 2,000 | Operational |
| -------- | ----- | ------ | ------ | --------- | ----- | ----------- |
(Type
001A)
| Fujian | China | CATOBAR80,000 |     | t 40 J- | ~3,000 | Operational |
| ------ | ----- | ------------- | --- | ------- | ------ | ----------- |
| (Type  |       | EMALS         |     | 35/J-15 |        | 2024+       |
003)
| INS     | India | STOBAR | 45,000 | t 26 MiG- | 1,400 | Operational |
| ------- | ----- | ------ | ------ | --------- | ----- | ----------- |
| Vikrant |       |        |        | 29K/Tejas |       | 2022        |
(IAC-1)
| INS     | India | STOBAR    | 45,500 | t 24 MiG- | 1,600 | Operational |
| ------- | ----- | --------- | ------ | --------- | ----- | ----------- |
| Vikra-  |       | (ex-      |        | 29K       |       |             |
| maditya |       | Gorshkov) |        |           |       |             |
| Cavour  | Italy | STOVL     | 27,100 | t 20      | 1,210 | Operational |
F-35B
23

| Ship / |          | Class     |                      |       |                  |     |             |
| ------ | -------- | --------- | -------------------- | ----- | ---------------- | --- | ----------- |
| Class  | Nation   | Type      | DisplacemenAtircraft |       | ComplemenSttatus |     |             |
| Juan   | Spain    | STOVL     | 27,000               | t 20  | 900              |     | Operational |
| Carlos | I        |           |                      | F-35B |                  |     |             |
| HTMS   | Thailand | STOVL     | 11,485               | t —   | 601              |     | Rarely      |
| Chakri |          | (no       |                      |       |                  |     | opera-      |
| Narue- |          | aircraft) |                      |       |                  |     | tional      |
bet
| Destroyers   | & Cruisers | (Key | Classes)     |                       |           |           |     |
| ------------ | ---------- | ---- | ------------ | --------------------- | --------- | --------- | --- |
| Class        | Nation     |      | Displacement | Armament              |           | Notes     |     |
| Arleigh      | USA        |      | 9,700 t      | VLS                   | 96 cells  | 90+       | in  |
| Burke Flight |            |      |              | (Tomahawk/SM-service; |           |           | BMD |
| III          |            |      |              | 6/ESSM),              |           | capable   |     |
|              |            |      |              | Mk 45                 | 5in       |           |     |
| Ticonderoga  | USA        |      | 9,600 t      | VLS                   | 122 cells | Retiring; |     |
| CG           |            |      |              |                       |           | replaced  | by  |
DDG
| Zumwalt | USA |     | 15,600 t | AGS | 155mm,   | 3 built; |     |
| ------- | --- | --- | -------- | --- | -------- | -------- | --- |
| class   |     |     |          | VLS | 80 cells | stealth  |     |
destroyer
| Type 45 | UK  |     | 7,350 t | Aster  | 15/30 | 6 in | service |
| ------- | --- | --- | ------- | ------ | ----- | ---- | ------- |
| Daring  |     |     |         | PAAMS, | Mk    |      |         |
41 (retrofit)
| Type 055 | China |     | 12,000 t | VLS     | 112 cells | 8 in  | service; |
| -------- | ----- | --- | -------- | ------- | --------- | ----- | -------- |
| Renhai   |       |     |          | (YJ-18, |           | rival | to       |
|          |       |     |          | HHQ-9B, |           | Burke |          |
CY-5)
| Type 052D   | China |     | 6,500 t  | VLS        | 64 cells | 25+       | in  |
| ----------- | ----- | --- | -------- | ---------- | -------- | --------- | --- |
| Luyang      | III   |     |          |            |          | service   |     |
| Hyuga/Izumo | Japan |     | 27,000 t | Converting |          | 4 vessels |     |
| (DDH)       |       |     |          | to F-35B   |          |           |     |
capable
| Maya class | Japan |     | 8,200 t | Aegis | BMD; | 2 in | service |
| ---------- | ----- | --- | ------- | ----- | ---- | ---- | ------- |
| (DDG)      |       |     |         | MK41  | 96   |      |         |
cells
| KDX-III | South | Korea | 10,600 t | Aegis;    | VLS | 3 in | service |
| ------- | ----- | ----- | -------- | --------- | --- | ---- | ------- |
| Sejong  |       |       |          | 128 cells |     |      |         |
| Daewang |       |       |          | (K-ASROC, |     |      |         |
SM-2)
24

| Class | Nation       | Displacement | Armament   | Notes       |
| ----- | ------------ | ------------ | ---------- | ----------- |
| FREMM | France/Italy | 6,000 t      | Sylver A70 | 12 France + |
| class |              |              | (SCALP-    | Italy       |
Naval)
| F-125 Baden- | Germany | 7,200 t | RAM, OTO, | 4 in service |
| ------------ | ------- | ------- | --------- | ------------ |
| Württemberg  |         |         | Harpoon   |              |
| INS Visakha- | India   | 7,400 t | BrahMos,  | 4 ordered    |
| patnam       |         |         | Barak-8   |              |
P-15B
| Admiral  | Russia | 5,400 t | Zircon, | 2+ in service |
| -------- | ------ | ------- | ------- | ------------- |
| Gorshkov |        |         | Kalibr, |               |
Oniks,
S-500M
| Sovremenny | Russia/China | 7,900 t | Sunburn   | China (4), |
| ---------- | ------------ | ------- | --------- | ---------- |
| class      |              |         | SS-N-22,  | Russia     |
|            |              |         | SA-N-7/12 | (legacy)   |
Key Frigates
| Class         |             | Nation  | Notes      |                 |
| ------------- | ----------- | ------- | ---------- | --------------- |
| Constellation | class       | USA     | Replacing  | LCS; Oliver     |
| (FFG-62)      |             |         | Hazard     | Perry successor |
| Type 23       | Duke / Type | UK      | 13 Type    | 23 active; 8    |
| 26 City       |             |         | Type 26    | ordered         |
| FTI class     | (FDI)       | France  | Replacing  | La Fayette;     |
|               |             |         | Belharra   | export          |
| F-125 /       | F-126       | Germany | F-126      | ordered 2023    |
| F-110         |             | Spain   | 5 on order |                 |
SIGMA / Van Speijk Netherlands/Indonesia Export variant built in
Indonesia
| Sachsen       | class F-124        | Germany      | AAW;                | 3 in service |
| ------------- | ------------------ | ------------ | ------------------- | ------------ |
| Al-Riyadh     | class              | Saudi Arabia | La Fayette-based    |              |
| Formidable    | class              | Singapore    | La Fayette-based    |              |
| Admiral       | Grigorovich        | Russia       | Black               | Sea fleet    |
| 5.2 Submarine | Fleet              |              |                     |              |
| Ballistic     | Missile Submarines | (SSBN)       | — Nuclear Deterrent |              |
25

| Class      | Nation | Boats   | Missiles   | Warheads    | Notes     |
| ---------- | ------ | ------- | ---------- | ----------- | --------- |
| Ohio class | USA    | 14 SSBN | 24×        | Up to       | 8 4       |
|            |        |         | Trident II | per missile | converted |
|            |        |         | D5         |             | to SSGN   |
(guided
missile)
| Columbia | USA | Building | 16×        | Next-gen |            |
| -------- | --- | -------- | ---------- | -------- | ---------- |
| class    |     | (first   | Trident II | SSBN     |            |
|          |     | ~2031)   | D5LE       |          |            |
| Vanguard | UK  | 4 (1 on  | 16×        | ~40 per  | Successor: |
| class    |     | patrol   | Trident II | boat     | Dread-     |
|          |     | always)  | D5         |          | nought     |
class
| Le Triom- | France | 4   | 16× M51.3 | TNO      |     |
| --------- | ------ | --- | --------- | -------- | --- |
| phant     |        |     | SLBM      | warheads |     |
class
| Borei-A | Russia | 10+ | 16×    | 6–10 |     |
| ------- | ------ | --- | ------ | ---- | --- |
| class   |        |     | Bulava | MIRV |     |
(R-30)
| Delta-IV | Russia | 5   | 16×    | 4 MIRV | Phasing |
| -------- | ------ | --- | ------ | ------ | ------- |
| class    |        |     | Sineva |        | out     |
(R-29)
| Type     | China | 6   | 12×       | 3–8 MIRV | Building |
| -------- | ----- | --- | --------- | -------- | -------- |
| 094A Jin |       |     | JL-2/JL-3 |          | 096      |
class
| Type 096   | China | Building | 24× JL-3 | Up to | 10 Entered |
| ---------- | ----- | -------- | -------- | ----- | ---------- |
| Tang class |       |          |          | MIRV  | construc-  |
tion
~2020s
| Arihant | India | 2 (1    | 12× K-15 | Single  | K-4 SLBM |
| ------- | ----- | ------- | -------- | ------- | -------- |
| class   |       | active) | / 4× K-4 | warhead | = 3,500  |
km
| Attack Submarines |        | (SSN/SSK) |     |     |             |
| ----------------- | ------ | --------- | --- | --- | ----------- |
| Class             | Nation | Type      | Qty |     | Notes       |
| Virginia class    | USA    | SSN       | 21+ |     | Block V has |
VPM (40
extra VLS)
26

| Class         | Nation | Type | Qty | Notes        |
| ------------- | ------ | ---- | --- | ------------ |
| Seawolf class | USA    | SSN  | 3   | Most capable |
SSN; USS
Jimmy
Carter
(SIGINT)
| Los Angeles | USA | SSN | 18  | Aging; Block |
| ----------- | --- | --- | --- | ------------ |
| class       |     |     |     | III/IV most  |
capable
| Astute class | UK  | SSN | 7   | Tomahawk, |
| ------------ | --- | --- | --- | --------- |
Spearfish;
most capable
RN sub
| Suffren     | France | SSN | 6 building | MdCN cruise |
| ----------- | ------ | --- | ---------- | ----------- |
| (Barracuda) |        |     |            | missile;    |
| class       |        |     |            | nuclear     |
capableboats
| Type 212A | Germany | AIP SSK | 6   | Air- |
| --------- | ------- | ------- | --- | ---- |
independent
propulsion;
very quiet
| Gotland class | Sweden | AIP SSK | 3   | Beat US |
| ------------- | ------ | ------- | --- | ------- |
Navy in
exercises
| Collins class | Australia | SSK | 6   | Replacing |
| ------------- | --------- | --- | --- | --------- |
with
SSN-AUKUS
(Virginia
interim)
| Soryu class | Japan | SSK | 11  | Li-ion |
| ----------- | ----- | --- | --- | ------ |
batteries;
most capable
SSK
| KSS-III   | South Korea | SSK | 3   | Air-         |
| --------- | ----------- | --- | --- | ------------ |
| Dosan Ahn |             |     |     | independent; |
| Changho   |             |     |     | SLBMs        |
(Hyunmoo-4-
4)
| Kiloclass636 | Russia | SSK | 6 (Black Sea) | Kalibr-     |
| ------------ | ------ | --- | ------------- | ----------- |
|              |        |     | + export      | armed; used |
in Ukraine
war
| Yasen-M | Russia | SSN | 4+  | Kalibr,      |
| ------- | ------ | --- | --- | ------------ |
| class   |        |     |     | Zircon armed |
27

| Class     | Nation | Type | Qty     |     | Notes         |
| --------- | ------ | ---- | ------- | --- | ------------- |
| Type 039C | China  | AIP  | SSK 25+ |     | Growing fleet |
Yuan class
| Type 093B | China | SSN | 6   |     |     |
| --------- | ----- | --- | --- | --- | --- |
Shang class
| Scorpène | France/Naval | SSK | India×6,    |     | Export  |
| -------- | ------------ | --- | ----------- | --- | ------- |
| class    | Group        |     | Malaysia×2, |     | success |
Chile×2,
Brazil×4
| S-80 class | Spain | AIP | SSK 4 |     | Bioethanol |
| ---------- | ----- | --- | ----- | --- | ---------- |
AIP
| PART       | 6 — Missile | & Rocket | Systems |     |     |
| ---------- | ----------- | -------- | ------- | --- | --- |
| 6.1 Cruise | Missiles    |          |         |     |     |
Range
| System   | Origin | (km)  | Type     | Operators  | Notes     |
| -------- | ------ | ----- | -------- | ---------- | --------- |
| Tomahawk | USA    | 1,600 | Subsonic | USA, UK,   | Anti-ship |
| Block V  |        |       | land     | Australia  | variant   |
|          |        |       | attack   |            | (RASM)    |
| AGM-     | USA    | 1,000 | Stealthy | USA,       |           |
| 158B     |        |       | air-     | Poland,    |           |
| JASSM-   |        |       | launched | Finland,   |           |
| ER       |        |       |          | Australia, |           |
UK
| AGM- | USA | 900 | Anti-ship | USA,      |     |
| ---- | --- | --- | --------- | --------- | --- |
| 158C |     |     | stealthy  | Australia |     |
LRASM
| Storm  | UK/France | 560 | Air-     | UK,     |     |
| ------ | --------- | --- | -------- | ------- | --- |
| Shadow | /         |     | launched | France, |     |
| SCALP  |           |     | stealthy | Italy,  |     |
Ukraine,
Egypt,
India +
| Taurus | Germany/Swe5d0e0n |     | Air-     | Germany, |     |
| ------ | ----------------- | --- | -------- | -------- | --- |
| KEPD   | 350               |     | launched | Spain,   |     |
|        |                   |     | stealthy | South    |     |
Korea
| Kh-101 | Russia | 4,000– | Air-     | Russia | Used in |
| ------ | ------ | ------ | -------- | ------ | ------- |
|        |        | 5,500  | launched |        | Ukraine |
stealth
28

Range
| System  | Origin | (km)   | Type      | Operators  | Notes |
| ------- | ------ | ------ | --------- | ---------- | ----- |
| Kalibr- | Russia | 2,000– | Land      | Russia,    |       |
| NK/PL   |        | 2,500  | attack;   | Iran       |       |
| (3M14)  |        |        | ship/sub- | (licensed) |       |
launched
| Zircon    | Russia | 1,000 | Mach 6–9   | Russia | Warship/submarine |
| --------- | ------ | ----- | ---------- | ------ | ----------------- |
| (3M22)    |        |       | hypersonic |        | launched          |
| Kinzhal   | Russia | 2,000 | Hypersonic | Russia | MiG-31K           |
| (Kh-47M2) |        |       | air-       |        | launched          |
launched
| Iskander- | Russia | 500 | Ground-  | Russia |     |
| --------- | ------ | --- | -------- | ------ | --- |
| K (R-500) |        |     | launched |        |     |
cruise
Onyx/YakhonRt/uBssriaah/MInodsia 650 Supersonic Russia, BrahMos-
|     |     | (BrahMos | anti-ship | India,   | II          |
| --- | --- | -------- | --------- | -------- | ----------- |
|     |     | NG)      |           | Vietnam, | hypersonic  |
|     |     |          |           | Philip-  | in develop- |
|     |     |          |           | pines,   | ment        |
Indonesia
| YJ-18 | China | 540        | Anti-ship   | / China | Warship/sub- |
| ----- | ----- | ---------- | ----------- | ------- | ------------ |
|       |       | (subsonic) | land        |         | launched     |
|       |       | / 180 (SS) | attack      |         |              |
| CJ-10 | China | 2,000      | Ground/air- | China   |              |
launched
| Babur-3 | Pakistan | 450 | Submarine- | Pakistan |     |
| ------- | -------- | --- | ---------- | -------- | --- |
launched
| Harpoon | USA | 300 | Anti-ship | 30+ |     |
| ------- | --- | --- | --------- | --- | --- |
nations
| Exocet    | France | 70–180 | Anti-ship | France +   |     |
| --------- | ------ | ------ | --------- | ---------- | --- |
| AM39/MM40 |        |        |           | 30 nations |     |
| Naval     | Norway | 185    | Stealthy  | Norway,    |     |
| Strike    |        |        | anti-ship | USA,       |     |
| Missile   |        |        |           | Poland,    |     |
| (NSM)     |        |        |           | Germany,   |     |
Romania
+
| RBS-15 | Sweden | 300 | Anti-ship | Sweden,  |     |
| ------ | ------ | --- | --------- | -------- | --- |
| Mk4    |        |     |           | Finland, |     |
Germany,
Poland
| LORA | Israel | 400 | Ship-    | Israel,    |     |
| ---- | ------ | --- | -------- | ---------- | --- |
|      |        |     | launched | Azerbaijan |     |
ballistic
29

| 6.2 Ballistic | Missiles |           |      |              |
| ------------- | -------- | --------- | ---- | ------------ |
| System        | Nation   | Range     | Type | Notes        |
| Minuteman     | USA      | 13,000 km | ICBM | 400          |
| III (LGM-     |          |           |      | operational; |
| 30G)          |          |           |      | GBSD         |
(Sentinel)
successor
| Trident II | USA/UK | 11,300 km | SLBM | 8× Mk5 RVs;  |
| ---------- | ------ | --------- | ---- | ------------ |
| D5         |        |           |      | CEP <90m     |
| RS-28      | Russia | 18,000 km | ICBM | 10–15 MIRV;  |
| Sarmat     |        |           |      | tested 2022; |
limited
operational
| UR-100N | Russia | 10,000 km | ICBM | ~60       |
| ------- | ------ | --------- | ---- | --------- |
| (SS-19) |        |           |      | remaining |
| Yars    | Russia | 12,000 km | ICBM | Primary   |
| (RS-24) |        |           |      | Russian   |
ICBM;
10-MIRV
mobile/silo
| Avangard | Russia | ~6,000 km | Hypersonic    |     |
| -------- | ------ | --------- | ------------- | --- |
| HGV      |        |           | glide vehicle |     |
on UR-100N
| DF-41 | China | 14,000+ km | ICBM          | 10 MIRV;  |
| ----- | ----- | ---------- | ------------- | --------- |
|       |       |            | (road-mobile) | expanding |
silos
| DF-5B   | China | 13,000 km | ICBM (silo) | 4–5 MIRV |
| ------- | ----- | --------- | ----------- | -------- |
| DF-31AG | China | 11,200 km | ICBM        |          |
(road-mobile)
| DF-21D | China | 1,500 km    | ASBM         | Anti-ship   |
| ------ | ----- | ----------- | ------------ | ----------- |
|        |       |             | (carrier-    | ballistic   |
|        |       |             | killer)      | missile     |
| DF-26  | China | 4,000 km    | IRBM         | Anti-ship / |
|        |       |             | dual-capable | anti-base   |
| Agni-V | India | 5,000–8,000 | ICBM class   | MIRV in     |
|        |       | km          | ICBM         | development |
(Agni-P/VI)
| Agni-IV     | India    | 4,000 km | IRBM |              |
| ----------- | -------- | -------- | ---- | ------------ |
| Shaheen-III | Pakistan | 2,750 km | MRBM |              |
| Ghauri      | Pakistan | 1,300 km | MRBM | Liquid fuel; |
| (Hatf-V)    |          |          |      | North Korea- |
derived
30

| System   | Nation      | Range      | Type  | Notes        |
| -------- | ----------- | ---------- | ----- | ------------ |
| Hwasong- | North Korea | 13,000+ km | ICBM  | Tested 2022, |
| 17       |             |            | (MIRV | 2024         |
capable)
| Hwasong- | North Korea | 13,000 km | ICBM |     |
| -------- | ----------- | --------- | ---- | --- |
15
| Jericho | III Israel | 6,500 km | ICBM | Israel does |
| ------- | ---------- | -------- | ---- | ----------- |
not oﬀicially
confirm
| Fateh-      | Iran        | 500 km          | SRBM       | Used vs       |
| ----------- | ----------- | --------------- | ---------- | ------------- |
| 110/313     |             |                 |            | Israel 2024   |
| Fattah-1    | Iran        | 1,400 km        | Hypersonic | First claimed |
|             |             |                 | (claimed   | hypersonic    |
|             |             |                 | Mach 15)   | MRBM          |
| Zolfaghar   | Iran        | 700 km          | MRBM       |               |
| PART        | 7 — Nuclear | Capabilities    |            |               |
| 7.1 Nuclear | Powers      | Reference Table |            |               |
Maps to the nuclear_status: NuclearStage and nuclear_stockpile fields
| in the Nation | schema.     |              |             |               |
| ------------- | ----------- | ------------ | ----------- | ------------- |
|               |             | Warheads     | Delivery    | NuclearStage  |
| Nation        | Status      | (est. 2025)  | Systems     | Value         |
| Russia        | Operational | ~5,580 total | ICBM (Yars, | NUCLEAR_POWER |
|               |             | (~1,700      | Sarmat),    |               |
|               |             | deployed     | SLBM        |               |
|               |             | strategic)   | (Bulava),   |               |
bomber
(Kh-101)
| United | Operational | ~5,044 total | ICBM          | NUCLEAR_POWER |
| ------ | ----------- | ------------ | ------------- | ------------- |
| States |             | (~1,700      | (Minuteman    |               |
|        |             | deployed     | III), SLBM    |               |
|        |             | strategic)   | (Trident II), |               |
B-52H/B-
2/B-21
| China | Expanding | ~500+     | DF-41,       | NUCLEAR_POWER |
| ----- | --------- | --------- | ------------ | ------------- |
|       |           | (rapidly  | DF-5B, JL-3, |               |
|       |           | growing   | H-20         |               |
|       |           | toward    | (pending)    |               |
|       |           | ~1,500 by |              |               |
2035)
31

|        |             | Warheads    | Delivery   | NuclearStage  |
| ------ | ----------- | ----------- | ---------- | ------------- |
| Nation | Status      | (est. 2025) | Systems    | Value         |
| France | Operational | ~290        | SLBM(M51), | NUCLEAR_POWER |
ASMP-A
(Rafale)
| United   | Operational | ~225 | Trident II D5 | NUCLEAR_POWER |
| -------- | ----------- | ---- | ------------- | ------------- |
| Kingdom  |             |      | only          |               |
| Pakistan | Operational | ~170 | Shaheen,      | NUCLEAR_POWER |
Ghauri,
Ra’ad cruise
missile, Nasr
(tactical)
| India | Operational | ~170 | Agni-IV/V, | NUCLEAR_POWER |
| ----- | ----------- | ---- | ---------- | ------------- |
Prithvi,
Arihant
SSBN,
Mirage
2000H
| Israel | Undeclared | ~90         | Jericho III, | NUCLEAR_AMBIGUOUS |
| ------ | ---------- | ----------- | ------------ | ----------------- |
|        |            | (estimated) | F-35I        |                   |
(suspected),
Dolphin
SLCM
| North | Operational | ~40–50 | Hwasong-17, | NUCLEAR_POWER |
| ----- | ----------- | ------ | ----------- | ------------- |
| Korea | (contested) |        | Pukguksong  |               |
SLBM
| Iran  | Near-       | 0 (HEU     | Ballistic     | NUCLEAR_THRESHOLD |
| ----- | ----------- | ---------- | ------------- | ----------------- |
|       | threshold   | enrichment | missiles only |                   |
|       |             | >60%)      | if weaponized |                   |
| South | Non-nuclear | 0          | US extended   | NUCLEAR_NONE      |
| Korea |             |            | deterrence    |                   |
(EDPC)
| Japan | Non-nuclear | 0   | US extended | NUCLEAR_NONE |
| ----- | ----------- | --- | ----------- | ------------ |
deterrence
| Germany | Non-nuclear | 0 (but ~20 | Tornado/F-    | NUCLEAR_HOST |
| ------- | ----------- | ---------- | ------------- | ------------ |
|         | (NATO       | US B61s at | 35A certified |              |
|         | hosting)    | Büchel)    | for B61       |              |
delivery
| Turkey | Non-nuclear | 0 (but ~50 | F-16 Block   | NUCLEAR_HOST |
| ------ | ----------- | ---------- | ------------ | ------------ |
|        | (NATO       | US B61s at | 70 certified |              |
|        | hosting)    | Incirlik)  | for B61      |              |
delivery
32

|              |             | Warheads      | Delivery  | NuclearStage |
| ------------ | ----------- | ------------- | --------- | ------------ |
| Nation       | Status      | (est. 2025)   | Systems   | Value        |
| Netherlands, | Non-nuclear | 0 (US B61s    | F-35A     | NUCLEAR_HOST |
| Belgium,     | (NATO       | at            | certified |              |
| Italy        | hosting)    | Volkel/Kleine |           |              |
Bro-
gel/Aviano)
| Saudi   | Non-nuclear  | 0 (ballistic | DF-3A            | NUCLEAR_NONE |
| ------- | ------------ | ------------ | ---------------- | ------------ |
| Arabia  |              | missiles     | from (retiring), |              |
|         |              | China,       | no DF-21         |              |
|         |              | warheads)    | (purchased)      |              |
| Belarus | Russian      | 0 (Russian   | Iskander-M       | NUCLEAR_HOST |
|         | tactical     | warheads     | on (Russian      |              |
|         | nukes hosted | Belarusian   | crews)           |              |
territory)
| Australia | Non-nuclear | 0   | AUKUS SSN | NUCLEAR_NONE |
| --------- | ----------- | --- | --------- | ------------ |
(no nuclear
weapons)
| Brazil | Non-nuclear | 0 (nuclear | Uranium       | NUCLEAR_CIVILIAN |
| ------ | ----------- | ---------- | ------------- | ---------------- |
|        |             | submarine  | enrichment    |                  |
|        |             | research   | — (low-level) |                  |
SN-BR
project)
| Argentina | Non-nuclear | 0 (historical | —   | NUCLEAR_NONE |
| --------- | ----------- | ------------- | --- | ------------ |
— abandoned
1994)
| Kazakhstan        | Gave up | 0 (gave       | up —  | NUCLEAR_NONE |
| ----------------- | ------- | ------------- | ----- | ------------ |
|                   | weapons | Soviet        |       |              |
|                   |         | arsenal       | 1994) |              |
| Ukraine           | Gave up | 0 (gave       | up —  | NUCLEAR_NONE |
|                   | weapons | Soviet        |       |              |
|                   |         | arsenal       | 1994) |              |
| Libya             | Gave up | 0 (renounced  | —     | NUCLEAR_NONE |
|                   | program | 2003)         |       |              |
| NuclearStage      | Enum    | for game:     |       |              |
| type NuclearStage | =       |               |       |              |
| | 'NUCLEAR_NONE'  |         | // No program |       |              |
| 'NUCLEAR_CIVILIAN' // Civilian enrichment (Brazil, Argentina)
| | 'NUCLEAR_RESEARCH' |     | // Early  | military research   |     |
| -------------------- | --- | --------- | ------------------- | --- |
| | 'NUCLEAR_PROGRAM'  |     | // Active | weapons development |     |
| 'NUCLEAR_THRESHOLD' // Near-breakout (Iran, Japan potential)
| | 'NUCLEAR_AMBIGUOUS' |     | // Undeclared | (Israel)           |        |
| --------------------- | --- | ------------- | ------------------ | ------ |
| | 'NUCLEAR_HOST'      |     | // NATO       | sharing or Russian | basing |
33

| | 'NUCLEAR_POWER' |     |     | // Declared | operational |     | capability |     |
| ----------------- | --- | --- | ----------- | ----------- | --- | ---------- | --- |
Data sources: Federation of American Scientists (fas.org/issues/nuclear-
weapons/status-world-nuclear-forces/); Arms Control Association; Bulletin of
| the Atomic | Scientists; | SIPRI        | Yearbook |           |     |     |     |
| ---------- | ----------- | ------------ | -------- | --------- | --- | --- | --- |
| PART       | 8 —         | Data Sources | Master   | Reference |     |     |     |
| 8.1 Free   | / Open      | Sources      |          |           |     |     |     |
Update
| Source          |     | URL                 |     | Data Types      |     | Frequency |     |
| --------------- | --- | ------------------- | --- | --------------- | --- | --------- | --- |
| SIPRI Databases |     | sipri.org/databases |     | Arms transfers, |     | Annual    |     |
military
|               |           |                                    |     | spending,    | nuclear  |                  |       |
| ------------- | --------- | ---------------------------------- | --- | ------------ | -------- | ---------------- | ----- |
| IISS Military |           | iiss.org/publications/Ftuhlel-OOB, |     |              |          | Annual           |       |
| Balance       |           | military-balance                   |     | hardware     |          | (subscription,   | but   |
|               |           |                                    |     | inventories  |          | summaries        | free) |
| Global        | Firepower | globalfirepower.comAggregated      |     |              |          | Annual           |       |
| Index         |           |                                    |     | military     | power    | (cross-reference |       |
|               |           |                                    |     | index        |          | carefully)       |       |
| Federation    | of        | fas.org                            |     | Nuclear      |          | Continuous       |       |
| American      |           |                                    |     | stockpiles,  |          |                  |       |
| Scientists    |           |                                    |     | weapons      | tech     |                  |       |
| Arms Control  |           | armscontrol.org                    |     | Treaties,    | nuclear, | Continuous       |       |
| Association   |           |                                    |     | missiles     |          |                  |       |
| Oryx (OSINT   |           | oryxspioenkop.com                  |     | Visual       |          | Real-time        |       |
| losses)       |           |                                    |     | verification | of       |                  |       |
military losses
| Jane’s Defence |          | janes.com |     | Gold standard, |       | Annual       |     |
| -------------- | -------- | --------- | --- | -------------- | ----- | ------------ | --- |
| (via library)  |          |           |     | all hardware   |       | subscription |     |
| Defense        | Security | dsca.mil  |     | US arms        | sales | Real-time    |     |
| Cooperation    |          |           |     | notifications  |       |              |     |
Agency
| World Bank |     | data.worldbank.org |     | GDP, population, |     | Annual |     |
| ---------- | --- | ------------------ | --- | ---------------- | --- | ------ | --- |
| Open Data  |     |                    |     | trade            |     |        |     |
| CIA World  |     | cia.gov/the-       |     | Country          |     | Annual |     |
| Factbook   |     | world-factbook     |     | overviews        |     |        |     |
including
military
| EIA           |     | eia.gov/internationalOil/gas |     |            |     | Annual |     |
| ------------- | --- | ---------------------------- | --- | ---------- | --- | ------ | --- |
| International |     |                              |     | production | and |        |     |
| Energy        |     |                              |     | reserves   |     |        |     |
34

Update
| Source       |     | URL             |     | Data    | Types     | Frequency |     |
| ------------ | --- | --------------- | --- | ------- | --------- | --------- | --- |
| USGS Mineral |     | mrdata.usgs.gov |     | Mining  | deposits, | Annual    |     |
| Resources    |     |                 |     | mineral |           |           |     |
commodities
| FAO FAOSTAT |     | fao.org/faostat |     | Agriculture |     | Annual |     |
| ----------- | --- | --------------- | --- | ----------- | --- | ------ | --- |
production
| OurAirports |     | ourairports.com |     | Global           |     | Community |     |
| ----------- | --- | --------------- | --- | ---------------- | --- | --------- | --- |
|             |     |                 |     | airport/airfield |     | updated   |     |
database
| World Port | Index | msi.nga.mil |     | Port |     | Annual |     |
| ---------- | ----- | ----------- | --- | ---- | --- | ------ | --- |
characteristics
worldwide
| ACLED |     | acleddata.com |     | Conflict | event | Real-time |     |
| ----- | --- | ------------- | --- | -------- | ----- | --------- | --- |
|       |     |               |     | data     | (for  |           |     |
flashpoints)
| Nuclear        | Threat        | nti.org        |              | WMD        | country | Continuous      |            |
| -------------- | ------------- | -------------- | ------------ | ---------- | ------- | --------------- | ---------- |
| Initiative     |               |                |              | profiles   |         |                 |            |
| 8.2 Commercial |               | / Subscription |              | Sources    | (Worth  | It)             |            |
| Source         |               |                | What         | It Adds    |         | Approximate     | Cost       |
| Jane’s All     | the           | World’s        | Definitive   | aircraft   | specs   | ~$3,000/yr      |            |
| Aircraft       |               |                |              |            |         | (institutional) |            |
| SIPRI Arms     | Transfers     |                | Full         | deal-level | export  | Free (web       | interface) |
| DB             |               |                | data         |            |         |                 |            |
| IHS Markit     | / S&P         |                | Defense      | contract   |         | Enterprise      | pricing    |
| Global         | Defence       |                | intelligence |            |         |                 |            |
| Forecast       | International |                | Defense      | market     |         | Enterprise      | pricing    |
forecasts
| 8.3 Using | OSINT | for | Game | Seeding |     |     |     |
| --------- | ----- | --- | ---- | ------- | --- | --- | --- |
For game purposes, the combination of: - IISS Military Balance (country-
levelOOBsummariesoftenquotedinfreepress)-SIPRI(spendingpercentages;
arms transfers) - Oryx (visual confirmation of specific hardware) - Global
Firepower (broad ratios — use for relative comparison only) - Wikipedia
military articles (individual platform specs; well-sourced for major systems)
…is suﬀicient to seed a hardware.json and nations.json that will be credible
| for gameplay | at  | Phase | 1–3 scale. |     |     |     |     |
| ------------ | --- | ----- | ---------- | --- | --- | --- | --- |
35

| PART | 9 — | AI DNA | Seed Values |     | (Starter | Archetypes) |     |
| ---- | --- | ------ | ----------- | --- | -------- | ----------- | --- |
Mapstoai_archetypeandutility_weightsintheNationschema. Theseare
| starting | weights | — the simulation | evolves | them | based | on events. |     |
| -------- | ------- | ---------------- | ------- | ---- | ----- | ---------- | --- |
Example
Na-
| Archetypeeconomic |     | military | stability | standing | expansiongrievance |      | tions |
| ----------------- | --- | -------- | --------- | -------- | ------------------ | ---- | ----- |
| GREAT_P0.O20WER   |     | 0.25     | 0.20      | 0.25     | 0.10               | 0.00 | USA,  |
Russia,
China
| REGIONA0L.2_0HEGE0M.2O5N |     |     | 0.20 | 0.15 | 0.20 | 0.00 | India, |
| ------------------------ | --- | --- | ---- | ---- | ---- | ---- | ------ |
Brazil,
Turkey,
Saudi
Arabia
| TRADE_N0.A40TION |     | 0.10 | 0.20 | 0.25 | 0.05 | 0.00 | Germany, |
| ---------------- | --- | ---- | ---- | ---- | ---- | ---- | -------- |
Japan,
Singa-
pore,
Nether-
lands
| MILITARY0._10REGIM0E.40 |     |     | 0.30 | 0.05 | 0.15 | 0.00 | North |
| ----------------------- | --- | --- | ---- | ---- | ---- | ---- | ----- |
Korea,
Myan-
mar
junta
| REVISION0.I1S5T |     | 0.25 | 0.15 | 0.10 | 0.20 | 0.15 | Iran, |
| --------------- | --- | ---- | ---- | ---- | ---- | ---- | ----- |
NK,
Venezuela
| STATUS_0Q.2U5O |     | 0.15 | 0.30 | 0.20 | 0.05 | 0.05 | UK, |
| -------------- | --- | ---- | ---- | ---- | ---- | ---- | --- |
France,
Aus-
tralia,
Canada
| FRAGILE0_.2S0TATE |     | 0.15 | 0.50 | 0.05 | 0.00 | 0.10 | Somalia, |
| ----------------- | --- | ---- | ---- | ---- | ---- | ---- | -------- |
Haiti,
Yemen,
Libya
| PETRO_S0T.3A5TE |     | 0.15 | 0.25 | 0.20 | 0.05 | 0.00 | Saudi |
| --------------- | --- | ---- | ---- | ---- | ---- | ---- | ----- |
Arabia,
UAE,
Kuwait,
Qatar
36

Example
Na-
| Archetypeeconomic | military stability | standing expansiongrievance | tions       |
| ----------------- | ------------------ | --------------------------- | ----------- |
| IRREDEN0T.1I0ST   | 0.30 0.15          | 0.10 0.10                   | 0.25 Serbia |
(1990s
DNA),
China
(Tai-
wan),
Russia
(Ukraine)
| NEUTRAL0.25 | 0.10 0.30 | 0.25 0.00 | 0.10 Switzerland, |
| ----------- | --------- | --------- | ----------------- |
Aus-
tria,
Ireland
Document maintained alongside TDD v1.0 and Map Data Sources v1.0. All
figures are representative baselines for game initialization — the simulation will
diverge from real-world values as gameplay proceeds. Update seeding values from
| annual IISS / SIPRI | releases. |     |     |
| ------------------- | --------- | --- | --- |
37