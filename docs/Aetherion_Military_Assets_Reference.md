**AETHERION**

Military, Assets & World Order Reference

Natural Resources · Armed Forces · Weapons Inventories · Nuclear Capabilities · Industrial Capacity

INTERNAL DEVELOPMENT DOCUMENT · v1.0

# **Overview & Purpose**

This document provides the complete data foundation for seeding Aetherion's Hardware Registry, RGO (Resource Gathering Operation) system, arms market, and AI utility weights. It covers: global natural resource deposits by nation and region; the armed forces of all major powers; specific weapons inventories (aircraft, armored vehicles, naval fleets, missile systems); nuclear capabilities; and industrial/economic capacity ratings. All data is derived from open-source military intelligence databases, defense ministry publications, and recognized reference sources.

For each major military power a detailed inventory table is provided. For secondary and minor powers, aggregated tier ratings are given. The companion Map Data Reference document covers geographic data; this document covers everything that goes inside the nations.

# **PART I — Natural Resources**

## **1.1 Energy Resources**

The following tables map proven reserves and production capacity for crude oil, natural gas, coal, and uranium by nation. These seed the RGO yield values and energy commodity trade flows in Aetherion's economic engine.

**Crude Oil — Top Producers & Reserves**

| **Nation** | **Proven Reserves (bn bbl)** | **Production (mb/d ~2023)** | **Export Status** | **Aetherion RGO Tier** |
| --- | --- | --- | --- | --- |
| Saudi Arabia | 267 | 10.5 | Major Exporter — OPEC Core | 5 — Major |
| Venezuela | 303 | 0.8 (underproduced) | Potential Exporter — sanctions-hit | 5 — Major (degraded) |
| Iran | 208 | 3.0 | Major Exporter — sanctioned | 5 — Major |
| Iraq | 145 | 4.5 | Major Exporter | 5 — Major |
| Kuwait | 102 | 2.8 | Major Exporter | 4 |
| UAE | 98 | 4.0 | Major Exporter | 4 |
| Russia | 80 | 10.5 | Major Exporter | 5 — Major |
| Libya | 48 | 1.2 | Exporter — fragile state | 4 |
| United States | 44 | 12.9 | Net Exporter (post-shale) | 5 — Major |
| Kazakhstan | 30 | 1.8 | Exporter | 3 |
| Nigeria | 37 | 1.3 | Exporter | 4 |
| Canada | 170 (oil sands) | 5.0 | Major Exporter | 5 — Major |
| Brazil | 15 | 3.5 | Net Exporter (offshore) | 4 |
| Norway | 8 | 1.7 | Major Exporter (North Sea) | 3 |
| China | 26 | 4.2 | Net Importer (large domestic) | 4 |
| Mexico | 5.8 | 1.8 | Net Importer | 3 |
| Angola | 7.8 | 1.1 | Exporter | 3 |
| Algeria | 12 | 1.0 | Exporter | 3 |
| Azerbaijan | 7 | 0.7 | Exporter | 2 |
| Oman | 5.4 | 0.9 | Exporter | 2 |

**NOTE:** *Data source: OPEC Annual Statistical Bulletin, BP Statistical Review of World Energy, EIA International Energy Statistics. These are 2022–2023 figures. Use SIPRI or EIA for updates.*

**Natural Gas — Key Producers**

| **Nation** | **Proven Reserves (tcm)** | **Production (bcm/yr ~2023)** | **Notes** |
| --- | --- | --- | --- |
| Russia | 37.4 | 620 | World's largest reserves; major pipeline exporter (Europe, China) |
| Iran | 32.1 | 260 | Largely undeveloped; domestic use dominant; sanctioned exports |
| Qatar | 23.9 | 180 | World's largest LNG exporter; North Field dominant |
| Turkmenistan | 13.6 | 65 | Landlocked; pipeline to China; underutilized |
| United States | 12.9 | 970 | Shale revolution; LNG exporter via Gulf Coast |
| Saudi Arabia | 9.4 | 115 | Associated gas; domestic use |
| China | 8.4 | 220 | Shale + conventional; still major importer |
| UAE | 6.1 | 60 | Domestic + LNG export |
| Venezuela | 5.6 | 28 | Underproduced; associated gas flared |
| Nigeria | 5.7 | 49 | LNG export via NLNG; flaring problem |
| Algeria | 4.5 | 100 | Pipeline to Europe + LNG |
| Iraq | 3.5 | 12 | Largely flared; infrastructure lacking |
| Australia | 3.2 | 150 | Major LNG exporter; NW shelf |
| Canada | 2.6 | 185 | Tight gas; LNG export growing |
| Norway | 1.9 | 120 | Pipeline to Europe; declining fields |
| Azerbaijan | 2.0 | 34 | TANAP/TAP pipeline to Europe |
| Egypt | 2.0 | 65 | Mediterranean gas; LNG export |
| Indonesia | 2.8 | 65 | LNG export; declining Arun/Bontang |
| Malaysia | 2.4 | 75 | LNG export; Petronas-dominated |
| Libya | 1.5 | 12 | Potential; fragile state limits output |

**Uranium — Production & Reserves**

| **Nation** | **Reserves (kt U)** | **Production (tU/yr)** | **Notes** |
| --- | --- | --- | --- |
| Kazakhstan | 906 | 21,227 | World #1 producer; 40% global supply; Kazatomprom |
| Canada | 564 | 7,351 | High-grade deposits; Athabasca Basin |
| Namibia | 463 | 5,613 | Rossing, Husab mines |
| Australia | 1,692 | 4,087 | Largest reserves; limited production; Ranger closed 2021 |
| Uzbekistan | 132 | 3,500 | NMMC state company |
| Russia | 480 | 2,990 | Domestic + Central Asian production |
| Niger | 311 | 2,020 | Orano-operated mines; political instability |
| China | 290 | 1,900 | Domestic mines + major importer |
| Ukraine | 233 | 846 | Eastern mines; disrupted by war |
| South Africa | 320 | 346 | Witwatersrand byproduct |

## **1.2 Critical Minerals & Strategic Materials**

These materials seed the Rare Earths, Lithium, and semiconductor supply chain RGOs. Control of these resources is among the highest-value strategic objectives in the game.

| **Mineral** | **Top 3 Producers** | **Strategic Use in Aetherion** | **Disruption Effect if Supply Cut** |
| --- | --- | --- | --- |
| Lithium | Australia (55%), Chile (28%), China (15%) | EV batteries, grid storage; Tier 4 electronics | Advanced factory output -30%; EV production halts |
| Cobalt | DRC (70%), Russia (4%), Australia (4%) | Battery cathodes; superalloys for jet engines | Aviation production -25%; battery factories -40% |
| Rare Earth Elements | China (60%), USA (15%), Australia (8%) | F-35 avionics, missile guidance, EW systems, wind turbines | Gen 5 aircraft production blocked; EW capability -50% |
| Nickel | Indonesia (37%), Philippines (13%), Russia (9%) | Steel alloys, jet engines, EV batteries | Stainless steel -20%; military vehicle production -15% |
| Copper | Chile (27%), Peru (11%), DRC (9%) | All electrical infrastructure; ammunition casings | Infrastructure build cost +20%; all factory output -10% |
| Titanium | Russia (25%), Japan (16%), Kazakhstan (14%) | Airframe construction, submarine hulls | Aircraft/submarine production +40% cost; halted if cut |
| Chromium | South Africa (45%), Kazakhstan (18%), India (10%) | Stainless steel; armor plating | Armor production -30% |
| Manganese | South Africa (32%), Gabon (14%), Australia (13%) | Steel alloys | Steel output -15% |
| Palladium | Russia (40%), South Africa (35%) | Catalytic converters; electronics | Auto production -20%; EW-sensor cost +30% |
| Platinum | South Africa (72%), Russia (11%) | Fuel cells, catalysts, advanced sensors | Hydrogen/fuel cell programs blocked |
| Tungsten | China (82%) | Hardened ammunition, drill bits, electronics | Armor-piercing round production halted if China cuts |
| Silicon / Quartz | China (60%), Russia (7%), Brazil (5%) | Semiconductor wafers (all chips) | Fab production -60% without substitution |
| Gallium | China (80%) | Compound semiconductors (radar, EW, 5G) | AESA radar production halted; Gen 5 avionics blocked |
| Germanium | China (59%), Russia (7%) | Fiber optics, IR optics, semiconductors | FLIR/NV systems production cut |
| Phosphate | Morocco (70% reserves), China, Russia | Fertilizer production | Global food prices +30–60% if Morocco supply cut |
| Potash | Canada (34%), Russia (22%), Belarus (18%) | Fertilizer (with phosphate + nitrogen) | Food RGO yields -30% worldwide if supply disrupted |
| Helium | USA (40%), Qatar (30%), Algeria (15%) | MRI machines, rocket fuel cooling, fiber optics | Medical systems +20% cost; space launch affected |
| Graphite | China (65%), Mozambique (12%) | EV battery anodes; nuclear reactor moderators | Battery production -25%; nuclear reactor builds +30% time |

