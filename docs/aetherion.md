AETHERION
Global Real-Time Geopolitical Simulator
GAME DESIGN DOCUMENT · Version 3.0 · Full Systems Expansion
Genre Grand Strategy / Geopolitical Sandbox / Institutional Simulator
Platform Desktop (Tauri + Next.js + Three.js)
Scale 200+ sovereign nations, real-world map, continuous real-time simulation
Player Role The Permanent State Apparatus — institutional identity, not a ruler
AI Nations Rational-Actor Utility Engine — no scripted history
Doc Version 2.0 — Full expansion: war realism, diplomacy, arms trade, AI performance,
map views

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
TABLE OF CONTENTS
01 Executive Summary & Core Philosophy
02 Simulation Architecture — The Tick Engine
03 The 200-Nation AI Performance Framework
04 The War Spectrum — From Raids to World War
05 Coalition Warfare & Ally Response Logic
06 Diplomatic Dialogue System — Talks, Ultimata & Ceasefires
07 Neutral Nations & Peacemaker Mechanics
08 The Escalation Ladder — Limited War to Global Conflict
09 The Global Arms Market — Procurement & Requisition
10 Technology Transfer, Licensing & Reverse Engineering
11 Peacetime Trade — Food, Energy, Satellites & Civilian Tech
12 The Full Diplomatic Action Menu
13 The Population (POP) System & Domestic Politics
14 The Macroeconomic Engine — Resources & Industry
15 Sovereign Finance — Debt, Currency & IMF
16 The Military System — Hardware Registry & Doctrine
17 Nuclear Lifecycle & MAD Engine
18 Operational Warfare — Frontlines, Logistics & Encirclement
19 Intelligence Framework — SIGINT, GEOINT & HUMINT
20 Grey-Zone & Asymmetric Operations
21 Internal Unrest, Insurgency & Coups
22 Historical Institutional Memory
23 National Development & Infrastructure
24 Map View System — Diplomatic, GDP, Population & More
25 Development Roadmap — Phase Milestones
Page 2

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 01
Executive Summary & Core Philosophy
Aetherion simulates the full complexity of global geopolitics on a real-world map of 200+ sovereign nations.
The player is the Permanent State Apparatus — the institutional memory and executive power of a single
nation. Every other country on earth is governed by a live AI engine running continuous utility calculations.
No scripted events. No predetermined outcomes. Only emergent history.
Version 3.0 of this document expands on the foundation with six major new system pillars: a realistic war
spectrum with ally coalitions and limited escalation, a full diplomatic dialogue engine, neutral peacemaker
mechanics, a comprehensive global arms and civilian goods market, reverse engineering depth, a
multi-layer map view system, and an AI architecture designed to run 200+ nations without lag.
1.1 The Five Core Pillars
I — The Immortal State
Regimes fall. The state persists. You never get a Game Over — you adapt to whoever holds power.
II — Absolute Systemic Interconnectivity
Every mechanic feeds every other. A famine drives migration drives radicalism drives insurgency drives
foreign proxy interest drives regional war.
III — Anti-Map Painting
War is the most expensive tool. The game structurally punishes blind aggression while rewarding strategic
patience.
IV — Realistic Alliance Logic
Warmongering nations are not universally punished. Their core allies side with them. The balance of global
coalitions determines who faces sanctions — not simply who fired first.
V — Living World Diplomacy
Nations talk to each other, issue ultimata, negotiate ceasefires, sign emergency treaties, and pursue their
interests through dialogue before and during conflicts.
Page 3

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 02
Simulation Architecture — The Tick Engine
The world runs on a four-tier decoupled tick hierarchy. Each tier fires on its own interval and calculates only
the systems appropriate to its resolution. Tiers never block each other.
Tier Real Game Systems
Interval Time
Hourly ~1 second 1 hour Combat, frontlines, missiles, naval intercepts, air sorties
Daily ~24 1 day Supply chains, trade matching, RGO yield, port throughput, SIGINT
seconds
Monthly ~12 1 month POP wealth, ideology drift, construction progress, R&D;, factory output
minutes
Yearly ~36 1 year GDP, credit ratings, elections, IMF audits, treaty renewals, debt service
minutes
The player controls simulation speed via a persistent toolbar: Paused / Speed 1 / Speed 2 / Speed 3. All
tiers scale proportionally. An Event Interrupt Queue can force-pause the engine when critical events fire
(coup detected, nuclear launch, invasion begun), surfacing a modal alert before resuming.
Page 4

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 03
The 200-Nation AI Performance Framework
Running 200+ sovereign nations concurrently with deep utility calculations is the hardest engineering
challenge in the project. The solution is a tiered AI evaluation architecture that scales computational load
to a nation's current strategic activity level.
3.1 Priority Tier Classification
Priority Tier Nations Assigned Evaluation Full Calculation Budget
Frequency
Tier 1 — Active Nations currently at war, in Every Hourly Tick Full utility scan, all 200+ variables
crisis, or at high flashpoint
Tier 2 — Nations in active diplomacy, Every Daily Tick Reduced scan, 80 key variables
Engaged arms deals, or border
tensions
Tier 3 — Stable Nations at peace with no Every Monthly Tick Lightweight scan, 30 key variables
active crises
Tier 4 — Dormant Micro-states, island nations, Every Yearly Tick 5-variable check: GDP, stability,
minimal global interaction alignment, food, debt
3.2 Worker Thread Architecture
The AI engine runs entirely in dedicated Web Worker threads, fully isolated from the rendering thread.
This ensures the map and UI remain at 60fps regardless of how complex the background calculations
become.
Thread Layout:
Main Thread fi Three.js rendering, UI panels, player input
Worker: Tick fi Hourly/Daily/Monthly/Yearly tick calculations
Worker: AI_Batch fi Processes Tier 1+2 AI nations each tick
Worker: AI_Idle fi Processes Tier 3+4 AI nations during idle frames
Worker: Market fi Global trade price equilibrium calculations
Worker: Events fi Event queue processing and interrupt detection
SharedArrayBuffer fi Shared world state between all workers (lock-free reads)
Structured Clone fi Deep state snapshots passed when a worker needs full context
3.3 Decision Batching & Caching
n Decision Cache: If a nation's top-5 threat variables have not changed since its last evaluation, its
previous decision output is replayed without re-running the full utility scorer.
n Coalition Batching: When one nation declares war, all allied nations' war-entry calculations are
batched into a single parallel pass rather than sequential individual evaluations.
n Lazy Pathfinding: Trade route pathfinding only recalculates when a border closes, port is blockaded, or
tariff changes — not every tick.
n LOD Diplomacy: Tier 3/4 nations use simplified bilateral scoring tables instead of the full geopolitical
DNA matrix, reducing per-nation calculation cost by ~90%.
Page 5

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
n Async Cascade Resolution: When a major event (war declaration, regime collapse) triggers cascading
reactions across dozens of nations, reactions are spread across 3–5 tick intervals rather than resolved
instantly.
Page 6

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 04
The War Spectrum — From Border Raids to World
War
Conflict is not a binary on/off switch. Aetherion models a continuous war spectrum with seven distinct
escalation rungs. Nations can engage at any level and may remain locked there indefinitely if political
conditions prevent further escalation. The AI actively fears escalation to the next rung and will seek
off-ramps at every level.
Le Name Allowed Actions World War Typical
ve Risk Duration
l
L1 Hostile Posturing Force mobilizations, border patrols, None Days–Weeks
naval exercises, propaganda
L2 Cross-Border Special forces incursions, artillery Minimal Hours–Days
Raid strikes <5km depth, drone attacks
L3 Limited Air Airstrikes on specific military targets; no Low Days–Weeks
Campaign ground forces cross border
L4 Localized Ground Ground forces in defined theater; Moderate Weeks–Month
War maritime skirmishes; no capital strikes s
L5 Declared Full mobilization; strategic bombing; High Months–Years
Regional War naval blockades; alliance clauses
triggered
L6 Continental War Multiple-front conflict; superpower Very High Years
direct involvement; infrastructure
destruction
L7 World War Global multi-theater conflict; nuclear Existential Years+
posturing; existential stakes
4.1 Escalation Locks & Brakes
Moving from one level to the next requires clearing Escalation Lock Conditions. These are structural
constraints that the simulation enforces — not optional. Both sides must evaluate them simultaneously.
n Domestic War Backing Threshold: Each level requires a higher War Backing Score. L5 requires
70%+; L6 requires 85%+. Democracy parliaments vote on each escalation step.
n Casus Belli Legitimacy: Each escalation step above L3 is evaluated by the Global Alignment System.
Unprovoked escalation bleeds international support.
n Coalition Calculation: Before escalating, the AI calculates expected coalition sizes on both sides. If the
enemy coalition is overwhelmingly larger, the AI refuses to escalate and seeks dialogue.
n Economic Runway: The AI calculates how many months it can sustain the current level of conflict given
treasury reserves, supply chain integrity, and import access. If runway < 6 months, escalation is blocked.
n Nuclear Shadow: At L5+, if either side or their allies have nuclear capability, the AI runs a MAD
probability calculation. If mutual annihilation probability exceeds 15%, a hard escalation brake fires.
4.2 AI World War Avoidance Logic
Page 7

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
The AI engine has a dedicated Global Stability Monitor that runs independently of individual nation utility
calculations. It tracks the aggregate escalation rung of all active conflicts worldwide and calculates a World
War Proximity Index (WWPI):
WWPI = SUM(active_conflict_escalation_levels) × superpower_involvement_factor
× nuclear_state_proximity_multiplier × alliance_interlocking_score
WWPI < 40 fi Normal operations; standard AI decision-making
WWPI 40-65 fi Elevated caution; AI nations seek off-ramps; neutral mediators activate
WWPI 65-85 fi Crisis mode; all AI nations freeze non-critical escalations;
superpowers open back-channel emergency dialogues
WWPI > 85 fi Emergency brake; simulation surfaces 'Global Crisis Summit' event;
player and all major AI nations receive forced diplomatic meeting
Page 8

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 05
Coalition Warfare & Ally Response Logic
When a nation starts a war, the world does not automatically pile on the aggressor. The global response is
determined by a Coalition Formation Engine that evaluates every nation's interests, fears, dependencies,
and treaty obligations before deciding which side — if any — to join.
5.1 Coalition Formation Process
When a war event fires, the Coalition Formation Engine runs a multi-pass evaluation for all 200+ nations.
This is a batched async calculation spread across 3 Daily Ticks to avoid frame spikes:
PASS 1 (Tick 0): Evaluate treaty obligations — who is BOUND to join?
fi Mutual Defense Pacts: automatic entry unless override clause invoked
fi Alliance frameworks: weighted entry probability based on treaty depth
PASS 2 (Tick 1): Evaluate strategic interest — who WANTS to join?
fi Resource access threatened? fi Pro-defender bias
fi Historical grievance against attacker? fi Pro-defender bias
fi Economic dependency on attacker? fi Neutrality or pro-attacker bias
fi Ideological alignment with attacker? fi Pro-attacker bias
fi Shared enemy of defender? fi Pro-attacker bias
PASS 3 (Tick 2): Evaluate coalition balance — who DARES to join?
fi Calculate current coalition military power ratio
fi If ratio > 3:1 against, even allies may invoke 'defensive only' clauses
fi Small nations bandwagon toward whichever coalition is winning
fi Nuclear-armed states weigh in last; their alignment shifts all calculations
5.2 Sanctions Are Coalition-Dependent
The critical realism fix from v3.0: asset freezes and sanctions are not automatic global responses. They
are coalition actions. Only nations aligned against the aggressor apply sanctions. Nations allied with the
aggressor may counter-sanction the opposing coalition.
Coalition Standing Sanctions Applied By Asset Freeze Trigger Counter-Sanction Risk
Aggressor has <30% global Large opposing coalition; Immediate; SWIFT access Low — aggressor
support major trading hubs align threatened isolated
against
Aggressor has 30–50% Smaller opposing bloc; Partial; targeted at specific Moderate — parallel
global support split global institutions oligarchs financial systems
emerge
Aggressor has 50–70% Only core enemy nations Minimal; bilateral asset High —
global support sanction freezes only counter-sanctions hit
opposing coalition
equally
Aggressor has >70% global Effectively none; attacker None — attacker coalition Severe — opposing side
support holds the mandate controls global finance faces isolation
5.3 The Ally Honor System
Page 9

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
When a nation is obligated by treaty to join a war, it evaluates its Alliance Honor Score. Failing to honor a
defense pact carries severe long-term consequences:
n Immediate -40 to -60 alignment drop with all treaty partners globally.
n Permanent 'Unreliable Ally' flag in the Epochal Memory tier of all nations.
n Future alliance negotiations require 2x the diplomatic investment to succeed.
n Domestic military officer class loyalty drops sharply — they view it as a stain on national honor.
n However, invoking a valid 'Defensive Clause' (e.g., the war was clearly offensive and unprovoked)
preserves the relationship at -10 alignment cost only.
Page 10

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 06
Diplomatic Dialogue System — Talks, Ultimata &
Ceasefires
Diplomacy is not a menu of static options. It is a dynamic dialogue engine where nations communicate
demands, issue warnings, propose frameworks, and respond to events in real time. Dialogues occur
between AI nations independently of the player, and the player can intercept, join, or initiate any bilateral or
multilateral conversation.
6.1 Dialogue Event Types
Dialogue Type Who Initiates Trigger Condition Possible Outcomes
Warning Any nation Border incident; military Acknowledgement, apology, defiance, or
Communication mobilization detected silence (silence = escalation signal)
Ultimatum Stronger Unresolved grievance; red Compliance (crisis resolved), negotiation
|     | nation to | line crossed | (partial), defiance (war trigger) |
| --- | --------- | ------------ | --------------------------------- |
weaker
Ceasefire Proposal Either Heavy losses on both sides; Accepted (temporary halt), rejected (war
|     | belligerent, or | economic strain; WWPI spike | continues), conditional (negotiation |
| --- | --------------- | --------------------------- | ------------------------------------ |
|     | mediator        |                             | phase)                               |
Peace Treaty Both Ceasefire in effect; both sides Territory clauses, reparations,
Negotiation belligerents acknowledge stalemate demilitarized zones, prisoner exchange
Alliance Invitation Stronger to Shared threat identified; Accepted, countered with conditions,
|     | weaker | ideological alignment | rejected (relationship strain) |
| --- | ------ | --------------------- | ------------------------------ |
Emergency Summit Neutral WWPI > 65 Multi-party dialogue; all major
|     | mediator or |     | belligerents forced to table |
| --- | ----------- | --- | ---------------------------- |
superpower
Trade Demand Any nation Resource scarcity; leverage Price agreement, refusal (sanctions
|     |     | position | follow), barter alternative |
| --- | --- | -------- | --------------------------- |
Non-Aggression Border-adjace Rising tension index Signed pact, stalled talks, mutual military
| Talks | nt nations |     | stand-down |
| ----- | ---------- | --- | ---------- |
6.2 The Ultimatum Resolution Engine
Ultimata are the most consequential diplomatic events. When a nation issues an ultimatum, the target runs
a multi-variable compliance calculation:
Page 11

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
COMPLIANCE_PROBABILITY =
(Military_Power_Ratio_Favour_of_Issuer × 0.35)
+ (Economic_Dependency_on_Issuer × 0.20)
+ (Coalition_Support_of_Issuer × 0.20)
+ (Cost_of_Compliance × -0.15) ‹ negative: high cost = less likely
+ (Historical_Humiliation_Score × -0.10) ‹ pride factor
If COMPLIANCE_PROBABILITY > 0.70 fi Target complies
If 0.40 < probability < 0.70 fi Target requests negotiation
If probability < 0.40 fi Target defies; ultimatum issuer must act or lose credibility
CREDIBILITY_LOSS if issuer backs down after defiance: -25 to all bilateral alignment scores
6.3 Ceasefire & Peace Treaty Mechanics
Ceasefires are temporary halts to active combat while negotiations proceed. They are fragile and subject to
collapse from violation events:
n Ceasefire Stability Score: Decays each day the underlying grievances remain unresolved. Drops
sharply if either side is caught resupplying frontline units during the ceasefire.
n Negotiation Phases: Territory (contested provinces), Reparations (treasury transfer or resource
access), Demilitarization (buffer zones), Prisoners (POP-level event resolving captured unit loss), Status
Recognition (diplomatic recognition of post-war reality).
n Third-Party Guarantors: A neutral nation can sign as a guarantor of the peace treaty. Violation of the
treaty then triggers automatic defensive response from the guarantor — adding real teeth to the
agreement.
n Time-Limited Treaties: Peace treaties carry expiry clauses (5, 10, 25, permanent). As expiry
approaches, AI nations reassess whether to renew, renegotiate, or allow the grievance to re-activate.
Page 12

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 07
Neutral Nations & Peacemaker Mechanics
Not every nation takes sides. Neutral states play an active, mechanically significant role in the simulation —
mediating conflicts, hosting peace talks, providing humanitarian corridors, and acting as back-channel
conduits between belligerents who cannot speak directly.
7.1 Neutrality Stances
Stance Definition Mechanical Benefit Risk
Strict Neutrality No arms sales, no intelligence Both sides' trade routes route May be pressured or
sharing, no coalition through you; high transit invaded by a desperate
membership revenue belligerent
Armed Neutrality Maintains strong military; Deters pressure; preserves High military budget
refuses to join any war economic access to all parties drain; cannot leverage
alliances
Benevolent Provides humanitarian aid, Earns 'Protected Status' — Can be accused of
Neutral POW facilities, medical attacking you is diplomatically favoritism if aid is
support to both sides catastrophic for the attacker unequal
Active Mediator Formally offers to host Huge prestige gain; boosts own If mediation fails, may
negotiations; contacts both international standing and credit absorb blame from both
belligerents rating sides
7.2 The Mediation Process
When a neutral nation activates the Mediation Role, it gains access to a unique diplomatic action set
unavailable to belligerents:
n Back-Channel Message: Relay a confidential demand or offer between belligerents without either side
publicly committing to talks.
n Neutral Territory Summit: Host a formal negotiation event. Both belligerents must agree; the mediator
sets the agenda and chairs the session.
n Confidence-Building Proposal: Suggest a limited unilateral gesture (prisoner return, 24-hour
ceasefire, troop pullback from specific node) to test good faith.
n Draft Framework: Present a third-party peace framework that neither belligerent authored — reducing
the political cost of accepting terms.
n International Witness: Sign as a guarantor or observer to any resulting agreement, adding legal and
diplomatic weight.
DESIGN NOTE — Neutral Nation AI Priority
Neutral nations adjacent to conflict zones are automatically promoted to Tier 2 AI priority (daily
evaluation) even if otherwise stable. They must continuously reassess their neutrality as the conflict
evolves, manage refugee flows, and decide whether to offer mediation. This creates rich emergent
diplomatic activity around every war.
Page 13

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 08
The Escalation Ladder — Mechanics in Detail
This chapter details the mechanical rules governing each escalation level: what actions become available,
what constraints apply, and what diplomatic events fire automatically.
8.1 L2 — Cross-Border Raids
n Raid actions are declared covertly — attacker claims plausible deniability for up to 72 hourly ticks.
n Raid force size is capped at battalion-level (no division-scale deployments).
n Target province suffers a localized attack event: infrastructure damage, POP panic event, military
losses.
n If the defender's SWI is high enough to detect the raid origin, they can publicly attribute it, triggering a
diplomatic confrontation at L1.
n Repeated raids escalate the Border Friction axis of the DNA Matrix, eventually forcing both AIs to
evaluate whether to formalize the conflict.
8.2 L3 — Limited Air Campaign
n Airstrikes are declared against a specific target list (military bases, radar sites, fuel depots — not cities).
n A formal Target Manifest is published to the Global Alignment System. Strikes outside the manifest are
war crimes, triggering international alignment collapse.
n The defending nation automatically issues a diplomatic protest and begins coalition-building.
n The attacker must publicly justify strikes with a recognized Casus Belli within 48 hourly ticks or face
Phase 1 sanctions from the opposing coalition.
8.3 L4 — Localized Ground War
n Ground forces cross the international border. This is the point of no return for diplomatic normalization
within the current government cycle.
n The War Zone Declaration fires, marking the theater as a combat zone. Civilian trade through the zone
drops by 60%; shipping insurance costs spike.
n Allied nations evaluate whether their treaty obligations require activation (Pass 1 of Coalition Engine).
n Neutral nations adjacent to the theater immediately activate Tier 2 AI evaluation and begin mediation
assessments.
8.4 L5+ — Regional and World War
Above L4, the conflict enters the domain of total mobilization and alliance interlocking. At L5, the player and
all major AI nations receive periodic Escalation Risk Briefings — in-game notifications quantifying the
WWPI and the specific actions most likely to trigger the next escalation step. This gives all parties
information to make de-escalation choices.
Page 14

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 09
The Global Arms Market — Procurement &
Requisition
Nations without domestic defense industries — and even those with them — buy and sell military hardware
on a dynamic global arms market. Every purchase carries geopolitical strings, logistical timelines, and
long-term dependency implications.
9.1 The Arms Market Structure
The arms market is not a static shop. It is a bilateral contract system where the seller's AI evaluates every
request before agreeing to supply. Sellers consider alignment, end-use risk, regional stability impact, and
their own inventory surplus.
| Category | Examples | Delivery | Key Seller Conditions |
| -------- | -------- | -------- | --------------------- |
Timeline
Small Arms & Light Rifles, mortars, RPGs, body 2–8 weeks Few restrictions; widely available
| Equipment | armor |     | from many suppliers |
| --------- | ----- | --- | ------------------- |
Armored Vehicles APCs, IFVs, light tanks 3–6 months End-user certificate required; no
resale clause common
Main Battle Tanks T-72, M1A2, Challenger 2, 6–18 months Bilateral alignment threshold; training
|     | Leopard 2 |     | package required |
| --- | --------- | --- | ---------------- |
Combat Aircraft F-16, Su-30, JF-17, Rafale 12–36 months Highest threshold; software license
retained by seller; EULA active
Warships Frigates, corvettes, 24–60 months Often built in seller country;
|     | submarines |     | technology transfer restricted |
| --- | ---------- | --- | ------------------------------ |
Air Defense Patriot, S-300, HQ-9, 6–24 months Seller may embed technical
| Systems | NASAMS |     | personnel; remote disable possible |
| ------- | ------ | --- | ---------------------------------- |
Missiles & Munitions AAMs, ASMs, cruise missiles, 4–12 weeks (per Resupply ongoing dependency;
|     | artillery | batch) | seller can cut at will |
| --- | --------- | ------ | ---------------------- |
Military Satellites Reconnaissance, comms, 18–48 months Highest political threshold;
|     | GPS |     | data-sharing agreement required |
| --- | --- | --- | ------------------------------- |
9.2 The Procurement Process
Page 15

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
STEP 1: REQUISITION REQUEST
Player/AI opens contract request fi specifies: hardware type, quantity, desired delivery date
System auto-identifies eligible sellers based on: diplomatic alignment, export control laws,
seller inventory surplus, seller's strategic interest in buyer's region
STEP 2: SELLER EVALUATION
Each eligible seller AI runs: alignment_score + strategic_benefit - regional_risk
If score > seller_threshold fi OFFER generated with price, timeline, conditions
Conditions may include: end-user certificate, no-resale clause, embedded technicians,
EULA (remote disable capability retained), joint basing rights, diplomatic concession
STEP 3: NEGOTIATION
Buyer may counter-offer on price or conditions
Seller may accept, counter, or withdraw
Multiple sellers may compete fi drives price down
STEP 4: CONTRACT EXECUTION
Capital transferred from buyer treasury
Delivery timeline starts; hardware appears in buyer's inventory at completion
Ongoing: spare parts, ammunition, software updates flow from seller each Monthly Tick
Seller retains ability to embargo resupply at any point
9.3 The EULA Dependency Web
Every piece of imported hardware carries an active End-User License Agreement that remains binding for
the hardware's operational lifetime. The seller can exercise these rights at any moment:
n Software Deactivation: Fire-control computers, targeting systems, IFF transponders can be remotely
locked via embedded backdoors. Affects all Gen 4+ hardware.
n Parts Embargo: Cutting spare parts supply degrades hardware readiness by 5–15% per month until
units become combat-ineffective.
n Ammunition Cutoff: Specific calibers, missile types, and guided munitions become unavailable. Units
revert to basic capability.
n Intelligence Withdrawal: Satellite targeting data, threat libraries, and IFF update packages stop
flowing. Precision strike accuracy drops 40–70%.
n Technical Personnel Recall: Embedded maintenance teams are withdrawn. Complex systems
(aircraft, submarines) rapidly degrade without specialist support.
Page 16

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 10
Technology Transfer, Licensing & Reverse
Engineering
Breaking technological dependency chains is one of the deepest long-term strategic games in Aetherion.
Nations can pursue licensed production, joint development, co-production agreements, and ultimately full
indigenous capability through reverse engineering.
10.1 Technology Acquisition Pathways
Pathway Description Cost Time Dependency After
Direct Import Buy finished hardware; no IP Medium Short Full EULA dependency
transfer capital cost delivery maintained
Licensed Production Buy right to manufacture High upfront Medium Partial: seller controls
under license in own country license fee + setup time license renewal
royalties
Co-Development Joint R&D; program with a Share R&D; Long — Low: shared IP
Agreement partner nation costs; years of joint ownership; mutual
provide base work dependency
infrastructure
Technology Seller provides full blueprints, Very high; Long — Near-zero: buyer owns
Transfer Package tooling, training requires industrial the design
deep ramp-up
alignment required
Reverse Acquire sample; reconstruct Intelligence Very long; Zero if successful: fully
Engineering domestically without seller budget + high indigenous
knowledge industrial detection risk
capacity
10.2 Licensed Production Mechanics
Licensed production allows a nation to manufacture foreign-designed hardware domestically, reducing
delivery timelines and foreign exchange drain — but the seller retains critical leverage:
n The seller controls license renewal every 5-year cycle. Renewal can be refused if relations deteriorate.
n License agreements typically prohibit export to third parties — violation triggers immediate license
cancellation and sanctions.
n The seller may withhold specific subsystems (engines, radar, fire-control) that must still be imported,
maintaining a partial dependency chain.
n Domestic workers accumulate industrial experience over time — after 10+ years of licensed production,
the workforce has absorbed enough knowledge to attempt indigenous design iteration.
10.3 Reverse Engineering — Expanded System
Reverse engineering is the highest-risk, highest-reward technology pathway. It is modeled as a multi-phase
covert program with distinct milestones, detection risks, and failure modes.
Page 17

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Phase What Happens Duration Detection Risk Failure Consequence
1. Sample HUMINT agents obtain 6–18 Medium: seller Program set back; HUMINT
Acquisition physical access to target months may notice missi agents burned; diplomatic
hardware — crashed aircraft, ng/damaged unit incident if traced
purchased via third party,
stolen prototype
2. Structural Engineering teams strip and 12–24 Low: internal Partial: analysis may be
Analysis document the sample: months process incomplete; gaps remain in
materials, tolerances, reproduction
manufacturing processes
3. Semiconductor reverse 18–36 Low-Medium: Incorrect mapping fi prototype
Component engineering; circuit layout months chip acquisition failures; extended timeline
Mapping reconstruction; software activities may
binary analysis flag export
controls
4. Prototype First domestic reproduction 24–48 Medium: test High failure rate: 60% of
Build attempt; extensive testing; months facilities programs require multiple
failure expected and built into observable by prototype iterations
timeline GEOINT
satellites
5. Production Scale domestic production; 12–36 Low Supply chain gaps may force
Integration train workforce; establish months partial continued import
supply chain for dependency
domestically-sourced
components
6. Iteration & Once domestic version works, Ongoing None None — program is now fully
Improvement R&D; begins surpassing the indigenous
original — custom upgrades,
next-gen variants
10.4 Detection & Consequences
If a reverse engineering program is detected by the original developer's intelligence services:
n Immediate full EULA exercise — all imports of that hardware type cut off permanently.
n Public accusation in the Global Alignment System — international alignment drop with all technology
exporters.
n IP Litigation event: the seller can push through the global institutions to impose technology sanctions
blocking the buyer from accessing third-party components needed to complete the program.
n However: the buyer retains whatever progress has been made. A partially reverse-engineered design is
still years of work saved.
n Some nations will covertly offer to complete the program for a fee — creating a black-market technology
pipeline that is itself detectable.
Page 18

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 11
Peacetime Trade — Food, Energy, Satellites &
Civilian Tech
The most consequential transactions in the game happen during peacetime. Civilian trade in food, energy,
industrial equipment, and technology creates the dependency webs that define who can sanction whom,
who needs whom, and where the real leverage lies.
11.1 Food & Agricultural Commodities
Commodity Strategic Significance Import Shock Effect Price Drivers
Wheat / Flour Staple food for billions; POP food access drops fi Weather events, conflict in
political stability anchor ASoL falls fi militancy spikes breadbasket regions,
within 2 months export bans
Rice Primary caloric source in Faster militancy spike in Monsoon quality, water
Asia, Africa rice-dependent POP classes access, fertilizer availability
Cooking Oils Food processing, industrial Consumer price inflation; Sunflower
use secondary ASoL drop (Ukraine/Russia), Palm (SE
Asia), Soy (Americas)
Sugar Consumer goods, Minor direct; major in Brazil dominates;
pharmaceutical precursor beverage and processed food Caribbean secondary
industries
Fertilizers Determines agricultural yield Without fertilizer, food RGO Natural gas (ammonia
multiplier for all RGOs yields drop 30–50% within base); potash; phosphate
one growing season — three separate supply
chains
11.2 Energy Commodities
Energy Type Purchase Mechanism Strategic Dependency Disruption Effect
Crude Oil Spot market + long-term Powers all motor pools, naval Immediate: military vehicle
supply contracts fleets, and petrochemical range drops; within 30 days:
industry factory fuel costs spike
Natural Gas Pipeline contracts Heats homes; powers grid; Grid instability; POP heating
(infrastructure-locked) or fertilizer production precursor crisis in winter months; fertilizer
LNG cargo price spike
Refined Bulk cargo import Jet fuel, diesel, heating oil — Aviation grounded within weeks;
Petroleum all require refinery capacity or military logistics crippled
Products import
Uranium / Nuclear Government-to-governm Nuclear power plants require Reactor shutdown within
Fuel ent contracts specific fuel rod specifications months; grid capacity loss;
energy rationing
Liquefied Natural Spot + term cargo Flexible but expensive Infrastructure bottleneck: LNG
Gas (LNG) contracts alternative to pipeline gas terminals are scarce and
expensive to build
Page 19

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
11.3 Civilian Technology Purchases
Nations buy and sell non-military technology that has profound economic and strategic implications:
Tech Category Examples Buyer Benefit Geopolitical Sensitivity
Telecommunication 5G network equipment, Connects POPs; boosts Very High: embedded
s Infrastructure undersea cables, satellite Intelligentsia class; enables surveillance risk; seller
ground stations SIGINT infrastructure maintains backdoor access
Commercial Weather, communications, GPS alternative; High: launch capability is
Satellite Launches Earth observation satellites agricultural monitoring; dual-use with ICBM
|     | media sovereignty | technology |
| --- | ----------------- | ---------- |
Civil Nuclear Power generation plants Energy independence; grid High: fuel dependency on
Reactors (PWR, BWR, CANDU) stability; prestige supplier; possible
|     | technology | weapons-adjacent knowledge |
| --- | ---------- | -------------------------- |
Medical & Vaccine production lines, POP healthcare fi ASoL Low-Medium: dependencies
Pharmaceutical hospital equipment, drug improvement; disease exposed during pandemics
| synthesis plants | resistance |     |
| ---------------- | ---------- | --- |
Industrial Machinery CNC machines, lithography Enables advanced High for sensitive items:
equipment, precision manufacturing tiers; lithography machines are
| tooling | reduces import | export-controlled |
| ------- | -------------- | ----------------- |
dependency
Agricultural Irrigation systems, GMO Boosts RGO yield Medium: seed licenses create
Technology seed licenses, precision multipliers; food security ongoing dependency on
| farming tech | improvement | supplier |
| ------------ | ----------- | -------- |
Page 20

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 12
The Full Diplomatic Action Menu
Every diplomatic interaction is a discrete action with defined inputs, evaluation criteria, and outcomes. Below
is the complete fixed diplomatic action set available to the player and all AI nations. Actions are organized
by category.
12.1 Bilateral Relations Actions
| Action | Alignment   | Key Effect | Breach / Failure |
| ------ | ----------- | ---------- | ---------------- |
|        | Requirement |            | Consequence      |
Establish Diplomatic Any (even Opens formal communication channel; N/A — foundational action
| Mission | negative) | enables all other bilateral actions |     |
| ------- | --------- | ----------------------------------- | --- |
Issue Formal Protest Any Publicly flags grievance; adds to Fluid Ignored protests decay
|     |     | Memory; mild pressure | Fluid Memory faster; |
| --- | --- | --------------------- | -------------------- |
repeated ignoring =
relationship collapse
Issue Warning Negative or Signals red line; next violation triggers Must follow through or lose
|     | neutral | automatic consequence | credibility (-25 alignment |
| --- | ------- | --------------------- | -------------------------- |
with all observers)
Issue Ultimatum Negative; power Forces binary choice with deadline Back down = severe
|     | advantage |     | credibility loss; war trigger if |
| --- | --------- | --- | -------------------------------- |
defied
Request Meeting Positive or Opens bilateral dialogue session Refusal signals hostile
|     | neutral |     | intent to global observer |
| --- | ------- | --- | ------------------------- |
nations
Offer Apology / Post-incident Repairs Fluid Memory damage; Insufficient apology may be
| Reparation |     | prevents escalation | rejected; over-apology |
| ---------- | --- | ------------------- | ---------------------- |
signals weakness
Sign Non-Aggression Alignment > 0 Prevents border incidents becoming Violation = war trigger +
| Pact |     | war; 5/10/25-year term | global alignment collapse |
| ---- | --- | ---------------------- | ------------------------- |
Sign Free Trade Alignment > +20 Removes bilateral tariffs; trade priority Breach = tariff
| Agreement |     | queue advantage | reintroduction + -30 |
| --------- | --- | --------------- | -------------------- |
alignment
Sign Military Alliance Alignment > +50 Mutual defense obligation; joint R&D; Failure to honor =
|     |     | intel sharing | Unreliable Ally flag; -60 |
| --- | --- | ------------- | ------------------------- |
alignment all partners
Offer FOB Lease Alignment > +40 Extends air/naval range into partner Eviction = military
|     | or coercion | territory | extraction cost + -40 |
| --- | ----------- | --------- | --------------------- |
alignment
Impose Bilateral Negative Cuts targeted trade; freezes specific Target retaliates; third
| Sanctions | alignment; | assets | parties evaluate sides |
| --------- | ---------- | ------ | ---------------------- |
provocation
Offer Bilateral Aid Any Food, medical, or financial aid Exploited aid may
Package transfer; builds Fluid Memory goodwill embolden recipient;
domestic POPs may resent
foreign spending
Page 21

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Negotiate Debt Relief Creditor to Restructures loan terms; builds Moral hazard: debtor may
|     | debtor | long-term dependency | expect future relief |
| --- | ------ | -------------------- | -------------------- |
Demand Territory / Power Ultimatum-class action; target must War if defied; international
| Concession | advantage; | comply or fight | backlash regardless |
| ---------- | ---------- | --------------- | ------------------- |
historical claim
12.2 Multilateral & Institutional Actions
| Action | Requirement | Effect |     |
| ------ | ----------- | ------ | --- |
Form Alliance Bloc 3+ nations; shared Creates formal multilateral defense structure; shared
|     | threat | military command unlocked |     |
| --- | ------ | ------------------------- | --- |
Propose UN Resolution Any member nation Triggers global alignment vote; passed resolutions
legitimize sanctions or intervention
Apply for IMF Program Credit rating £ B Unlocks emergency liquidity; triggers austerity conditions
Join Economic Bloc Alignment with bloc Tariff union; shared market access; policy harmonization
|     | leader | requirements |     |
| --- | ------ | ------------ | --- |
Host International Summit Neutral or mediator Brings all named parties to table; mediator sets agenda;
|     | status | guarantor role available |     |
| --- | ------ | ------------------------ | --- |
Invoke Article V Alliance member Triggers mandatory allied response evaluation for all
| Equivalent | under attack | alliance members |     |
| ---------- | ------------ | ---------------- | --- |
Apply Economic Pressure Coalition of 3+ nations Combined sanctions have higher bite than bilateral; harder
| Package |     | to route around |     |
| ------- | --- | --------------- | --- |
Propose Demilitarized Post-conflict; both Creates buffer province node; military deployment to DMZ
| Zone | sides agree | triggers automatic ceasefire collapse |     |
| ---- | ----------- | ------------------------------------- | --- |
Page 22

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 13
The Population (POP) System & Domestic Politics
Every province's population is divided into discrete POP units by profession, wealth bracket, and cultural
alignment. POPs consume goods, pay taxes, hold ideologies, and determine whether the state stands or
falls. ASoL vs ESoL gap drives militancy; militancy drives unrest; unrest drives insurgency or revolution.
13.1 POP Classes & Political Roles
| Class | Economic Role | Political Leverage | Key Sensitivity |
| ----- | ------------- | ------------------ | --------------- |
Laborers Factory workers, Strike capability; high vote Wages, food prices, working
|     | miners | share in democracies | conditions |
| --- | ------ | -------------------- | ---------- |
Farmers Agricultural RGO Conservative bloc vote; land Food commodity prices, land
|     | output | reform sensitivity | ownership laws |
| --- | ------ | ------------------ | -------------- |
Capitalists Own factories, Fund political parties; drive Corporate tax rates, regulation,
|     | investment capital | industrialization | stability |
| --- | ------------------ | ----------------- | --------- |
Bureaucrats State administration Regime stability gatekeepers Salary, institutional prestige,
anti-corruption crackdowns
Military Officers Command armed Coup risk if loyalty drops Military budget, war performance,
|     | forces |     | promotions |
| --- | ------ | --- | ---------- |
Intelligentsia R&D;, media, Drive ideology shifts; source Academic freedom, censorship,
|     | universities | of dissent | R&D; funding |
| --- | ------------ | ---------- | ------------ |
Oligarchs / Elites Finance, resource Back-channel power; flee if Asset protection, luxury imports,
|     | extraction | threatened | political immunity |
| --- | ---------- | ---------- | ------------------ |
Clergy / Cultural cohesion Mobilize rural radicalism; Religious freedom, secular law
| Traditionalists |     | resist reform | encroachment |
| --------------- | --- | ------------- | ------------ |
13.2 Government Spectrum & Failure Modes
| Governance Type | Power Basis | Player Constraint | Failure Mode |
| --------------- | ----------- | ----------------- | ------------ |
Liberal Democracy Elected parliament; Budget requires legislative Election loss shifts all policy
interest groups approval; approval rating sliders; strikes block funding
above 40%
Hybrid Regime Nominal elections + Limited purges allowed; some International pressure + elite
strong executive budget bypass defection if manipulation visible
Military Junta Loyalty Matrix: Governs by decree; no Coup if military pay drops or war
|     | generals, intelligence | elections | goes badly |
| --- | ---------------------- | --------- | ---------- |
chiefs
Authoritarian Personal loyalty + Near-unlimited domestic Elite purge spiral; succession
| Autocracy | secret police | power | crisis; economic stagnation |
| --------- | ------------- | ----- | --------------------------- |
Theocracy Religious legitimacy + Policies must align with Secular POP radicalism;
|     | Clergy class | religious law | modernization lockout |
| --- | ------------ | ------------- | --------------------- |
Page 23

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 14
The Macroeconomic Engine — Resources &
Industry
The global economy is a closed physical loop. Every factory needs specific inputs; every unit needs specific
supplies. Prices emerge from supply and demand, not scripts.
14.1 Six-Tier Industrial Registry
Ti Category Key Chain
er
1 Extractive RGOs Labor + Capital fi Crude Oil, Iron Ore, Lithium, Food, Rare Earths
2 Primary Processing Iron + Coal fi Steel; Crude fi Refined Fuel; Ore fi Aluminum
3 Heavy Infrastructure Power grids, rail networks, deepwater ports — enables all other tiers
4 Advanced Fabrication Rare Earths + Energy + Labor fi Semiconductors, Precision Optics, Aerospace
Components
5 Consumer Goods Steel + Chips + Rubber fi Vehicles, Electronics, Pharmaceuticals
6 Defense Industrial Steel + Chips + Precision Parts fi Tanks, Aircraft, Missiles, Warships
Complex
14.2 Global Market Dynamics
n Unified Global Market Pool: All goods priced by aggregate world supply vs demand, recalculated each
Daily Tick.
n Supply Shock Cascade: War in a major producer region spikes global commodity prices within days,
cascading to every dependent industry worldwide.
n Trade Priority Queue: Constrained supply served first to: FTA partners fi aligned nations fi proximity
fi open market.
n Maritime Port Economics: Port efficiency determines trade route pathfinding. High-efficiency ports
attract regional trade, generating transit tariff revenue from neighbors' goods.
n Autarky Penalty: Full self-sufficiency avoids import shocks but incurs 20–35% efficiency loss versus
internationally specialized competitors.
Page 24

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 15
Sovereign Finance — Debt, Currency & IMF
The treasury is the bloodstream of the simulation. Mismanagement cascades into inflation, credit
downgrades, austerity lockouts, and currency collapse.
15.1 Credit Rating Scale
Rating Interest Downgrade Triggers Recovery Path
Rate
AAA–AA 0.5–2% Sustained surplus; no active wars 4+ quarters of budget discipline
A–BBB 2–5% Minor deficit; contained war; slight inflation Primary surplus; end conflicts
BB–B 5–12% Sustained war; high inflation; civil unrest IMF engagement; structural
reforms
CCC–CC 12–25% Near default; rampant inflation; regime Emergency IMF bailout;
collapse sovereignty restrictions
D (Default) Market Missed bond payment Debt restructuring; decade of
locked constrained borrowing
15.2 IMF Austerity Conditions
n Welfare and social spending locked at reduced floors (POP ASoL drops; militancy rises).
n Tax rates must meet minimum floors; military spending capped as % of GDP.
n State-owned enterprises must be privatized (factory nodes sold to Capitalist POPs).
n New sovereign debt issuance blocked until primary surplus achieved.
n Violation causes bailout withdrawal fi locked out of global credit markets entirely.
Page 25

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 16
The Military System — Hardware Registry &
Doctrine
Every division, hull, and air wing tracks discrete equipment in the Hardware Registry Matrix. Generational
gaps are decisive. A Gen 3 fleet can be dismantled by a Gen 5 force before detecting them.
16.1 Hardware Generation Comparison
Generatio Era Representative Systems Key Limitation
n
Gen 2 1940s–50s T-55, MiG-17, WWII-era warships No BVR capability; analogue systems; no EW
protection
Gen 3 1960s–70s MiG-21, F-4 Phantom, M60 Patton Limited BVR; basic radar; high RCS; no stealth
Gen 4 1980s–90s F-16, Su-27, M1 Abrams, Leopard 2 Digital avionics; BVR capable; no stealth;
upgradeable
Gen 4+ 2000s F-15EX, Su-35, T-90 Enhanced EW; AESA radar; semi-stealthy
shaping
Gen 5 2010s+ F-35, Su-57, J-20, B-21 Full stealth; sensor fusion; networked warfare;
dominant BVR
Gen 6 Player Domestic prototype via research tree Requires Next-Gen semiconductor fab and
(R&D;) R&D; decades of investment
16.2 Maintenance, Supply & EULA Dependencies
n Every year hardware ages, Maintenance Cost Factor grows (Base_Cost × Age ^ 1.3 × Combat_Hours).
n Imported hardware subject to EULA: software deactivation, parts embargo, ammo cutoff, intel
withdrawal.
n Breaking EULA dependency requires Reverse Engineering (Ch. 10) or domestic production substitution.
n Encircled or supply-cut forces degrade 5% combat effectiveness per Daily Tick; collapse after 21 ticks
without supply.
Page 26

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 17
Nuclear Lifecycle & MAD Engine
Nuclear weapons require vast resource dedication and trigger sustained global responses. The MAD
Engine ensures nuclear use is an existential gamble, not a tactical option.
Stage Requirements Intelligence Signature International Response
1. Uranium RGO; centrifuge Low — SIGINT power IAEA monitoring; quiet diplomatic
Enrichment cascade; high power draw anomaly contact
2. Weaponiz Scientific institutes; fissile HIGH — permanent Diplomatic warnings; sanctions threat
ation R&D; core program signature
3. Delivery ICBM/SLBM/bomber VERY HIGH — test Preemptive strike warnings;
Systems program; aerospace launches visible superpower ultimata
foundry
4. First Test Completed warhead + ABSOLUTE — global Total economic isolation; proxy
delivery vector seismic detection warfare; credit collapse
5. Minimum 4–6 deliverable Ongoing monitoring MAD equilibrium; nuclear umbrella
Deterrence warheads + second-strike realignment worldwide
survivability
Any nuclear first use, even tactical, immediately triggers: Phase 5 international intervention against the user;
all allied nuclear states mobilize their deterrent forces; global trade volume drops 20–40%; atmospheric
fallout modifiers apply to affected province nodes.
Page 27

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 18
Operational Warfare — Frontlines, Logistics &
Encirclement
Combat is resolved at the operational level. Players command Army Corps assigned to geographic theaters,
setting operational postures. The simulation resolves battles based on equipment, terrain, supply integrity,
and electronic warfare.
18.1 Terrain & Combat Width
Terrain Width Attack Penalty Defense Special
Bonus
Open Plains 8–12 None None Armor speed ×2; encirclement risk highest
divisions
River Crossing 2–3 -40% +60% depth Bridgehead province = critical objective
divisions breakthrough
Mountain Pass 1–2 -60% speed +80% One entrenched division halts a corps
divisions entrenchment
Urban Zone 4–6 -30% armor + 50% infantry Artillery destroys infrastructure
divisions
Jungle / Swamp 2–3 -50% +20% Supply degrades rapidly; disease attrition
divisions movement concealment
Desert 6–8 Heat attrition Visibility Water as explicit supply resource
divisions +15% negated
18.2 Supply Lines & Encirclement
n Armies trace supply via road/rail graph back to domestic hubs. Full supply = 100% effectiveness.
n Partial supply (50–80%): ammunition resupply drops; artillery fire rate reduced; attrition begins.
n Supply cut (0–20%): organization collapses over 7–14 Daily Ticks.
n Encircled zero supply: mass surrender events fire within 21 Daily Ticks regardless of defensive position.
n Encirclement Exploitation: Fast armor bypassing lines to capture a rear logistics node cuts the supply
connection for all forward enemy units simultaneously.
18.3 Infrastructure Damage & Decay Loop
Damage Type Cause Effect Repair Cost
Power Grid Rupture Precision strikes All factories halt; IADS dark; Electrical components +
hospitals halved capital (30–90 days)
Rail Severance Carpet bombing; Frontline supply cut 70% Steel + engineers (15–45
artillery days)
Port Destruction Naval bombardment Maritime trade to zero Concrete + steel + capital
(60–180 days)
Page 28

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Refinery Fire Strategic bombing Fuel stockpiles drain; mobility Capital + steel (45–120 days)
drops
Semiconductor Fab Precision strikes All advanced electronics halted Import specialized tools only
nationally (90–365 days)
Page 29

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 19
Intelligence Framework — SIGINT, GEOINT &
HUMINT
Intelligence is the nervous system of the simulation. The Strategic Warning Index (SWI) determines
vulnerability to surprise attack. Covert operations allow conflict below the threshold of war.
| Discipline | Detects | Counter-Measure |
| ---------- | ------- | --------------- |
SIGINT — Signals Military radio traffic; cyber activity; diplomatic OPSEC; radio silence; encryption
|     | intercepts; nuclear power signatures | upgrades; cyber counter-ops |
| --- | ------------------------------------ | --------------------------- |
GEOINT — Geospatial Armor movements; fuel depot build-ups; port Camouflage; decoy deployments;
|     | activity; missile silo construction | ASAT strikes on recon satellites |
| --- | ----------------------------------- | -------------------------------- |
HUMINT — Human Ministry intentions; coup plotting; arms deals; Counter-intelligence purges; honey
|     | general staff plans | trap operations; defector screening |
| --- | ------------------- | ----------------------------------- |
19.1 Covert Operations Menu
| Operation | Effect | Detection Risk |
| --------- | ------ | -------------- |
Industrial Sabotage Factory output -20 to 60% for 2–4 months Medium: HUMINT-dependent
Cyber Grid Attack Provincial power failure; factory halt Medium-High: Cyber forensics
Insurgency Funding Boosts rebel strength 10–40%; arms factions High: Money trail; arms serial
numbers
Assassination Removes key figure; regime instability event Very High: Protection service alert
Disinformation Boosts opposition POP radicalism; damages ruling Low-Medium: Media fingerprint
| Campaign | coalition | analysis |
| -------- | --------- | -------- |
Technology Theft Accelerates own R&D; by years Very High: Export control flags;
agent exposure
Election Interference Shifts party vote share in target nation Medium: Financial trail; timing
correlation
Page 30

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 20
Grey-Zone & Asymmetric Operations
Conflict exists on a sliding spectrum of deniability. The grey zone is where most of the game's strategic
competition plays out — below the threshold of open war but above peaceful diplomacy.
| Le Type | Attribution Risk | Escalation Risk |
| ------- | ---------------- | --------------- |
ve
l
| 1 Economic pressure (tariffs, currency | None — legal | Low |
| -------------------------------------- | ------------ | --- |
manipulation, commodity dumping)
| 2 Diplomatic isolation (sanctions, | None — public | Low-Medium |
| ---------------------------------- | ------------- | ---------- |
coalition building, embassy
reductions)
| 3 Information warfare (disinformation, | Low — deniable | Medium |
| -------------------------------------- | -------------- | ------ |
hack-and-leak, narrative manipulation)
4 Cyber operations (industrial sabotage, Medium — SIGINT Medium-High
| grid attacks, SCADA disruption)      | detectable           |      |
| ------------------------------------ | -------------------- | ---- |
| 5 Proxy support (insurgency funding, | Medium-High — HUMINT | High |
| arming factions, mercenary           | detectable           |      |
deployment)
6 Border provocations (incursions, naval High — observed Very High
harassment, airspace violations)
| 7 Covert military (special forces ops, | Very High | Extreme |
| -------------------------------------- | --------- | ------- |
targeted assassinations, supply
interdiction)
Page 31

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 21
Internal Unrest, Insurgency & Coups
No state falls from external pressure alone. Internal rot precedes every collapse. The escalation ladder from
peaceful protest to civil war is driven by unaddressed POP grievances.
| Stage | Militancy | Mechanical Effect | Player Response Window |
| ----- | --------- | ----------------- | ---------------------- |
Threshold
Peaceful Protests > 40 Minor efficiency loss (-5% tax Easy: address POP demands
generation)
General Strikes > 60 Factories halt; trade routes through Moderate: policy concession or
|     |     | province severed | intelligence suppression |
| --- | --- | ---------------- | ------------------------ |
Armed Insurgency > 75 Asymmetric nodes form; state forces Difficult: counter-insurgency
|     |     | bleed; police budget drains | operations |
| --- | --- | --------------------------- | ---------- |
Separatism > 85 + ethnic Province referendum; autonomy Critical: grant autonomy or face
|     | minority | demands escalate | international condemnation |
| --- | -------- | ---------------- | -------------------------- |
Full Civil War > 95 or coup Map splits; Loyalist vs. Revolutionary Emergency: military campaign;
|     |     | Front | foreign intervention likely |
| --- | --- | ----- | --------------------------- |
21.1 Coup Mechanism
n Coup probability = loyalty_deficit × economic_stress × war_performance_modifier, rolled each Daily
Tick.
n Player receives 48-tick warning to attempt emergency loyalty purchases, purges, or promotions.
n If coup succeeds: player continues as new regime; inherits all debts, wars, and sanctions.
n Foreign powers may have funded the coup, gaining deep influence over the new regime's alignment.
Page 32

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 22
Historical Institutional Memory
Nations carry a two-tiered Historical Memory Buffer. Recent events create decaying relational modifiers.
Epochal traumas are permanent and bound to Ideological State Frameworks, not country names.
Tier Horizon Stores Decay Binding
Strength
Fluid Last 15–20 Broken treaties, economic aid, High — fades Weak —
(Short-Term) years insults, border incidents over time overridden by
new positive
interactions
Epochal Full history Major invasions, colonizations, None — Absolute —
(Long-Term) genocides, structural betrayals permanent resists even
overwhelming
economic
incentives
A democratic Germany that becomes fascist after an economic crash instantly inherits the Epochal threat
signature of Fascist Germany in every neighboring AI's database — triggering defensive mobilizations,
containment coalitions, and strategic resource cutoffs even if the democratic version was a trusted ally
hours before.
Page 33

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 23
National Development & Infrastructure
The player physically reshapes their nation's economic and military geography over the long game.
Infrastructure investment determines army movement speeds, trade efficiency, and economic resilience.
23.1 Province Development Slots
n Infrastructure Tier: Rail and highway upgrades reduce army transit time and boost trade flow efficiency.
n Industrial Slot: Places a factory of chosen type (RGO processor, consumer goods, defense, etc.).
n Fortification Tier: Permanent entrenchment multiplier that degrades only on capture.
n Port Tier: Coastal only — expands maritime throughput and naval base capacity.
n Airfield Tier: Expands air wing staging capacity; reduces scramble time.
n Special Zone: SEZ, Industrial Park, High-Tech Hub, or Agricultural Collective — attracts specific POP
classes.
23.2 City Founding System
If a province sustains economic growth for 5+ years, exceeds the urbanization population threshold, and
has a major resource discovery or large capital investment, the player can trigger a Founding City Project:
creating a new administrative capital node, shifting terrain to Urban, spawning Capitalist and Bureaucrat
POPs, and establishing a permanent regional logistics hub.
Page 34

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 24
Map View System — Diplomatic, GDP, Population
& More
The player can switch between 14 distinct map overlay views at any time using a persistent toolbar. Each
view re-colors province nodes and applies relevant data labels to give the player instant strategic situational
awareness across any dimension of the simulation.
| View Mode | Color Logic | Key Data Displayed | Strategic Use |
| --------- | ----------- | ------------------ | ------------- |
Default / Nation color; province Province name, owner, terrain Base navigation; war front tracking
| Sovereignty | ownership clearly | tag |     |
| ----------- | ----------------- | --- | --- |
delineated
Diplomatic Spectrum from deep Alignment score; active Identify potential allies, enemies,
Alignment red (enemy) to deep treaties; coalition membership and neutral partners
green (ally) relative to
player nation
Coalition Map Color nations by their Coalition side; military War planning; identify who is
|     | current war-coalition | commitment level; treaty | supporting whom |
| --- | --------------------- | ------------------------ | --------------- |
|     | membership            | obligations              |                 |
GDP / Economic Heat map: dark = Province GDP, national GDP, Target economic bottlenecks;
Output poor, bright = wealthy growth rate, debt-to-GDP identify trade opportunities
Population Heat map by POP Total POP, class breakdown, Identify unstable provinces;
Density count per province militancy level, dominant understand military conscription
|     |     | culture | pools |
| --- | --- | ------- | ----- |
Industrial Color by industrial tier Factory slots, RGO types, Identify resource dependencies;
Capacity level output volume, production target enemy industry in war
chain completeness
Military Strength Province color by Division count, hardware Assess threat levels; identify weak
|     | military presence and | generation, frontline status, | points |
| --- | --------------------- | ----------------------------- | ------ |
|     | power                 | supply integrity              |        |
Resource Map Province color by RGO yields, strategic Identify resource-rich acquisition
dominant resource commodity concentrations, targets; assess supply chain risks
|     | type | export volumes |     |
| --- | ---- | -------------- | --- |
Tension / Province border flares Border friction score, Anticipate where conflicts will
| Flashpoint | indicating active | flashpoint index, active | erupt |
| ---------- | ----------------- | ------------------------ | ----- |
|            | tensions          | incidents                |       |
Trade Routes Animated flow lines Trade volume, commodity Identify economic leverage points;
|     | showing active trade | type, tariff rates, bottleneck | plan blockades |
| --- | -------------------- | ------------------------------ | -------------- |
|     | connections          | nodes                          |                |
Intelligence Color by SIGINT/GEOI Coverage percentage, Direct intelligence budget
Coverage NT/HUMINT coverage intelligence gaps, recent allocation; identify blind spots
|     | of foreign provinces | intercepts |     |
| --- | -------------------- | ---------- | --- |
Ideology Province color by Ideological breakdown, Track political drift; anticipate
|     | dominant POP | radicalism scores, party | regime changes |
| --- | ------------ | ------------------------ | -------------- |
|     | ideology     | support                  |                |
Page 35

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Climate & Terrain overlaid with Flood plains, drought risk, Infrastructure investment
Resources climate zone and earthquake zones, weather decisions; disaster preparedness
natural disaster risk events
Satellite Orbital layer visible; Satellite type, coverage Plan ASAT operations; identify
Coverage ground station and footprint, gap areas, decay intelligence blind spots
coverage arcs shown countdown
24.1 View Transition & Performance
Switching map views is instantaneous — all data is pre-computed and cached by the background worker
threads each tick. The Three.js renderer applies the selected color shader without re-fetching underlying
data. The player can pin a secondary minimap in the corner showing a different view simultaneously (e.g.,
main view = military, minimap = economic).
Page 36

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 25
Development Roadmap — Phase Milestones
The simulation is built in five modular phases. Each phase produces a playable vertical slice that validates
the architecture before the next layer is added. This prevents feature creep and keeps the codebase clean
and testable throughout.
Phase 1 — The World Graph (Months 1–2)
Goal Establish data architecture; render interactive world map
Milestone 200-nation world map in Three.js; province node graph; click province fi see
stats
Tech Three.js globe; province JSON graph; Tauri wrapper; SQLite schema
initialized
Validate All nations render; click works; no crash after 10-minute idle run
n Define province node schema: terrain, combat_width, dev_slots, rgo_types[], pop_data[]
n Build topological adjacency graph (border connections, transit vector types)
n Render province highlight and stat panel on click
n Initialize all 14 map view color shader functions (render empty but switchable)
Phase 2 — The Living Pulse (Months 3–4)
Goal Implement tick engine and closed economic loop
Milestone Provinces generate materials; factories process them; market prices shift;
treasury fills
Tech 5 Web Workers (tick, AI_batch, AI_idle, market, events); SharedArrayBuffer
world state
Validate 5-year unattended sim; no memory leaks; price shifts on production changes
confirmed
n Implement all 4 tick tiers in dedicated Workers
n Build RGO yield and factory throughput calculations
n Build global market pool with price equilibrium formula
n Build basic bilateral trade system with tariff calculation
n Build treasury revenue: income tax, corporate tax, trade tariffs, transit fees
n Populate all 14 map views with live economic data
Phase 3 — The Domestic Fray (Months 5–6)
Goal Integrate POP system, political mechanics, unrest loop
Milestone POP groups in provinces; resource shortage fi militancy fi strikes; election
cycles fire
Page 37

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Tech POP arrays per province; militancy calculator; event queue; government
rules engine
Validate Drop food imports fi militancy rises within 3 months fi strike fires above
threshold
n POP class schemas with ESoL/ASoL calculation
n Militancy delta calculator (Monthly Tick)
n Strike event trigger and factory halt
n Armed insurgency node system (infiltration % tracking)
n Election cycle with Interest Group Clout vote allocation
n Coup probability calculator for autocratic regimes
n Government policy slider system
Phase 4 — Diplomacy & Trade (Months 7–8)
Goal Activate full diplomatic dialogue engine, arms market, and peacetime trade
Milestone AI nations trade autonomously; arms contracts fire; ultimata and ceasefires
work; neutral mediators activate
Tech Dialogue state machine; arms contract queue; coalition formation engine;
peacetime commodity market
Validate Simulate US–China trade dispute fi sanctions exchange fi third-nation
mediator activates
n Build full diplomatic action menu (all Ch. 12 actions)
n Build arms market: requisition fi seller evaluation fi contract fi delivery
n Build civilian commodity market: food, energy, tech purchases
n Build coalition formation engine (3-pass async batched)
n Build dialogue event system: warnings, ultimata, ceasefire proposals, peace treaties
n Build neutral nation peacemaker logic
n Build EULA enforcement system for imported hardware
n Build reverse engineering program (all 6 phases)
Phase 5 — Global Flashpoint (Months 9–12)
Goal Activate military system, AI utility engine, war spectrum, and all escalation
systems
Milestone AI nations go to war; escalation ladder works; coalitions form; WWPI brake
fires; nuclear system active
Tech Full AI RAUOE engine; Hardware Registry; frontline system; nuclear
lifecycle; orbital layer
Validate India–Pakistan war fi China triggers Ladakh skirmish fi coalition forms fi
WWPI reaches 65 fi emergency summit fires
n Full Hardware Registry with all tracked attributes
n Frontline vector system at touching borders
Page 38

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
n Supply line integrity (logistics graph traversal)
n Full AI Utility Optimization loop (scan fi threats fi options fi score fi execute)
n War spectrum escalation lock conditions
n World War Proximity Index (WWPI) monitor and brakes
n International mandate escalation phases (coalition-dependent sanctions)
n Nuclear proliferation pipeline and MAD engine
n Orbital layer: satellite launches, coverage, ASAT
n All 14 map views fully populated with live data
n AI priority tier classification and Worker batching
Page 39

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 26
Notification & Global Event Feed System
The world never stops moving. Even when the player is focused on one corner of the map, wars break out
elsewhere, trade deals close, tanks arrive, famines begin, and regimes collapse. The Notification & Event
Feed System ensures the player is always aware of what matters without being overwhelmed by noise.
Every event is classified, prioritized, and delivered through the appropriate channel.
26.1 Notification Architecture
Notifications flow through three independent layers, each with a distinct delivery mechanism and
persistence model. The player configures which event categories appear in each layer through the Settings
panel.
Layer Delivery Method Persistence Interruptiv Player Can Filter?
e?
Critical Interrupt Full-screen modal pause; Requires manual Yes — No — mandatory events
simulation halts dismissal always only (nuclear launch,
coup, world war entry)
Priority Toast Top-right slide-in banner; Saved to Event Log No — non-b Yes — by category and
8 seconds; click to expand for 30 days locking severity
Event Feed Persistent scrolling feed Last 200 events No Yes — granular filters by
Ticker panel on right edge of always visible; full nation, type, severity
screen searchable archive
26.2 Event Classification Schema
Every event generated by the simulation engine is tagged with four metadata fields before being routed to
the notification system:
EVENT SCHEMA:
id: Unique event identifier (UUID)
timestamp: In-game date + real timestamp
category: MILITARY | DIPLOMATIC | ECONOMIC | DOMESTIC | INTELLIGENCE | GLOBAL | SCIENCE
severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
scope: PLAYER_DIRECT | PLAYER_ADJACENT | REGIONAL | GLOBAL
nations: [list of nations involved]
headline: Short notification string (max 80 chars)
detail: Full event description (expandable in Event Log)
action_link: Optional — opens relevant UI panel when clicked
26.3 Military Events
Event Severit Headline Example Detail & Action Link
y
War outbreak (player CRITIC Pakistan has launched an Full war declaration details; opens
involved) AL offensive against your Military panel + frontline map
northern border
Page 40

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
War outbreak (third party) HIGH India and China have entered Opens Diplomatic panel; coalition
open conflict in Ladakh evaluation begins; WWPI updates
Surprise attack detected CRITIC SIGINT alert: enemy armor Opens Intel panel; recommends
AL mobilizing — attack imminent mobilization actions
in 12 hours
Province captured HIGH Kashmir Province has fallen Opens map centered on province;
to Indian forces supply chain impact shown
Encirclement achieved MEDIU Your 3rd Armored Corps has Opens frontline panel; surrender
M encircled 40,000 enemy countdown begins
troops near Lahore
Ceasefire agreement HIGH Ceasefire between India and Opens Peace Process panel;
Pakistan is now in effect negotiation timeline shown
Unit destroyed MEDIU 1st Fighter Wing has been Opens Military inventory; replacement
M eliminated — 24 F-16s lost procurement suggested
Hardware delivery MEDIU Requisition fulfilled: 180 T-90 Opens Military inventory; units now
complete M tanks delivered to Northern available for deployment
Depot
Nuclear test detected CRITIC Seismic event confirmed — Pauses simulation; opens full
AL [Nation] has conducted a proliferation response panel
nuclear weapons test
Air superiority lost HIGH Enemy has achieved air Opens Air panel; CAS and resupply
dominance over the Eastern sorties now at high attrition risk
Theater
26.4 Diplomatic Events
Event Severit Headline Example Detail & Action Link
y
Alliance invitation received HIGH Germany has offered a Opens Diplomacy panel; accept /
Mutual Defense Pact — counter / reject options
response required
Ultimatum received CRITIC China demands withdrawal Pauses simulation; opens Ultimatum
AL from South China Sea — 72 Response panel
hours to comply
Ultimatum issued — MEDIU Russia has withdrawn forces Opens Diplomatic panel; relationship
complied M — your ultimatum has been modifier applied
accepted
Ultimatum ignored — HIGH Your ultimatum expired with Opens Decision panel; war trigger or
credibility check no response — act or lose stand-down options
credibility
Treaty signed (third party) LOW Brazil and Argentina have Opens trade flow map; regional pricing
signed a Free Trade impact calculated
Agreement
Alliance dissolved HIGH Saudi Arabia has withdrawn Opens coalition map; power vacuum
from the Gulf Defense Pact assessment shown
Sanctions imposed on HIGH The EU has imposed financial Opens Economic panel; impacted trade
player sanctions on your nation flows highlighted
Page 41

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Mediation offer received MEDIU Switzerland offers to host Opens Peace Process panel; accept
|     | M ceasefire talks between you | starts negotiation track |
| --- | ----------------------------- | ------------------------ |
and France
Peace treaty ratified HIGH The Treaty of Istanbul has Opens post-war summary; reparations
been ratified — war with schedule begins
Turkey officially ended
Diplomatic mission MEDIU Iran has expelled your Opens Diplomacy panel; back-channel
| expelled | M ambassador — | options now required |
| -------- | -------------- | -------------------- |
communications severed
26.5 Economic & Trade Events
| Event | Severit Headline Example | Detail & Action Link |
| ----- | ------------------------ | -------------------- |
y
Arms contract fulfilled MEDIU Delivery complete: 48 Rafale Opens Military inventory; EULA
|     | M jets arrived at Karachi Air | conditions reminder shown |
| --- | ----------------------------- | ------------------------- |
Base
Trade deal accepted MEDIU Saudi Arabia has accepted Opens Trade panel; supply chain status
|     | M your oil import contract — 2M | updated |
| --- | ------------------------------- | ------- |
barrels/month
Trade route blockaded HIGH Your Strait of Hormuz Opens Naval panel; alternative routing
shipping lane is under naval cost calculated
blockade
Commodity price spike MEDIU Global wheat prices up 40% Opens Market panel; food import cost
|     | M — supply shock from Russian | impact on POP ASoL shown |
| --- | ----------------------------- | ------------------------ |
export ban
Credit rating downgraded HIGH Moody's equivalent: your Opens Finance panel; debt service
rating drops from A to BBB — projection updated
borrowing costs rise
IMF program activated CRITIC IMF austerity conditions now Opens Budget panel; locked sliders
|     | AL in effect — 6 spending locks | highlighted in red |
| --- | ------------------------------- | ------------------ |
engaged
Resource discovery MEDIU Geological survey confirms Opens Development panel; extraction
|     | M major lithium deposit in | facility options shown |
| --- | -------------------------- | ---------------------- |
Southern Province
Factory destroyed by HIGH Semiconductor plant in Opens Industrial panel; repair cost and
| bombing | Lahore destroyed — | timeline shown |
| ------- | ------------------ | -------------- |
advanced electronics output
halted
Debt default warning CRITIC Treasury will exhaust bond Opens Finance panel; emergency
|     | AL payment reserves in 30 days | options: print / borrow / cut |
| --- | ------------------------------ | ----------------------------- |
Sanctions lifted MEDIU US has removed technology Opens Trade panel; newly available
|     | M export restrictions on your | imports listed |
| --- | ----------------------------- | -------------- |
nation
26.6 Domestic & Intelligence Events
Page 42

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Event Severit Headline Example Detail & Action Link
y
Province reaches high MEDIU Balochistan militancy at 78 — Opens Province panel;
militancy M armed insurgency imminent counter-insurgency options
General strike begins HIGH Industrial workers strike in Opens Domestic panel; concession or
Punjab — 6 factories offline crackdown options
Coup attempt detected CRITIC Intelligence: military faction Pauses simulation; opens Loyalty
AL planning coup in 48 hours panel; emergency response options
Revolution succeeds CRITIC The Revolutionary Front has Simulation pauses; new government
AL seized the capital — regime constraints briefed
transition underway
Covert operation success LOW Sabotage mission successful Opens Intel panel; detection risk
— Iranian centrifuge output assessment shown
down 35%
Agent compromised HIGH HUMINT network in Turkey Opens Intel panel; damage
exposed — 3 operatives assessment; counter-intel options
captured
Election result HIGH Opposition wins majority — Opens Policy panel; new government
defense budget will be cut by constraints shown
15%
Natural disaster HIGH Category 4 typhoon strikes Opens Province panel; emergency
coastal provinces — relief options; repair cost
infrastructure damage severe
Pandemic event HIGH Novel pathogen spreading in Opens Domestic panel; healthcare
Eastern provinces — POP spending recommendations
health declining
Scientist defection MEDIU Lead nuclear physicist has Opens Intel panel; program security
M defected to France with assessment; containment options
classified R&D; data
26.7 Global & Science Events
Event Severit Headline Example Detail & Action Link
y
World War Proximity spike CRITIC WWPI has reached 78 — Pauses simulation; opens Emergency
AL Global Crisis Summit has Summit panel
been called
Superpower regime change HIGH US presidential election — Opens Diplomatic panel; relationship
new administration's foreign reassessment for all US treaties
policy shifts
Major power economic HIGH Russia enters sovereign debt Opens Market panel; contagion risk to
collapse default — global credit your nation calculated
markets tighten
Technology breakthrough MEDIU Your R&D; team has Opens Tech panel; new production
M achieved 5nm chip fabrication options available
— Gen 5 hardware unlocked
Page 43

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Satellite launch success MEDIU Your first reconnaissance Opens Intel panel; GEOINT coverage
M satellite is now operational expanded
over target region
ASAT strike detected HIGH China has destroyed 3 US Opens Military panel; guided weapon
GPS satellites — precision accuracy penalty shown
guidance degraded globally
Global pandemic declared HIGH WHO equivalent declares Opens Trade panel; POP health impact
global health emergency — across all provinces
trade restrictions begin
Climate event — HIGH Severe drought across South Opens Market panel; food import
breadbasket failure Asian agricultural belt — food strategy recommendation
prices rising
Nuclear umbrella invoked CRITIC USA has placed its nuclear Pauses simulation; opens Nuclear
AL forces on elevated alert in panel; MAD calculation updated
defense of South Korea
New nation formed / MEDIU South Sudan has fractured — Opens Diplomatic panel; new bilateral
collapsed M two successor states now on relationship initialization
map
26.8 Notification Filters & Player Preferences
The player configures their notification experience through a persistent Event Preferences Panel. Filters
can be set globally or per-nation:
n Category Toggles: Enable or disable entire categories (e.g., suppress all LOW/INFO economic events
during active war).
n Nation Watch List: Pin up to 10 nations — all events involving those nations are automatically
promoted one severity level in delivery priority.
n Proximity Filter: Only show events within N province-hops of your territory (useful for focused regional
play).
n Auto-Pause Rules: Player defines which event types force-pause the simulation (e.g., 'pause on any
CRITICAL military event involving my nation').
n Event Log Search: Full-text search across all historical events with filters by date range, category,
severity, and nation.
n Event Replay: Click any past event to re-open the state of the world at that moment — useful for
understanding how a crisis developed.
Page 44

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 27
Undeclared War — Attack First, Talk Later
Formal war declarations are a diplomatic courtesy, not a mechanical requirement. In Aetherion, a nation can
simply attack. Troops cross the border, missiles fly, and the simulation responds to the act of violence itself
— not to a piece of paper. What happens next depends on how quickly the parties communicate and what
channels remain open.
27.1 The Undeclared Attack Mechanic
When a nation launches military action without any prior ultimatum or declaration, the simulation processes
it as a Surprise Offensive Event. Several things happen simultaneously:
T+0 (Attack fires):
fi Defender's SWI determines how prepared their response is
fi CRITICAL notification fires for defender: 'Enemy forces have crossed your border'
fi HIGH notification fires globally: '[Nation A] has launched an attack on [Nation B]'
fi Coalition Formation Engine begins Pass 1 (treaty obligations scan)
fi Attacker's Casus Belli score begins decaying international alignment
fi Defender's diplomacy panel unlocks: emergency contact options now available
T+1 to T+6 (first 6 hourly ticks):
fi Combat resolves on frontline nodes
fi Attacker still has Deniability Window: can claim 'border incident', 'counter-terrorism op'
fi If attacker stays silent: global suspicion rises; alignment penalty accumulates each tick
fi If attacker issues immediate statement: shapes narrative; reduces alignment penalty
T+24 (24 hourly ticks = 1 in-game day):
fi Deniability Window closes permanently
fi Conflict formally registered in Global Alignment System
fi All coalition calculations finalize
fi Sanctions evaluation begins based on coalition support scores
27.2 Diplomatic Channels During Active Combat
War does not close diplomatic channels — it changes who can use them and how. The following contact
options become available the moment combat begins, and can be used by either side at any point while
fighting continues:
Channel Who Can Use Available When What It Opens
Direct Hotline Player to any Always — even Private bilateral message; can propose
nation with mid-battle ceasefire, exchange demands, or warn against
active diplomatic escalation
mission
Ally Relay Player to enemy If a nation has Indirect message with ally as messenger;
via shared ally diplomatic relations preserves deniability; ally gains diplomatic
with both belligerents influence
Neutral Mediator Any neutral Once mediator offers Structured dialogue track; mediator controls
nation that services and both agenda; both sides can talk without direct
activates sides acknowledge contact
Mediation Role
Page 45

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Back-Channel Player via If HUMINT depth > 40 Completely deniable communication; higher risk
(Intelligence) HUMINT in target nation of interception; used for secret proposals
network in
enemy state
Open Public Player or AI — Always Sets public narrative; shapes global alignment;
Statement unilateral can signal willingness to talk without committing
broadcast to it
UN/Global Any member Always — but requires Formal multilateral forum; resolutions put to
Institution Floor nation support from enough global vote; legitimizes or delegitimizes the
member nations conflict
27.3 Why Talk While Fighting?
The simulation creates strong incentives to pursue dialogue even while combat continues. Each day of
fighting has real mechanical costs that compound:
n Treasury drain: Military upkeep spikes 3–8x during active combat. Every month of war burns reserves
that took years to build.
n Credit rating pressure: Each quarterly tick during active war applies a rating pressure event. Prolonged
wars push nations toward BB and below.
n POP militancy accumulation: War casualties are POP death events. They spike militancy in the
affected class (soldiers, laborers conscripted). Long wars erode domestic backing even in authoritarian
states.
n Hardware attrition: Losses can't always be replaced at the rate they occur, especially for high-tech
equipment with long procurement lead times.
n International alignment decay: Every week of unprovoked aggression bleeds alignment with
fence-sitting nations, shrinking the coalition supporting you.
n Enemy SIGINT exploitation: A war in progress gives the enemy constant GEOINT data on your
deployments — the longer it goes, the less strategic surprise you retain.
Page 46

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 28
The Peace Process — Staged Realism After War
Wars do not end with a single handshake. They end through a slow, fragile, multi-stage process where
military exhaustion, diplomatic pressure, economic pain, and political will interact simultaneously. Aetherion
models this process as a six-stage Peace Pipeline, each with its own mechanics, failure conditions, and
timeline.
28.1 Overview — The Six-Stage Peace Pipeline
| St Name | What Happens | Can       | Typical  |
| ------- | ------------ | --------- | -------- |
| ag      |              | Collapse? | Duration |
e
1 Contact & Signal Both sides signal willingness to talk — via Yes — any Hours to
|     | direct channel, ally relay, or public | resumption of | Days |
| --- | ------------------------------------- | ------------- | ---- |
|     | statement                             | major         |      |
offensive
collapses
2 Humanitarian Limited, localized halt to allow aid, Yes — fragile; Days to
Pause prisoner exchange, or civilian evacuation violations are Weeks
|     | — not a full ceasefire | common |     |
| --- | ---------------------- | ------ | --- |
3 Preliminary Formal halt to all offensive operations Yes — Weeks
| Ceasefire | along current frontlines; monitoring | violation by |     |
| --------- | ------------------------------------ | ------------ | --- |
|           | mechanism agreed                     | either side  |     |
restarts
combat
4 Framework Core political issues negotiated: territory, Yes — Weeks to
Negotiation prisoners, reparations, status recognition deadlock Months
returns to
preliminary
ceasefire
stage, not war
5 Treaty Drafting & Legal text agreed; domestic ratification Rare — but Weeks
| Ratification | required in democratic systems; | domestic  |     |
| ------------ | ------------------------------- | --------- | --- |
|              | guarantors sign                 | rejection |     |
(parliament
vote fails) is
possible
6 Post-War Troops withdraw to agreed lines; No — but Months to
| Normalization | reparations schedule begins;               | violations     | Years |
| ------------- | ------------------------------------------ | -------------- | ----- |
|               | demilitarized zones established; relations | trigger a new  |       |
|               | formally resume                            | conflict event |       |
28.2 Stage 1 — Contact & Signal
The first challenge in ending a war is breaking the communication deadlock. Neither side wants to appear
weak by asking for talks first. The simulation provides three mechanisms for initiating contact without public
humiliation:
Page 47

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
n Ally Relay Signal: A shared ally privately informs the enemy that you are open to talks. The enemy can
respond privately, also via the ally. No public commitment made. Alignment cost: zero.
n Neutral Mediator Approach: A neutral nation contacts both sides offering to host talks. Both sides can
accept 'in principle' without publicly admitting they want to stop fighting.
n Backchannel Intelligence Contact: If you have HUMINT depth > 40 in the enemy state, you can send
a covert message directly to the enemy leadership. Completely deniable. High intercept risk.
n Public Statement with Conditions: One side publicly states it would consider talks if specific conditions
are met. Shapes global narrative; the enemy can respond publicly or privately.
n Third-country intermediary: A nation with good relations with both sides volunteers to carry messages.
Differs from formal mediation — it is informal and non-binding.
28.3 Stage 2 — Humanitarian Pause
Before a full ceasefire can be negotiated, both sides often agree to a limited, localized pause to address the
most immediate human costs of the war. This is not a ceasefire — fighting can continue in other sectors:
n Prisoner Exchange: Each side returns a negotiated number of captured military personnel.
Mechanically: restores a portion of captured unit strength; boosts domestic morale; generates positive
POP event.
n Humanitarian Corridor: A specific provincial node is designated as safe passage for civilian
evacuation. Units in that node cannot fire for the duration. Violation is a war crime event.
n Medical Resupply Access: The defender allows civilian medical convoys through frontlines. Reduces
civilian POP death rate in occupied provinces. Builds goodwill with international observers.
n Body Repatriation: Both sides agree to return the remains of fallen soldiers. Zero military value;
significant domestic political value; generates sympathy internationally.
DESIGN NOTE — Humanitarian Pause Violations
If either side violates a Humanitarian Pause (firing on a designated corridor, blocking medical convoys),
the violation triggers a WAR CRIMES INVESTIGATION event. This fires a global alignment collapse
event for the violating nation and permanently flags the conflict in the Historical Memory Buffer as an
atrocity — with multi-decade diplomatic consequences.
28.4 Stage 3 — Preliminary Ceasefire
A Preliminary Ceasefire freezes the frontline at its current position. All offensive operations halt. This is
mechanically enforced — neither side can order an advance without first breaking the ceasefire, which fires
a global notification and coalition re-evaluation.
Ceasefire Condition What It Governs Violation Consequence
Line of Contact Freeze No military units may advance beyond Violation = ceasefire collapse notification;
their current position combat resumes; violating side loses 20
global alignment
Resupply Restriction No large-scale ammunition or heavy Violation = ceasefire collapse; violator
equipment moved to frontline during flagged as bad-faith actor; mediator
ceasefire withdraws
Airspace Agreement No combat sorties; allowed: humanitarian, Violation = immediate ceasefire collapse;
medical, recon by mutual agreement international outcry
Monitoring Mechanism Neutral nation or institution observes Monitoring failure = ceasefire becomes
frontline; violations reported publicly 'unverified'; stability score decays faster
Page 48

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
Duration Ceasefires are time-limited (7, 14, 30, 90 Expiry without renewal = ceasefire lapses;
days) and require explicit renewal combat-ready status automatically restores
28.5 Stage 4 — Framework Negotiation
This is the core of the peace process — where the political issues that caused or sustained the war are
actually addressed. Negotiations happen across five parallel tracks, each of which must reach a threshold
agreement before a treaty can be drafted:
Track Issues Negotiated Sticking Points Resolution Mechanisms
Territory Which provinces return to Both sides claim the same Referendum clause; phased
pre-war control; which province; ethnic population withdrawal; autonomy
transfer ownership; buffer composition conflicts with compromise; UN administration
zones; DMZ creation political boundary period
Prisoners of Return of all captured military One side holds more POWs; Red Cross equivalent
War personnel; timeline; allegations of mistreatment monitoring; phased exchange
conditions; remains complicate exchange tied to territorial milestones
repatriation
Reparations Financial transfers; resource Losing side may not have the Phased payment schedule;
access as payment; fiscal capacity; domestic reparations as resource export
infrastructure reconstruction politics make payment discounts; waiver in exchange
obligations humiliating for political concession
Status Recognition of post-war Winner demands recognition Conditional recognition clauses;
Recognition political reality: new of gains; loser refuses; third-country guarantor
governments, border international community may endorsement; time-delayed
changes, independence split formal recognition
declarations
Security Demilitarized zones; force Both sides want buffer zones Symmetric DMZ creation; force
Guarantees caps in border provinces; on the other's territory; caps applied equally; neutral
monitoring mechanisms; inspection regimes intrusive monitoring force stationed
alliance restrictions
28.6 Stage 5 — Treaty Drafting & Ratification
Once all five negotiation tracks reach threshold agreement, the treaty text is drafted. Ratification
requirements depend on the governance type of each signatory:
n Liberal Democracy: Treaty must pass a parliamentary vote. The opposition may campaign against it. If
War Backing was low, the public may reject the treaty as insufficient. A failed ratification vote sends the
process back to Stage 4.
n Hybrid Regime: Ratification requires approval from key institutional gatekeepers (military chiefs,
intelligence heads). Dissenting gatekeepers may need to be bought off or purged first.
n Autocracy / Junta: Ratification is by executive decree — fast, but the leader's personal prestige is now
tied to the treaty. If the treaty is widely seen as humiliating, it accelerates coup risk.
n Third-Party Guarantors: Nations signing as guarantors of the treaty add an enforcement clause — any
violation by either signatory triggers the guarantor's intervention obligation.
n International Institution Endorsement: If the global multilateral institution endorses the treaty, it gains
additional legitimacy and makes future violations more diplomatically costly.
28.7 Stage 6 — Post-War Normalization
Page 49

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
The treaty signing is not the end. Post-war normalization is a slow mechanical process that plays out over
months or years, with its own event triggers and failure risks:
Normalization Phase Timeline Mechanical Event Failure Mode
Military Withdrawal Weeks Units move to agreed lines; occupation Delay in withdrawal = ceasefire
1–8 provinces transfer ownership on map violation notification; political
crisis in loser's domestic
politics
Reparations Payment Month 1–3 Treasury transfer event fires; receiving Missed payment = treaty
(first installment) nation's GDP ticks up; paying nation's breach notification; creditor can
drops invoke enforcement clause
DMZ Establishment Months Buffer province nodes created on map; Unauthorized military entry =
1–4 military deployment locked out war crime alert; escalation risk
spikes
Prisoner Return Months Remaining POWs repatriated; unit Hidden POW revelation =
Completion 1–6 rosters restored; domestic morale boost scandal event; domestic
event outrage; diplomatic protest
Diplomatic Months Embassies reopen; trade routes Public incident can delay
Normalization 3–12 reactivate; bilateral alignment begins normalization; hardline
recovering domestic factions may block
ambassador confirmation
Long-term Years Quarterly treasury transfer; both nations' Economic crash in paying
Reparations Schedule 1–20 economic plans built around this flow nation triggers renegotiation
demand; refusal = treaty crisis
28.8 Wars That End Without a Treaty
Not all wars end through negotiated settlement. Several alternative endings are modeled:
n Total Victory: One side's military collapses entirely; capital captured; regime overthrown. The winner
imposes terms unilaterally. No negotiation — the loser has no leverage. The winner writes the post-war
order.
n Frozen Conflict: Both sides run out of economic runway simultaneously. Combat stops not by
agreement but by mutual exhaustion. No ceasefire signed. No treaty. Both sides maintain legal claim to
contested territory. The conflict can reignite at any time. This is the most diplomatically unstable outcome
— it creates a perpetual low-level tension modifier between the two nations.
n Great Power Imposed Settlement: If the war is generating WWPI pressure, a superpower may impose
terms on both parties — backed by the implicit threat of direct intervention. Both parties must accept or
fight the superpower.
n Regime Collapse Ending: One belligerent suffers a coup or revolution mid-war. The new regime may
immediately seek peace as a political necessity, accepting terms the previous regime would have
refused. The peace is fragile because the new regime's domestic opponents may reject the settlement.
Page 50

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
CHAPTER 29
Development Tools & Environment Guide
This chapter answers the practical question: what software do you actually need to build Aetherion? The
good news is that Visual Studio Code is not just sufficient — it is the recommended primary editor for
this entire project. You do not need Visual Studio (Microsoft's C++ IDE), Unreal Engine, Unity, or any other
specialized game engine.
29.1 The Core Tool Stack
| Tool | What It Is | Role in Aetherion | Cost |
| ---- | ---------- | ----------------- | ---- |
Visual Studio Code Lightweight code PRIMARY EDITOR — write all JavaScript, Free
|     | editor by Microsoft | TypeScript, CSS, and config files here. Has |     |
| --- | ------------------- | ------------------------------------------- | --- |
extensions for everything you need.
Node.js (LTS) JavaScript runtime Runs your development server; powers Free
|     | environment | Tauri's build system; required for all npm |     |
| --- | ----------- | ------------------------------------------ | --- |
packages
npm / pnpm Package manager Installs Next.js, Three.js, and all other Free
|     | for JavaScript | libraries with one command |     |
| --- | -------------- | -------------------------- | --- |
Tauri CLI Desktop app build Compiles your web app into a native .exe or Free
|     | tool (Rust-based) | .app file; provides file system access, OS |     |
| --- | ----------------- | ------------------------------------------ | --- |
notifications, and window management
Rust toolchain Programming Required by Tauri internally — you don't Free
|     | language + compiler | write Rust, but it must be installed |     |
| --- | ------------------- | ------------------------------------ | --- |
Git Version control Track every change to your code; essential Free
|     | system | for a project this size |     |
| --- | ------ | ----------------------- | --- |
GitHub / GitLab Remote code Back up your code; enables rollback if Free tier
|     | repository | something breaks badly | sufficien |
| --- | ---------- | ---------------------- | --------- |
t
29.2 VS Code Extensions You Must Install
| Extension | Publisher | Why You Need It |     |
| --------- | --------- | --------------- | --- |
ESLint Microsoft Catches JavaScript errors before you run the code — critical for a
complex codebase
Prettier Prettier Auto-formats your code consistently — keeps 50,000 lines readable
TypeScript + JS Microsoft Provides autocomplete, type checking, and inline documentation for
| (built-in) |     | all APIs |     |
| ---------- | --- | -------- | --- |
Tauri Tauri Apps Syntax highlighting and command integration for Tauri config files
GitLens GitKraken Shows who changed what and when — invaluable when debugging
old decisions
Error Lens Alexander Shows errors inline next to the code line — no hunting through the
Problems panel
Page 51

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
TODO Highlight Wayou Liu Highlights TODO and FIXME comments — essential for tracking
'come back to this' notes in a large project
REST Client Huachao Mao Test API calls directly inside VS Code — useful when building the
trade and diplomacy APIs
29.3 Project Folder Structure
aetherion/
src-tauri/ ‹ Tauri backend (Rust config only; don't touch unless needed)
tauri.conf.json ‹ App name, window size, permissions
Cargo.toml ‹ Rust dependencies (Tauri handles this)
src/ ‹ ALL your actual game code lives here
app/ ‹ Next.js pages and layout
page.tsx ‹ Main game entry point
layout.tsx ‹ Global layout wrapper
components/ ‹ React UI components
map/ ‹ Three.js globe, province renderer, view overlays
panels/ ‹ Military, diplomatic, economic, intel panels
notifications/ ‹ Toast system, event feed, critical interrupt modals
diplomacy/ ‹ Dialogue trees, treaty UI, peace process stages
engine/ ‹ Simulation engine (runs in Web Workers)
workers/
tick.worker.ts ‹ Hourly/Daily/Monthly/Yearly tick processor
ai.worker.ts ‹ AI utility scoring engine
market.worker.ts ‹ Global trade price equilibrium
events.worker.ts ‹ Event queue and notification dispatch
systems/
economy.ts ‹ RGO, factories, treasury calculations
military.ts ‹ Hardware registry, combat resolution
diplomacy.ts ‹ Alignment matrix, treaty mechanics
intelligence.ts ‹ SWI, covert ops, SIGINT/GEOINT/HUMINT
population.ts ‹ POP ASoL/ESoL, militancy, elections
peace.ts ‹ Six-stage peace pipeline logic
notifications.ts ‹ Event classification and routing
data/ ‹ Static world data (loaded once at startup)
nations.json ‹ All 200+ nations: base stats, DNA matrix seeds
provinces.json ‹ Province node graph: terrain, adjacency, RGOs
hardware.json ‹ Full hardware registry: all equipment specs
history.json ‹ Epochal memory seeds: pre-loaded historical traumas
store/ ‹ Global world state (SharedArrayBuffer + Zustand)
worldState.ts ‹ Master world state object
eventQueue.ts ‹ Global event queue
29.4 Installation Sequence — Getting Started in One Day
Page 52

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
# 1. Install Node.js from nodejs.org (LTS version)
# 2. Install Rust from rustup.rs
# 3. Install VS Code from code.visualstudio.com
# 4. Open VS Code terminal and run:
npm create tauri-app@latest aetherion
# Choose: TypeScript, Next.js, npm
cd aetherion
npm install
# 5. Install game-specific libraries:
npm install three @types/three # 3D globe renderer
npm install zustand # Global state management
npm install @tauri-apps/api # OS integration (notifications, file system)
# 6. Run in development mode (hot reload — changes appear instantly):
npm run tauri dev
# 7. Build for distribution:
npm run tauri build
# Outputs: .exe (Windows), .dmg (Mac), .AppImage (Linux)
29.5 Why NOT Unity or Unreal Engine?
New developers often ask whether Aetherion should be built in Unity or Unreal Engine. The answer is no,
and the reasons are specific to this game's design:
Concern Unity / Unreal Tauri + Next.js + Three.js
Data-driven simulation Built for 3D action games; Web tech is built for data manipulation; JSON,
simulation logic requires fighting the databases, and complex state management are
engine native
UI complexity UI systems (UGUI, UMG) are heavy React is the world's best UI library; complex
and slow for complex dashboards panels, tables, and live-updating feeds are trivial
and data tables
200-nation AI on Threading in Unity/Unreal is Web Workers are first-class, safe, and easy —
background threads complex and risky exactly designed for this pattern
Learning curve C# (Unity) or C++ (Unreal) — steep JavaScript/TypeScript — more beginner-friendly;
for beginners massive community and resources
Distribution Large runtime downloads; complex Tauri produces tiny (~4MB) native executables
build pipeline with no runtime dependency
Cost Unity has per-seat and Every tool in the Tauri stack is completely free and
revenue-based licensing; Unreal open source, forever
takes 5% royalty above threshold
29.6 The One Thing You Cannot Do in VS Code (Yet)
VS Code is an editor, not an IDE with visual debugging tools built for game engines. You will need to learn
to debug via the browser DevTools (accessible inside Tauri's development mode) and via console logging.
Two tips:
n Enable Tauri's built-in DevTools by setting devtools: true in tauri.conf.json during development. This
gives you Chrome DevTools inside your desktop app — full network panel, memory profiler, and
JavaScript debugger.
Page 53

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
n Use the VS Code JavaScript Debugger extension (built-in) with a launch configuration to attach directly
to the Tauri process. This allows breakpoints inside your simulation engine workers — critical for
debugging complex AI decisions.
Page 54

AETHERION — GDD v3.0 CONFIDENTIAL // INTERNAL DEVELOPMENT USE
This document is the complete systems blueprint for Aetherion v3.0. All mechanics are designed to be modular,
independently testable, and scalable. Build phase by phase. Validate each layer before adding the next. The goal
is not to simulate history — it is to generate it.
AETHERION · GDD v3.0 · CONFIDENTIAL INTERNAL DOCUMENT
Page 55