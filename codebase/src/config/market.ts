/**
 * ============================================================================
 *  AETHERION — COMMODITY MARKET RULESET
 * ============================================================================
 *  The world's deposits were priced by a constant: `value` in
 *  resourceCatalog.json, $M per richness point per year, the same in 2026 as in
 *  2076. A petrostate's fortune never turned, and an importer never felt a
 *  shock. These are the knobs that make the price of a thing move.
 *
 *  Grounding: GDD Ch.14 (Macroeconomic Engine). This is the PRICE half of that
 *  chapter — the six-tier industrial registry (ore becomes steel becomes
 *  hulls) is a later slice; nothing here presumes its absence.
 */

/** Real demand growth per year by resource category: the world consumes more
 *  every year, while the ground holds what it holds. */
export const MARKET = {
  demandGrowth: {
    FUEL: 0.012,
    INDUSTRIAL: 0.018,
    AGRICULTURE: 0.008,
    STRATEGIC: 0.026, // lithium, cobalt, rare earths — the scramble
  } as Record<string, number>,

  /** Supply answers demand, but slowly and never fully: a new field or mine is
   *  a decade of work. This is the share of demand growth that new supply
   *  meets, so the remainder is real price appreciation. */
  supplyResponse: 0.7,

  /** Cycle amplitude by category — fuel swings hardest, food least. Periods
   *  differ per commodity so the whole market never turns at once. */
  cycleAmplitude: {
    FUEL: 0.3,
    INDUSTRIAL: 0.2,
    AGRICULTURE: 0.12,
    STRATEGIC: 0.26,
  } as Record<string, number>,
  cyclePeriod: { min: 3.5, max: 9 }, // years

  /** A market, not a lottery: prices stay within this band of their opening. */
  bounds: { lo: 0.45, hi: 3.2 },

  /** What a nation consumes each year as a share of its GDP, at opening
   *  prices. Everyone burns fuel; not everyone sells it. */
  consumption: {
    FUEL: 0.055,
    INDUSTRIAL: 0.035,
    AGRICULTURE: 0.03,
    STRATEGIC: 0.006,
  } as Record<string, number>,

  /** Commodity intensity FALLS with development — a service economy burns less
   *  per dollar of output than a smelting one. Multiplier at dev 1 is
   *  (1 - intensityDevSlope). */
  intensityDevSlope: 0.45,

  /** How hard a swing in the terms of trade lands on output, and the cap on
   *  it. A windfall is not infinite and a shock is not fatal: Saudi Arabia in a
   *  boom is not twice as rich, and Japan in an oil crisis does not halve. */
  termsSensitivity: 1.0,
  exposureCap: 0.25,
} as const;