**NOTE:** *Primary data source: USGS Mineral Commodity Summaries (published annually, free at usgs.gov/publications/mineral-commodity-summaries). The World Mining Data report (Austria Federal Ministry) provides complementary figures.*

## **1.3 Agricultural Commodities — Major Exporters**

| **Commodity** | **Top Exporters (2022–23)** | **Import-Dependent Nations** | **Disruption Trigger in Aetherion** |
| --- | --- | --- | --- |
| Wheat | Russia (22%), EU-27 (18%), Australia (14%), USA (13%), Canada (12%) | Egypt, Nigeria, Pakistan, Indonesia, Bangladesh | War in Ukraine/Russia → global +40% price spike; POP food access -20% in importers |
| Rice | India (40%), Thailand (16%), Vietnam (12%), Pakistan (9%) | Sub-Saharan Africa, Philippines, Saudi Arabia | India export ban → SE Asian POP militancy spike within 6 months |
| Corn / Maize | USA (32%), Argentina (17%), Brazil (15%), Ukraine (13%) | Mexico, Egypt, Japan, South Korea, EU (feed grain) | Ukraine war → animal feed crisis → meat prices +30% |
| Soybeans | Brazil (55%), USA (28%), Argentina (8%) | China (60% of imports), EU, Southeast Asia | Brazilian drought → Chinese food inflation; POP ASoL -5% |
| Palm Oil | Indonesia (58%), Malaysia (27%) | India, Pakistan, Bangladesh, Nigeria, EU | Indonesian export ban → cooking oil crisis in South Asia/Africa |
| Sunflower Oil | Ukraine (48%), Russia (27%), Argentina (7%) | India, Pakistan, EU food industry | Ukraine war → sunflower oil +80%; substitute demand spikes palm oil |
| Sugar | Brazil (30%), Thailand (10%), India (10%), Australia (5%) | China, USA, EU, SE Asia | Brazilian drought → candy/pharma precursor +25% |
| Beef | Brazil (25%), Australia (20%), USA (16%), Argentina (10%) | China, Japan, South Korea, EU | Brazil foot-and-mouth event → export ban → China POP luxury disruption |
| Fertilizer (Nitrogen) | Russia (23%), China (15%), Canada (11%) | USA, Brazil, India, EU agriculture | Russia sanctions → nitrogen fertilizer +60%; food RGO yield -20% worldwide |
| Fertilizer (Potash) | Canada (34%), Russia (22%), Belarus (18%) | USA, Brazil, China, India | Belarus sanctions + Russia sanctions → global crop yield -15% |

# **PART II — Global Arms Market & Weapons Inventories**

## **2.1 Data Sources for Military Hardware**

All hardware inventory data should be seeded from the following open-source databases. These are the industry standard references used by defense analysts, academics, and governments worldwide:

| **Source** | **Content** | **URL** | **Update Frequency** | **License** |
| --- | --- | --- | --- | --- |
| IISS Military Balance | Comprehensive annual inventory: all nations, all branches | iiss.org/publications/the-military-balance | Annual (February) | Commercial — library/purchase required; ~$400/yr |
| SIPRI Arms Transfers DB | Global arms imports/exports; contracts and deliveries 1950–present | sipri.org/databases/armstransfers | Annual (March) | Free online |
| SIPRI Military Expenditure | Defense budgets by nation 1949–present | sipri.org/databases/milex | Annual (April) | Free online |
| GlobalFirepower.com | Aggregated force structure data (less precise but free) | globalfirepower.com | Ongoing | Free (public) |
| Flight International World Air Forces | Air force inventories by nation | flightglobal.com/world-air-forces/ | Annual (Jan) | Free summary; full in magazine |
| Jane's Fighting Ships | Naval vessel inventories, specifications | janes.com | Annual | Commercial |
| Jane's All the World's Aircraft | Aircraft inventories and specifications | janes.com | Annual | Commercial |
| Nuclear Threat Initiative (NTI) | Nuclear arsenals, delivery systems, status | nti.org/analysis/articles/ | Quarterly | Free |
| Federation of American Scientists (FAS) | Nuclear forces, ICBM data, missile specs | fas.org/issues/nuclear-weapons/ | Ongoing | Free |
| CSIS Missile Defense Project | Global missile inventories, ranges, yields | missilethreat.csis.org | Ongoing | Free |
| Oryx Blog | Visual verification of equipment losses (Ukraine/others) | oryxspioenkop.com | Daily | Free |
| Army Guide / Army Recognition | Armored vehicle specifications | armyguide.com | Ongoing | Free |

**NOTE:** *For MVP/prototype purposes, GlobalFirepower, FAS, and SIPRI provide sufficient free data. For commercial release, purchasing The Military Balance or a Jane's subscription will give authoritative, verified figures.*

## **2.2 Major Military Powers — Detailed Inventories**

**UNITED STATES**

| **Branch** | **Key Equipment** | **Quantity (approx)** | **Generation / Notes** |
| --- | --- | --- | --- |
| Air Force — Fighters | F-35A Lightning II | ~450 operational | Gen 5; stealth; primary future fighter |
| Air Force — Fighters | F-22 Raptor | ~183 | Gen 5; air superiority only; production ended |
| Air Force — Fighters | F-15EX Eagle II | ~200 (growing) | Gen 4+; new build; export variant |
| Air Force — Fighters | F-16C/D Fighting Falcon | ~900 (USAF + ANG) | Gen 4; workhorse; 4,600+ built globally |
| Air Force — Bombers | B-2 Spirit | 20 | Gen 5 stealth; strategic; nuclear-capable |
| Air Force — Bombers | B-52H Stratofortress | 76 | Gen 3 (modernized); nuclear + conventional; long range |
| Air Force — Bombers | B-21 Raider | IOC ~2025; 100+ planned | Gen 6; next-gen stealth bomber |
| Air Force — ISTAR | E-3 Sentry (AWACS), E-8 JSTARS, RC-135 | ~40 combined | Strategic ISR fleet |
| Army — Tanks | M1A2 SEPv3 Abrams | ~2,500 active; 5,000+ storage | Gen 4+; composite armor; DU penetrators |
| Army — IFV | M2A3 Bradley | ~3,500 | Gen 4; 25mm chain gun; ATGMs |
| Army — Artillery | M109A7 Paladin (155mm SP) | ~700 | Self-propelled; GPS-guided Excalibur |
| Army — Helicopters | AH-64E Apache | ~700 | Anti-armor; Longbow radar; Hellfire |
| Army — Helicopters | UH-60 Black Hawk | ~2,000+ | Multi-role; workhorse |
| Navy — Aircraft Carriers | Nimitz-class CVN | 10 active | Nuclear; ~90 aircraft each |
| Navy — Aircraft Carriers | Gerald R. Ford-class CVN | 2 active (Ford, Kennedy) | Nuclear; next-gen; EMALS catapult |
| Navy — Submarines (nuclear) | Virginia-class SSN | 22 commissioned; 7 building | Attack; Tomahawk; growing fleet |
| Navy — Submarines (nuclear) | Ohio-class SSBN | 14 (8 Atlantic, 6 Pacific) | Ballistic missile; Trident II D5 |
| Navy — Submarines (nuclear) | Ohio-class SSGN | 4 converted | Cruise missile; 154 Tomahawks each |
| Navy — Destroyers | Arleigh Burke-class DDG | ~70 active + building | Aegis BMD; Tomahawk; SM-2/3/6 |
| Navy — Cruisers | Ticonderoga-class CG | ~20 (phasing out) | Aegis; Tomahawk; SM-2/3 |
| Navy — LHA/LHD | Wasp / America-class | 9 | Amphibious assault; F-35B capable |
| Missiles — Air | AIM-120D AMRAAM | Tens of thousands stockpile | BVR; active radar homing |
| Missiles — Air | AIM-9X Sidewinder | Large stockpile | IR-guided dogfight missile |
| Missiles — Land/Sea | BGM-109 Tomahawk Block V | ~4,000 in stockpile | 1,600 km range; terrain-following |
| Missiles — Anti-ship | AGM-158C LRASM | Operational | Stealthy; autonomous targeting |
| Missiles — Ballistic | LGM-30G Minuteman III (ICBM) | 400 deployed silos | Nuclear; 13,000 km range; MIRVed (single RV post-START) |
| Nuclear | W76-2 / W88 (SLBM) | ~1,700 deployed; ~3,700 total stockpile | Trident II delivery; sea-based dyad dominant |

