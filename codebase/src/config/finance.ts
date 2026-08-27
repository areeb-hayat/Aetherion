/**
 * ============================================================================
 *  AETHERION — SOVEREIGN FINANCE RULESET  (GDD Ch.15: living the deficit)
 * ============================================================================
 *  How a state actually FUNDS a deficit: bond markets while creditors trust
 *  you, IMF programs when they don't, and bilateral loans from friendly
 *  capitals in between. Every knob for market access, program terms, austerity
 *  side-effects and the diplomatic fallout of borrowing/defaulting lives here.
 *  The mechanics are assembled in `sim/finance.ts` + `store/economyStore.ts`.
 */
import type { CreditRating } from './economy';
import { RATING_ORDER } from './economy';

/** Rating comparator: true when `a` is at or below (worse than) `b`. */
export function ratingAtOrBelow(a: CreditRating, b: CreditRating): boolean {
  return RATING_ORDER.indexOf(a) >= RATING_ORDER.indexOf(b);
}

/* ---- Bond markets (the default deficit financing) ------------------------- */

export const BOND = {
  /** Market access is LOST at CCC once debt passes this ratio, and always at
   *  CC/D — nobody rolls over the paper of a state visibly heading to default. */
  cccDebtCutoff: 1.0,
  /** "Repay bonds" retires this fraction of outstanding debt per click (a
   *  buyback tender, paid from treasury). */
  repayChunkFrac: 0.05,
} as const;

/* ---- IMF stabilisation program -------------------------------------------- */

export const IMF = {
  /** Program size as a fraction of GDP (≈ real Fund quota + exceptional
   *  access; Pakistan's 2023 SBA was ~1%, Argentina 2018 was ~9% — 5% is a
   *  meaty stabilisation package). */
  quotaGdpFrac: 0.05,
  /** Concessional rate — far below junk-market rates; that's the whole point. */
  rate: 0.03,
  termYears: 6,
  /** Disbursed over 2 years in quarterly tranches (conditionality reviews). */
  disburseYears: 2,
  tranches: 8,
  /** Repayment starts after disbursement completes + 1 year of grace. */
  graceYears: 3,
  /** Structural-adjustment conditionality while the program is active. */
  austerity: {
    socialMult: 0.85, // welfare cuts
    adminMult: 0.92, // civil-service trimming
    unrest: 7, // nationwide anger at the cuts
  },
  /** Fund backing floors the rating while the program is active (catalytic
   *  effect: an IMF anchor restores minimal market confidence). */
  ratingFloor: 'B' as CreditRating,
  /** Eligibility: sovereign, no active program, and visibly distressed —
   *  high debt OR nearly-dry reserves OR junk-rated. */
  eligibility: {
    minDebtToGdp: 0.5,
    maxTreasuryMonths: 2,
    maxRating: 'BB' as CreditRating,
  },
  /** The board's heavyweight shareholders — signing warms these capitals. */
  imfPowers: ['USA', 'GBR', 'FRA', 'DEU', 'JPN', 'ITA', 'CAN'],
  signOpinion: {
    powers: 6, // the West approves of orthodoxy
    /** Nations structurally hostile to Washington read a program as
     *  capitulation; applies when baselineOpinion(them, 'USA') ≤ threshold. */
    antiWestThreshold: -40,
    antiWest: -4,
  },
  /** Walking out early: austerity ends, undrawn tranches are cancelled, and
   *  the outstanding balance reprices to a penalty rate; the West cools. */
  earlyExit: {
    penaltyRate: 0.06,
    powersOpinion: -8,
  },
} as const;

/* ---- Bilateral sovereign loans (friend-shoring credit) --------------------- */

export const BILATERAL = {
  /** A sovereign offers credit only if it actually likes you. */
  minOpinion: 20,
  /** Rate = borrower's market rate discounted by warmth: rate − (opinion/100)
   *  × opinionDiscount, floored — friends lend below your market price. */
  opinionDiscount: 0.05,
  minRate: 0.015,
  /** Offer size: capped both by the borrower's absorption (share of own GDP)
   *  and the lender's willingness (share of LENDER GDP). */
  borrowerGdpFrac: 0.08,
  lenderGdpFrac: 0.012,
  termYears: 8,
  graceYears: 1,
  /** Diplomacy: taking a loan binds the pair; the lender's sworn rivals
   *  (baseline ≤ rivalThreshold) resent the alignment. */
  acceptOpinion: { borrowerToLender: 6, lenderToBorrower: 6, rivalThreshold: -50, rivals: -3 },
  /** Paying it off in full earns durable goodwill. */
  repaidOpinion: 4,
  /** Repudiation: the debt vanishes — and so does your name. */
  repudiate: {
    lenderOpinion: -45,
    casusBelli: 'Unpaid sovereign debts',
    worldOpinion: -10,
    /** Markets cap you at CCC for this long (selective-default stigma). */
    ratingCap: 'CCC' as CreditRating,
    ratingCapYears: 5,
  },
  /** How many offers the UI surfaces at once (best terms first). */
  maxOffers: 6,
} as const;