**RUSSIA**

| **Branch** | **Key Equipment** | **Quantity (approx)** | **Generation / Notes** |
| --- | --- | --- | --- |
| Air Force — Fighters | Su-27/Su-30/Su-35S | ~500 combined (various variants) | Gen 4/4+; Su-35S most modern; thrust vectoring |
| Air Force — Fighters | MiG-29/MiG-35 | ~300 | Gen 4; lighter fighter; export workhorse |
| Air Force — Fighters | Su-57 Felon | ~15 operational (~2023); 76 on order | Gen 5; AESA radar; stealth; limited production |
| Air Force — Bombers | Tu-95MS Bear | ~55 active | Turboprop strategic; Kh-101 cruise missiles |
| Air Force — Bombers | Tu-160 Blackjack | ~16 active; 10 new build planned | Supersonic swing-wing; nuclear + Kh-101 |
| Air Force — Bombers | Tu-22M3 Backfire | ~60 | Supersonic medium range; Kh-22/32 ASM |
| Air Force — Air Defense | Su-34 Fullback | ~130 | Gen 4+; strike aircraft; dual-role |
| Army — Tanks | T-72B3/B3M | ~2,000 active; 5,000+ storage | Gen 3 upgraded; most common in Ukraine war |
| Army — Tanks | T-80BVM | ~500 active | Gas turbine; modernized ERA; Arctic-capable |
| Army — Tanks | T-90M Proryv | ~400+ active; main new build | Gen 4; Shtora APS; 125mm autoloader |
| Army — Tanks | T-14 Armata | ~20 prototypes; mass production stalled | Gen 5 design; unmanned turret; active protection |
| Army — IFV | BMP-3 | ~700+ | Gen 4; 100mm gun + ATGM |
| Army — Artillery | 2S19 Msta-S (152mm) | ~1,000 | Self-propelled; workhorse of Russian artillery |
| Army — Artillery | Tornado-G/S MLRS | ~200+ | 300mm long-range rocket; GPS-guided |
| Navy — Submarines (nuclear SSBN) | Borei-class (955/A) | 5 commissioned; 3 building | 8 Bulava SLBMs; modern; replaces Delta |
| Navy — Submarines (nuclear SSBN) | Delta IV-class | 6 remaining | 16 Sineva/Liner SLBMs; aging |
| Navy — Submarines (nuclear SSN/SSGN) | Yasen-M class | 3 commissioned; 6 building | Modern; Kalibr + Oniks + Zircon capable |
| Navy — Submarines (nuclear SSN) | Akula/Shchuka-B class | ~7 active | Aging; maintenance-intensive |
| Navy — Surface | Kirov-class (nuclear CGN) | 1 active (Pyotr Velikiy); 1 refit | Massive; P-700 Granit ASMs; nuclear powerplant |
| Navy — Surface | Slava-class CG | 3 (Moskva sunk 2022) | P-1000 Vulkan; S-300F; Varyag + Marshal Ustinov |
| Navy — Surface | Grigorovich/Gorshkov FFG | ~10 | Kalibr + Oniks capable; modern |
| Missiles — Cruise | Kh-101/102 (air-launched) | ~500–800 stockpile pre-war | 2,500+ km range; nuclear-capable Kh-102 |
| Missiles — Cruise | 3M-14 Kalibr (sea-launched) | Ongoing production | 1,500 km range; extensively used Ukraine |
| Missiles — Hypersonic | Zircon 3M22 | IOC 2023; Yasen deployment | Mach 8+; anti-ship/land attack |
| Missiles — Hypersonic | Kh-47M2 Kinzhal | Operational (MiG-31K) | Mach 10+ claimed; ballistic |
| Missiles — Ballistic (ICBM) | RS-28 Sarmat | Initial deployment 2023; 46 planned | 100-tonne; MIRVed; global range; replaces SS-18 |
| Missiles — Ballistic (ICBM) | Yars RS-24 / Topol-M | ~200 deployed combined | Mobile + silo; MIRVed; 10,500 km |
| Nuclear | Total stockpile | ~5,900 warheads (~1,500 deployed) | Largest arsenal globally; modernization ~70% complete |

**CHINA**

| **Branch** | **Key Equipment** | **Quantity (approx)** | **Generation / Notes** |
| --- | --- | --- | --- |
| PLAAF — Fighters | J-20 Mighty Dragon | ~200+ (growing rapidly) | Gen 5; AESA; WS-10/15 engines; single-seat |
| PLAAF — Fighters | J-16 | ~250+ | Gen 4+; Su-30 derivative; multi-role strike |
| PLAAF — Fighters | J-10C | ~350+ | Gen 4+; AESA; domestic WS-10B engine |
| PLAAF — Fighters | J-11B/D (Su-27 derivative) | ~300+ | Gen 4; domestic copy of Su-27 |
| PLAAF — Bombers | H-6K/J/N | ~200 | Tu-16 derivative; nuclear; CJ-10 cruise missiles; H-6N air-refueling capable |
| PLAAF — UAV | CH-4/5, Wing Loong II, GJ-11 (stealth) | Hundreds; export dominant | Growing UCAV fleet; GJ-11 stealth attack UAV |
| PLA Army — Tanks | Type 99A | ~400+ | Gen 4+; 125mm; autoloader; active protection |
| PLA Army — Tanks | Type 96A/B | ~2,500+ | Gen 4; modernized; main bulk of tank fleet |
| PLA Army — IFV | Type 04A / ZBD-04A | ~600+ | Gen 4; IFV; amphibious variants |
| PLA Army — Rockets | PHL-03 / PCL-191 MLRS | Hundreds | 300mm long-range; GPS/INS guided |
| PLAN — Aircraft Carriers | Liaoning (CV-16) | Active | Refurbished Kuznetsov-class; STOBAR; J-15 |
| PLAN — Aircraft Carriers | Shandong (CV-17) | Active | Domestic build; STOBAR; J-15/J-35 capable |
| PLAN — Aircraft Carriers | Fujian (CV-18) | Sea trials ~2023 | CATOBAR; EMALS; J-35 stealth fighters |
| PLAN — Destroyers | Type 055 (Renhai) CG | 8 commissioned; building | 12,000t; world's largest surface combatant new-build; YJ-18 + HHQ-9B |
| PLAN — Destroyers | Type 052D (Luyang III) | ~25 | 4,500t; HHQ-9; YJ-18; vertical launch |
| PLAN — Submarines (SSBN) | Type 094/094A Jin-class | 6 | 12 JL-2/3 SLBMs; 7,000–12,000 km range |
| PLAN — Submarines (SSN) | Type 093A/B Shang-class | ~9 | YJ-18; growing fleet |
| PLAN — Submarines (SSK) | Type 039B/C Yuan-class | ~20+ | AIP; conventional; export version popular |
| Missiles — Anti-ship | YJ-18 (ship + sub launch) | Large inventory | 540 km range; supersonic terminal |
| Missiles — Anti-ship | DF-21D ASBM | ~80–100 missiles | 1,500+ km range; carrier-killer; first ASBM in history |
| Missiles — Anti-ship | DF-26 ASBM/IRBM | ~200 | 4,000 km range; nuclear/conventional dual-role |
| Missiles — Ballistic (ICBM) | DF-5B (silo) | ~20 | MIRVed; 13,000 km; older design |
| Missiles — Ballistic (ICBM) | DF-41 | ~100 missiles; rapid expansion | Mobile + silo; MIRVed up to 10 RVs; 14,000+ km |
| Missiles — Ballistic (ICBM) | DF-31AG | ~80 | Mobile; single RV; solid fuel |
| Missiles — Hypersonic | DF-17 HGV | ~40+ launchers | Mach 5–10; HGV glider; 1,800 km range |
| Missiles — Cruise | CJ-10 / DF-10 (air/land) | Large inventory | 1,500 km range; terrain-following |
| Nuclear | Total stockpile | ~500 (2023); expanding rapidly toward 1,000+ | SIPRI: fastest nuclear expansion globally; DF-41 + JL-3 primary |

**INDIA**

| **Branch** | **Key Equipment** | **Quantity** | **Notes** |
| --- | --- | --- | --- |
| IAF — Fighters | Su-30MKI | ~260 | Gen 4+; BrahMos-A capable; modernization ongoing |
| IAF — Fighters | Rafale | 36 | Gen 4+ French; SPECTRA EW; Meteor BVR missile |
| IAF — Fighters | Tejas Mk1A | 83 ordered; ~40 delivered | Domestic Gen 4; AESA radar; DRDO developed |
| IAF — Fighters | MiG-29 (upgraded) | ~50 | Gen 4; limited life |
| IAF — Strike | Mirage 2000H/I (upgraded) | ~50 | Nuclear delivery capable |
| Indian Army — Tanks | T-90S/MS Bhishma | ~1,500 | Licensed Russian; major backbone |
| Indian Army — Tanks | Arjun Mk1A | ~200 | Domestic design; Kanchan composite armor |
| Indian Navy — Carriers | INS Vikrant (IAC-1) | Commissioned 2022 | Domestic STOBAR; MiG-29K; 45,000t |
| Indian Navy — Carriers | INS Vikramaditya (ex-Gorshkov) | Active | Refurbished Kuznetsov-class; MiG-29K |
| Indian Navy — Submarines (SSN) | INS Arihant (SSBN), INS Arighaat | 2 operational; 2 building | 12 K-15 or 4 K-4 SLBMs; indigenous |
| Indian Navy — Submarines (SSK) | Kalvari class (Scorpene) | 6 commissioned | French design; AIP retrofit planned |
| Missiles — Cruise | BrahMos (land/sea/air) | Large inventory; ongoing production | 900 km range (Block III); Mach 2.8; joint India-Russia |
| Missiles — Ballistic | Agni-V ICBM | ~15–20 tested; operational ~2024 | ~5,500 km+ range; MIRVed version in development |
| Missiles — Ballistic | Agni-IV IRBM | ~15 | 3,500–4,000 km range; road-mobile |
| Nuclear | Estimated stockpile | ~160–170 warheads | No-First-Use doctrine; minimal deterrence posture |

**PAKISTAN**

| **Branch** | **Key Equipment** | **Quantity** | **Notes** |
| --- | --- | --- | --- |
| PAF — Fighters | JF-17 Thunder Block I/II/III | ~150 operational | China-Pakistan joint; AESA on Block III; primary fighter |
| PAF — Fighters | F-16 C/D Block 52 | ~60 | US-supplied; AMRAAM capable; political conditions on use |
| PAF — Fighters | J-10C | ~25 (first order) | Chinese Gen 4+; PL-15 BVR capable |
| PAF — Fighters | Mirage IIIEP/5PA (upgraded) | ~100 | Aging but nuclear delivery capable |
| Army — Tanks | Al-Khalid (MBT-2000) / Al-Khalid-I | ~500 | Chinese origin (Type 90-II derivative); domestic production |
| Army — Tanks | T-80UD | ~300+ | Ukrainian-origin; upgrades ongoing |
| Army — Tanks | Type 85-IIM | ~300 | Older Chinese design |
| Army — Rockets | A-100 / WS-2 MLRS | Several dozen | Chinese-supplied 300mm; 100–400 km range |
| Navy — Submarines | Agosta 90B (Khalid class) | 3 + AIP | French design; Mesma AIP |
| Navy — Submarines | Hangor-class (Type 039B) | 8 on order from China | AIP; delivery from ~2023–2028 |
| Missiles — Ballistic | Shaheen-III MRBM | ~50+ | 2,750 km range; solid fuel; nuclear |
| Missiles — Ballistic | Shaheen-II MRBM | ~100+ | 2,000 km range |
| Missiles — Cruise | Babur-III (SLCM) | Development stage | 450 km sea-launched; nuclear |
| Missiles — Tactical Nuclear | Nasr (SRBM) | ~150+ | 60 km range; battlefield nuclear |
| Nuclear | Estimated stockpile | ~170 warheads | Fastest-growing nuclear arsenal per SIPRI; full-spectrum deterrence |

**KEY REGIONAL POWERS — Summary Inventories**

The following provides condensed force structure data for all major secondary powers. For full detail, use The Military Balance (IISS) as the authoritative source.

| **Nation** | **Army Strength** | **Key Land Systems** | **Air Force** | **Key Aircraft** | **Navy** | **Key Vessels** | **Nuclear Status** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| France | 117k active | Leclerc MBT (222), VBCI IFV (630+) | 41k; ~200 combat acft | Rafale (~140 FASV+Mari), Mirage 2000D | Active blue-water | PA CDG (carrier), 6 SSBN, 6 SSN, 11 frigates | ~290 warheads; SSBN + ASMP-A air |
| UK | 79k active | Challenger 2 (~230 active), Warrior IFV (~500) | 34k; ~150 combat acft | Typhoon (~160), F-35B (~40+) | Active blue-water | QE/POW carriers, 4 SSBN, 7 SSN, 19 frigates/destroyers | ~225 warheads; Trident II SSBN |
| Germany | 170k active | Leopard 2A7 (~300 active; 400+ total), Puma IFV | 27k; ~130 combat acft | Typhoon (~130), Tornado (~50 retiring) | Baltic/coastal | F125 frigates (4), K130 corvettes (6) | None (NATO umbrella) |
| Israel | 170k active; 470k reserve | Merkava IV (700+), Trophy APS | 34k; ~460 combat acft | F-35I Adir (~36+), F-15I Ra'am (~25), F-16I (~175) | Coastal+subs | Sa'ar 6 corvettes (4), Dolphin-class SSK (5+) | Undeclared ~90 warheads; Jericho III ICBM capable; Dolphin SLCM capable |
| Saudi Arabia | 257k active | M1A2S Abrams (400+), M2 Bradley | 20k; ~350+ combat acft | F-15SA (~80 new), Typhoon (~72), F-15C/D (~100) | Coastal | Al Riyadh frigates (3), Badr corvettes (4), 3 subs planned | None; alleged interest in Pakistani warheads if Iran goes nuclear |
| Iran | 350k active | T-72S/T-54/55/62; Karrar domestic tank | 37k; ~200+ combat acft (aging) | Su-24MK, MiG-29, F-14A Tomcat (aging), Kowsar domestic | Coastal/A2AD | 3 Kilo SSK, fast-attack boats (hundreds), anti-ship mines | No declared weapons; 60–90% enrichment capability; suspected threshold state |
| Turkey | 355k active | Leopard 2A4/NG, M60T MERDI, Altay (prototypes) | 60k; ~240 combat acft | F-16C/D (~230 active), F-35 (removed 2019) | Regional | Preveze SSK (4+), Ada corvettes (4), Type 214 SSK (building) | None (NATO) |
| South Korea | 500k active | K2 Black Panther (260), K1A2 (900+), T-80U (170) | 65k; ~400+ combat acft | F-35A (~40+), F-15K (~60), KF-21 Boramae (dev) | Regional | Sejong Daewang DDGs (3), KDX-II destroyers (6), Son Won-il SSK (9) | None; latent capability; civilian enrichment |
| Japan | 240k JSDF | Type 10 MBT (150), Type 90 (300+), Type 89 IFV | 47k; ~280 combat acft | F-35A/B (~100 ordered/delivering), F-15J (~200), F-2 (~90) | Regional blue-water | DDH Kaga/Izumo (F-35B capable), 8 Atago/Kongo DDG, 22 SSK | None; latent capability; significant plutonium stockpile |
| North Korea | 1.2m active | T-62/72/P'okpung-ho domestic (~4,000) | 110k; ~800 acft (aging) | MiG-29, MiG-21, Su-25; many non-combat-ready | Coastal | Romeo/Sinpo SSK (70+); many aging/limited range | ~40–50 warheads (est.); Hwasong-17 ICBM (14,000+ km claimed); Hwasong-11 SRBM |
| Taiwan | 165k active | CM-11/12 (M60T derivative, 400+), M60A3 (200+) | 45k; ~300+ combat acft | F-16V (~140+), Mirage 2000-5 (~55), F-CK-1 (~130) | Regional | Kee Lung DDGs (4, ex-Kidd), Cheng Kung FFG (8), Hai Lung SSK (2) | None; civilian nuclear but no weapons program |
| Brazil | 220k active | Leopard 1A5BR, M60A3, EE-9 Cascavel | 68k; ~150 combat acft | Gripen E (~28 delivering), F-5M (~50), A-29 Super Tucano | Regional | NAe Atlântico (carrier, ex-Colossus), Riachuelo SSK (Scorpene, 1+) | None; NPT signatory; civilian enrichment program |
| Egypt | 440k active | M1A1 Abrams (~1,130), T-62/55 (~1,000) | 30k; ~600 combat acft | Rafale (~30), F-16C/D (~200+), MiG-29 (~46) | Regional | FREMM frigates (2), MEKO-200 frigates (4), Type 209 SSK (4) | None |
| Nigeria | 135k active | T-72AV (~100), Vickers Mk3 (~70) | 12k; ~50 combat acft | JF-17 (12 ordered), Alpha Jet, L-39 | Coastal | NNS Thunder OPV, 1 frigate | None |
| Indonesia | 400k active | Leopard 2RI (~100), AMX-13 (~300) | 34k; ~90 combat acft | Rafale (~42 ordered), Su-27/30 (~11), F-16C/D (~33) | Regional | SIGMA corvettes (4), KRI Nagapasa SSK (Changbogo, 3) | None |

# **PART III — Nuclear Capabilities**

## **3.1 Global Nuclear Inventory**

The following table reflects best estimates from FAS, SIPRI, NTI, and Bulletin of the Atomic Scientists as of 2023–2024. These seed Aetherion's nuclear lifecycle system and MAD Engine.

| **Nation** | **Total Warheads** | **Deployed Warheads** | **ICBM** | **SLBM / SSBN** | **Air-Delivered** | **Tactical** | **Status** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| USA | ~5,550 | ~1,700 | 400 Minuteman III | ~1,150 (14 Ohio SSBN) | ~300 (B61/B83) | ~200 (B61-3/4) | Full triad; START treaty compliant |
| Russia | ~5,900 | ~1,550 | 310 (Yars, DF-5 equiv, Sarmat) | ~1,600 (11 SSBN) | ~200 (Tu-95/160) | ~1,900 (est.) | Largest arsenal; modernization ~70% complete |
| China | ~500 (growing) | ~350 (est.) | ~100 DF-41; ~20 DF-5B; ~80 DF-31AG | ~72 (6 Jin SSBN) | ~20 H-6N capable | ~100–200 tactical est. | Fastest expansion; estimated 1,000+ by 2030 |
| France | ~290 | ~280 deployed | None (retired) | ~240 (4 SSBN Triomphant) | ~50 ASMP-A (Rafale/Mirage) | None | Dyad; independent from NATO command |
| UK | ~225 | ~120 deployed | None | ~120 (4 Vanguard SSBN, Trident II) | None (retired) | None (retired) | Monad (SSBN only); NPT Article VI commitments |
| Pakistan | ~170 | ~90 est. deployed | ~50 Shaheen-III (2,750km) | None (Babur III in dev) | ~50 Ra'ad (Mirage/JF-17) | ~30–50 Nasr | Full-spectrum deterrence; fastest growing globally |
| India | ~160–170 | ~90 est. deployed | ~15–20 Agni-V (5,500km+) | K-15/K-4 (2 Arihant SSBN) | ~50 Mirage/Jaguar | None (doctrine) | Triad; No First Use doctrine |
| Israel | ~90 (undeclared) | Unknown deployment | Jericho III (11,500km capable) | Dolphin SSK (cruise missiles) | F-35I/F-15I capable | Alleged | Undeclared; nuclear ambiguity policy; no NPT membership |
| North Korea | ~40–50 | Unknown | Hwasong-17 (~15,000 km claimed) | Sinpo SSBN (1 prototype) | Unknown | Hwasong-11 (600 km) | Operational; treaty-defiant; ongoing development |

## **3.2 Nuclear Delivery System Specifications**

| **System** | **Nation** | **Range** | **Yield** | **Delivery Mode** | **Aetherion Generation** |
| --- | --- | --- | --- | --- | --- |
| Minuteman III | USA | 13,000 km | 300–475 kT | Silo-launched ICBM | Gen 4 (mature; being replaced) |
| Trident II D5 | USA / UK | 12,000 km | 100–475 kT (MIRV) | SLBM (Ohio/Vanguard SSBN) | Gen 5 (active; modernized) |
| LGM-35A Sentinel | USA | 13,000 km | 300 kT (est.) | Silo ICBM; Minuteman replacement | Gen 6 (development) |
| RS-28 Sarmat | Russia | 18,000 km | 50–800 kT (MIRV up to 15 RVs) | Silo ICBM; 'Satan 2' | Gen 5 (new; limited deployment) |
| RS-24 Yars | Russia | 10,500 km | 300 kT × 3–4 RVs | Mobile/silo ICBM | Gen 4+ |
| Bulava RSM-56 | Russia | 10,000 km | 100–150 kT × 6 RVs | SLBM (Borei SSBN) | Gen 5 |
| DF-41 | China | 14,000+ km | 250–300 kT × up to 10 MIRVs | Mobile/silo ICBM | Gen 5 |
| DF-5B | China | 13,000 km | 4–5 MT or MIRVed | Silo ICBM | Gen 4 |
| JL-3 | China | 10,000+ km | Unknown (MIRVed est.) | SLBM (Type 096 SSBN planned) | Gen 5 (development) |
| DF-26 | China | 4,000 km | 200–300 kT or conventional | Mobile IRBM/ASBM | Gen 4+ (dual-use) |
| M51 | France | 10,000 km | 100 kT TN75 × 6 RVs | SLBM (Triomphant SSBN) | Gen 4+ |
| ASMP-A | France | 500 km | 300 kT TNA | Air-launched standoff; Rafale/Mirage 2000N | Gen 4+ |
| Agni-V | India | 5,500+ km | 200–300 kT (est.) | Mobile silo ICBM (road) | Gen 4 |
| Shaheen-III | Pakistan | 2,750 km | 50–300 kT (est.) | Mobile MRBM | Gen 4 |
| Nasr | Pakistan | 60 km | <20 kT (tactical) | Mobile SRBM | Gen 4 (tactical) |
| Hwasong-17 | N. Korea | 15,000 km (claimed) | Unknown; probably 200+ kT | Mobile ICBM; MaRV/MIRV tested | Gen 4+ |
| Jericho III | Israel | 11,500 km (est.) | 200 kT–1 MT (est.) | Silo + mobile ICBM | Gen 4+ (undeclared) |

# **PART IV — Industrial & Defense Production Capacity**

## **4.1 Defense Industry Tier Classification**

Aetherion's Defense Industrial Complex (Tier 6 in the industrial registry) and Reverse Engineering systems are seeded from real-world defense production capability. The following tiers define each nation's independent production ability:

| **Tier** | **Definition** | **Nations (examples)** | **Can Produce Independently** |
| --- | --- | --- | --- |
| DI-1 — Full Spectrum | Can design and produce all major platform categories without import | USA, Russia, China, France, UK | ICBMs, aircraft carriers, 5th-gen fighters, SSBNs, advanced EW |
| DI-2 — Near Full | All major categories; some components imported | India, Germany, Israel, Sweden, Japan, S. Korea, Italy | MBTs, fighters, frigates, cruise missiles; ICBM/carrier with difficulty |
| DI-3 — Advanced Partial | Advanced domestics in 2–3 categories; rest imported | Turkey, Brazil, Pakistan, Ukraine, Netherlands, Spain, Australia | Fighters (license), warships, some missiles; no ICBMs independently |
| DI-4 — Intermediate | Light weapons, vehicles, some aircraft components; major platforms imported | Indonesia, Egypt, Iran, Saudi Arabia, Poland, Czechia, Romania | Small arms, APCs, drones; fighters/tanks via license or import |
| DI-5 — Basic | Small arms, munitions, light vehicles only | Most of Africa, SE Asia, Central America, Balkans | Rifles, ammo, trucks; all combat platforms imported |
| DI-0 — Import Only | No significant defense production; entirely import-dependent | Gulf micro-states, island nations, landlocked mini-states | Nothing; total EULA dependency |

## **4.2 Key Defense Industrial Facilities by Nation**

**United States — Major Defense Facilities**

| **Company / Facility** | **Location** | **Products** | **Aetherion Factory Type** |
| --- | --- | --- | --- |
| Lockheed Martin — Fort Worth TX | Texas | F-35 (final assembly; 180+/yr) | Aerospace — Gen 5 |
| Boeing Defense — St. Louis MO | Missouri | F-15EX, B-21 (partial), Apache | Aerospace — Gen 4+ |
| Northrop Grumman — Palmdale CA | California | B-21 Raider (primary); RQ-4 Global Hawk | Aerospace — Gen 5/6 |
| Raytheon — Tucson AZ | Arizona | Tomahawk, AMRAAM, Patriot, SM-3/6 | Missile — Gen 5 |
| General Dynamics — Lima OH | Ohio | M1A2 Abrams (primary US plant; ~45/yr) | Armor — Gen 4+ |
| Bath Iron Works — Bath ME | Maine | Arleigh Burke-class destroyers | Naval — Gen 5 |
| Newport News Shipbuilding — VA | Virginia | Aircraft carriers (CVN), Virginia SSN | Naval — Gen 5 |
| Electric Boat — Groton CT | Connecticut | Virginia SSN, Columbia SSBN | Naval — Gen 5/6 |
| Huntington Ingalls — Pascagoula MS | Mississippi | LHA/LHD, destroyers (alternate) | Naval — Gen 4+ |

**Russia — Major Defense Facilities**

| **Facility** | **Location** | **Products** | **Aetherion Factory Type** |
| --- | --- | --- | --- |
| KnAAPO Sukhoi — Komsomolsk-on-Amur | Far East | Su-35S, Su-57 (primary); Su-30/34 | Aerospace — Gen 5 |
| NAPO — Novosibirsk | Siberia | Su-34 Fullback (primary) | Aerospace — Gen 4+ |
| RSK MiG — Lukhovitsy | Moscow region | MiG-29/35; MiG-31 MRO | Aerospace — Gen 4 |
| UVZ — Nizhny Tagil | Urals | T-72B3, T-90M primary production; T-14 Armata | Armor — Gen 4+ |
| Splav / Technodinamika | Tula | Tornado MLRS, BM-21 Grad rockets | Artillery |
| Votkinsk Machine Plant | Udmurtia | Iskander, Yars ICBM, Bulava SLBM, Kalibr | Missile — Gen 5 |
| Sevmash — Severodvinsk | Arkhangelsk | Borei SSBN, Yasen SSN (primary) | Naval — Gen 5 |
| Admiralty Shipyard — St Petersburg | St Petersburg | SSK, frigates | Naval — Gen 4+ |
| ORKK / Progress — Samara | Samara | Soyuz boosters; satellite launch | Space — Gen 4+ |

**China — Major Defense Facilities**

| **Facility** | **Location** | **Products** | **Aetherion Factory Type** |
| --- | --- | --- | --- |
| AVIC CAC — Chengdu | Sichuan | J-20 (primary), J-10C | Aerospace — Gen 5 |
| AVIC SAC — Shenyang | Liaoning | J-11/16, J-35 (naval), FC-31 export | Aerospace — Gen 4+/5 |
| AVIC XAC — Xi'an | Shaanxi | H-6K/N bomber, Y-20 transport | Aerospace — Gen 4+ |
| NORINCO — Inner Mongolia / Baotou | Inner Mongolia | Type 99A, Type 96A tank | Armor — Gen 4+ |
| CSGC / CASIC — Beijing | Beijing | DF-17, DF-21D, YJ-series; Beidou | Missile — Gen 5 |
| CASC — Beijing/Xi'an | Multiple | DF-41, DF-5B ICBMs, Long March rockets | Missile — Gen 5/ICBM |
| CSSC Jiangnan — Shanghai | Shanghai | Type 055 Destroyer (Renhai) | Naval — Gen 5 |
| CSSC Huludao (Bohai) | Liaoning | Type 094 SSBN, Type 093 SSN | Naval — Gen 5 |
| COMAC — Shanghai | Shanghai | C919, C929; civilian dual-use | Aerospace Civil |

## **4.3 Semiconductor & Advanced Electronics Capacity**

Semiconductor fabrication capability is the single most critical industrial chokepoint in Aetherion. Without domestic fab capacity, nations cannot produce Gen 4+ avionics, missile guidance, AESA radars, or EW systems. The following seeds the Tier 4 industrial slot data:

| **Nation / Company** | **Best Domestic Node (2023)** | **Key Products** | **Dependency** |
| --- | --- | --- | --- |
| TSMC (Taiwan) | 2nm / 3nm (production) | ~90% of world's advanced chips (A17, H100, etc.) | Exports to all nations; extreme single-point-of-failure |
| Samsung (South Korea) | 3nm / 4nm | Memory (DRAM, NAND) + logic | Second source for advanced logic |
| Intel (USA) | Intel 4 (7nm equiv) | CPUs; rebuilding with IFS foundry | Lagging TSMC; catching up via CHIPS Act |
| GlobalFoundries (USA/DE/SG) | 12nm | Specialty chips: aerospace, defense, auto | US gov defense chips sole-source for some systems |
| SMIC (China) | 7nm demonstrated (limited); 14nm production | Domestic consumer/auto/military; EUV blocked | Restricted by US export controls; no EUV access |
| Micron (USA) | 1-beta DRAM | Memory; critical for all computing systems | Memory supply chain sole-source risk |
| SK Hynix (S. Korea) | 1a DRAM / 238L NAND | Memory dominant | Same cluster risk as Samsung/TSMC |
| ASML (Netherlands) | EUV lithography machines | Machines that make chips — monopoly | Export-controlled to China/Russia; critical chokepoint |
| Elpida / Japan Chipmakers | 40nm+ (legacy) | Mature nodes; automotive, industrial | Not leading edge |
| India (TATA/Micron JV) | 28nm (under construction 2023–26) | Entry-level; government-backed | Nascent; not yet significant |

**NOTE:** *Primary data source: SEMI World Fab Watch, SIA Semiconductor Industry Data, IC Insights. Chip industry data is commercial but SIA publishes free annual summaries. The importance of ASML monopoly on EUV machines cannot be overstated — this is the single most important chokepoint in the game.*

## **4.4 GDP, Defense Budget & Economic Tier — All Nations**

The following seeds the Nation Schema economic fields and AI utility weights for all major nations. Source: World Bank GDP data + SIPRI Military Expenditure Database (both free at their respective websites).

| **Nation** | **GDP (bn USD, ~2023)** | **Defense Budget (bn USD)** | **% GDP Defense** | **Credit Rating (S&P)** | **Aetherion Econ Tier** |
| --- | --- | --- | --- | --- | --- |
| USA | 27,360 | 886 | 3.3% | AA+ | 5 — Superpower |
| China | 17,700 | 224 | 1.3% | A+ | 5 — Superpower |
| Germany | 4,430 | 66 | 1.5% | AAA | 4 — Major |
| Japan | 4,230 | 51 | 1.2% | A+ | 4 — Major |
| India | 3,730 | 81 | 2.2% | BBB- | 4 — Major |
| UK | 3,080 | 68 | 2.2% | AA | 4 — Major |
| France | 2,920 | 60 | 2.1% | AA- | 4 — Major |
| Russia | 1,860 (est.) | 109 | 5.9% | Not rated (sanctions) | 3 — Regional |
| South Korea | 1,710 | 50 | 2.9% | AA | 3 — Regional |
| Brazil | 1,920 | 20 | 1.1% | BB- | 3 — Regional |
| Australia | 1,690 | 32 | 1.9% | AAA | 3 — Regional |
| Saudi Arabia | 1,060 | 75 | 7.1% | A+ | 3 — Regional |
| Turkey | 1,100 | 21 | 1.9% | B+ | 3 — Regional |
| Israel | 522 | 23 | 4.5% | A+ | 3 — Regional |
| Poland | 690 | 24 | 3.5% | A- | 2 — Secondary |
| Iran | 366 (est.) | 10 (est.) | 2.8% | Not rated | 2 — Secondary |
| Pakistan | 341 | 9 | 2.6% | CCC | 2 — Secondary |
| Indonesia | 1,370 | 9 | 0.7% | BBB | 2 — Secondary |
| Nigeria | 477 | 3.5 | 0.7% | B- | 2 — Secondary |
| Egypt | 404 | 4.6 | 1.2% | B | 2 — Secondary |
| Ukraine | 148 (war-impacted) | 35 (NATO-supplemented) | 23% (war) | CCC | 2 — Secondary (war) |
| North Korea | 17–20 (est.) | ~4 (est.) | ~20%+ est. | Not rated | 1 — Minor |
| Venezuela | 97 (collapsed) | 1.5 | 1.5% | SD (default) | 1 — Minor |

**NOTE:** *All figures are approximate. Use World Bank Open Data (data.worldbank.org) and SIPRI (sipri.org/databases/milex) for precise, annually updated figures. Both are free.*

# **PART V — Global Arms Trade Flows**

## **5.1 Major Arms Exporters**

These nations seed the Arms Market seller\_threshold and EULA dependency systems. Data from SIPRI Arms Transfers Database (free at sipri.org/databases/armstransfers):

| **Rank** | **Exporter** | **% Global Arms Exports (2019–23)** | **Key Export Systems** | **Primary Markets** |
| --- | --- | --- | --- | --- |
| 1 | United States | 42% | F-35, F-16, AH-64, M1A2, Patriot, Harpoon, Tomahawk | Israel, Saudi Arabia, Japan, Australia, South Korea, UAE, Poland |
| 2 | France | 11% | Rafale, Scorpene SSK, Mistral LCVP, Mirage, MBDA missiles | India, Egypt, Greece, Indonesia, UAE, Qatar |
| 3 | Russia | 11% (declining) | Su-30, MiG-29, S-300/400, T-90, Kilo SSK, Kalibr | India, China, Algeria, Vietnam, Egypt (declining post-Ukraine) |
| 4 | South Korea | 6% | K2 Black Panther, K9 Thunder SPH, FA-50, Chunmoo MLRS | Poland, Australia, UAE, Egypt, Norway |
| 5 | China | 5.8% | JF-17, J-10C, Type 039 SSK, HQ-9, PHL-03, UAVs (Wing Loong) | Pakistan, Bangladesh, Thailand, Algeria, Nigeria, Serbia, Myanmar |
| 6 | Germany | 5.6% | Leopard 2, F125 frigate, submarines (Type 212), EuroFighter (via partner) | Greece, Hungary, Norway, Indonesia, Israel |
| 7 | Italy | 4.8% | FREMM frigates, Eurofighter (partner), Beretta/Leonardo systems | Egypt, Qatar, India, Kuwait, UAE |
| 8 | UK | 4.1% | Eurofighter Typhoon (partner), Hawk trainer, Type 26 (Australia/Canada) | Saudi Arabia, India, Qatar, Kuwait, Indonesia |
| 9 | Spain | 3.1% | A400M (partner), S-80 submarine, corvettes, Eurofighter (partner) | Saudi Arabia, Australia, Turkey, Malaysia |
| 10 | Israel | 2.9% | Hermes UAV, Iron Dome, Arrow, Barak-8, Elbit EW systems, Spike ATGM | India, USA (Iron Dome tech), Singapore, Azerbaijan, Greece |

## **5.2 Key EULA Dependency Examples — Seeding the Arms Market**

These real-world cases directly inform how the EULA enforcement system works in Aetherion:

| **Buyer** | **Seller** | **Hardware** | **EULA Control Exercised** | **Game Mechanic** |
| --- | --- | --- | --- | --- |
| Pakistan | USA | F-16 C/D Block 52 | USA requires pre-approval for missions; intelligence/software updates conditional | USA can suspend F-16 operations via remote code update; Pakistan must seek alternative |
| India | Russia | Su-30MKI, T-90 | Spare parts dependency; engine overhaul at Russian facilities | Russia parts embargo → readiness -30% per year; India-Russia alignment crucial |
| Saudi Arabia | USA | F-15SA, THAAD, Patriot | Conditional on no use against certain targets; software license retained | USA can restrict targeting data; Patriot interception capability degraded |
| Turkey | Russia | S-400 Triumf | Russia retains data-link codes; integration with NATO systems blocked | Turkey can't integrate S-400 with NATO IADS; Russia kills codes = air defense black |
| South Korea | USA | F-35A, PAC-3 | OPLAN integration shared with USA; wartime command issues | US approval required for certain strike packages; operational autonomy limited |
| Australia | USA | F-35A, Virginia SSN (AUKUS) | ITAR rules; technology transfer restrictions; joint operational concepts | Some F-35 subsystems not fully transferred; ITAR limits modification |
| Egypt | Russia + USA | MiG-29, F-16 | Both sellers impose restrictions; dual dependency | Both Russia and USA can squeeze Egypt; aligned with neither = high vulnerability |
| Taiwan | USA | F-16V, Patriot, Harpoon | Sold under TRA; not a treaty ally; supply contingent on political decision | USA congressional vote required for additional sales; crisis can cut resupply |
| Iran | Russia (via N. Korea proxy) | Shahed-136 (reversed from Russian design link) | None — deniable supply chain | Grey-zone arms route; detection → sanctions on intermediaries |

# **PART VI — AI DNA Matrix Seed Data**

## **6.1 Nation Archetype Classification**

Each nation in Aetherion is initialized with an AI archetype that seeds its utility weight distribution. The following table provides archetype recommendations based on real-world strategic behavior:

| **Archetype** | **Description** | **Utility Weight Profile** | **Real-World Examples** |
| --- | --- | --- | --- |
| HEGEMON | Seeks to maintain global/regional dominance; intervenes worldwide; high standing weight | Military 0.3, Standing 0.3, Economic 0.2, Stability 0.2 | USA, China (aspirant) |
| REVISIONIST | Actively seeks to change current world order; high grievance and expansion weight | Expansion 0.35, Grievance 0.30, Military 0.25, Economic 0.10 | Russia, Iran, N. Korea |
| BALANCER | Prevents any single power from dominating; shifts alliances strategically | Standing 0.35, Military 0.25, Economic 0.25, Stability 0.15 | France, India, Turkey, Brazil |
| FORTRESS | Defense-oriented; high military and stability; resists external influence | Military 0.35, Stability 0.35, Economic 0.20, Standing 0.10 | Israel, South Korea, Taiwan, Switzerland |
| MERCHANT | Trade-maximizing; avoids conflict; high economic weight; uses soft power | Economic 0.50, Standing 0.30, Stability 0.15, Military 0.05 | Germany, Japan, UAE, Singapore, Netherlands |
| PATRON | Provides military/economic aid to smaller states; seeks spheres of influence | Standing 0.35, Expansion 0.25, Economic 0.25, Military 0.15 | Russia, China, USA, Saudi Arabia, Iran |
| CLIENT | Dependent on patron; follows patron's lead; vulnerable to pressure | Stability 0.40, Economic 0.35, Military 0.15, Standing 0.10 | Belarus, North Korea, Cuba, smaller Gulf states |
| NON-ALIGNED | Avoids bloc alignment; maximizes economic ties with all parties | Economic 0.45, Stability 0.30, Standing 0.15, Military 0.10 | Indonesia, Vietnam, India (historically), Egypt |
| MILITANT NATIONALIST | Ethno-nationalist agenda; territorial claims; domestic legitimacy via conflict | Expansion 0.40, Grievance 0.35, Military 0.15, Stability 0.10 | Serbia (1990s), historical examples; some current states |
| THEOCRATIC | Religious law governs decisions; promotes ideology externally; resistant to material incentives | Stability 0.35, Grievance 0.30, Expansion 0.20, Economic 0.15 | Iran (clerical), Saudi Arabia (partial) |

## **6.2 Epochal Memory Seeds — Pre-Loaded Traumas**

The history.json file seeds the Epochal Memory for all nations at game start. These permanent modifiers ensure realistic AI behavior from day one without requiring centuries of in-game time to generate them. A representative selection:

| **Nation Pair** | **Epochal Event** | **Memory Type** | **Threat Multiplier Seed** | **Notes** |
| --- | --- | --- | --- | --- |
| India — Pakistan | Partition 1947; 4 wars (1947, 1965, 1971, 1999) | Permanent mutual threat | 3.0× military escalation bias | Kashmir dispute active; nuclear shadow permanent |
| China — Taiwan | Civil War 1949; One China claim | Reunification mandate for China | 3.5× for China toward Taiwan sovereignty challenge | Any Taiwan independence move = existential trigger |
| Israel — Arab neighbors | 1948, 1967, 1973 wars; ongoing conflicts | Existential threat memory (Israel); humiliation (Arab) | 2.5× for Israel; 2.0× for Egypt/Syria/Jordan | Abraham Accords creates partial fluid override for UAE/Bahrain |
| USA — Russia | Cold War; Cuban Missile Crisis; proxy wars | Superpower rivalry | 2.0× nuclear escalation caution; 1.8× bloc competition | Post-Cold War partial decay but Epochal remains |
| Germany — France | Franco-Prussian War; WWI; WWII (French invasion) | Epochal trauma (France toward German militarism) | 1.5× (now overridden by EU integration Fluid Memory) | EU membership creates strong positive fluid override |
| Russia — Germany | Operation Barbarossa; WWII; 27 million Soviet dead | Absolute existential memory (Russia) | Permanent 2.5× threat multiplier for any German rearmament or eastward military presence | NATO expansion triggers this Epochal memory |
| USA — Iran | 1979 hostage crisis; proxy wars; sanctions | Deep mutual hostility | 2.5× for Iran toward US military presence; 2.0× USA toward Iran nuclear | Nuclear program is primary escalation vector |
| China — Japan | 1894–95 war; 1937–45 invasion; Nanjing massacre | Deep historical trauma (China) | 2.2× threat multiplier for Japanese rearmament; Senkaku disputes trigger it | Comfort women issue keeps it active |
| Korea (South) — Japan | 1910–1945 colonial occupation | Historical humiliation | 1.8× for comfort women/Dokdo disputes | Economic ties create strong fluid override normally |
| Vietnam — China | Thousand-year Chinese domination; 1979 border war | Historical resistance identity | 2.0× for Chinese encroachment; S. China Sea is trigger | 1979 war still in active memory |
| Poland — Russia | Partitions; WWII occupation; Katyn massacre; Soviet domination | Existential threat memory | 3.0× for Russian military presence in Eastern Europe | NATO membership = primary response; Epochal never decays |
| Turkey — Greece / Armenia | Ottoman conflicts; 1922 population exchange; alleged Armenian genocide | Contested historical memory | 1.5× Turkey-Greece; 2.0× Turkey-Armenia | Cyprus dispute adds active Fluid Memory layer |
| Saudi Arabia — Iran | Sunni-Shia proxy conflict; regional hegemony contest | Sectarian + strategic rivalry | 2.5× mutual regional competition | Yemen, Iraq, Lebanon are proxy battlegrounds |
| North Korea — USA/South Korea | Korean War 1950–53; armistice only (no treaty) | Existential threat (DPRK perspective) | 3.5× for US/ROK military exercises as threat signal | Nuclear program is response to this Epochal memory |

# **Appendix — Recommended Update Schedule**

Military inventories change continuously. The following update schedule is recommended for keeping Aetherion's seed data accurate:

| **Data Category** | **Update Frequency** | **Primary Source** | **Time Required** |
| --- | --- | --- | --- |
| Defense budgets (all nations) | Annual (April) | SIPRI Military Expenditure DB (free) | 2–3 hours |
| Major arms deliveries | Annual (March) | SIPRI Arms Transfers DB (free) | 3–4 hours |
| Force structure inventories | Annual (February) | IISS Military Balance (purchase) | 10–20 hours |
| Nuclear warhead estimates | Annual (June) | SIPRI Yearbook + FAS | 1–2 hours |
| Semiconductor fab nodes | Biannual | SEMI World Fab Watch + IC Insights | 2–3 hours |
| Critical mineral production | Annual (January) | USGS Mineral Commodity Summaries (free) | 2 hours |
| Agricultural exports | Annual (May) | USDA WASDE + FAO (both free) | 1–2 hours |
| GDP / credit ratings | Annual (October) | World Bank + S&P/Moody's (free summaries) | 1 hour |
| Arms contracts / new orders | Ongoing | Defense News, Janes 360, Flight Global | Weekly 30 min scan |

AETHERION · Military & Assets Reference v1.0 · CONFIDENTIAL INTERNAL DOCUMENT