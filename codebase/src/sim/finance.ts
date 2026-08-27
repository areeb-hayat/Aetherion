/**
 * ============================================================================
 *  AETHERION — SOVEREIGN FINANCE LOGIC  (pure math; state lives in economyStore)
 * ============================================================================
 *  Whether bond markets will fund you, how loans amortize, when IMF tranches
 *  release, and what bilateral credit friendly capitals will extend. Every
 *  function here is deterministic and side-effect free — the store owns the
 *  Loan/ImfProgram state and calls these to advance it.
 */
import type { Loan, ImfProgram, NationLedger } from '@/types';
import type { CreditRating } from '@/config/economy';
import { YEAR_HOURS } from '@/config/economy';
import { BOND, IMF, BILATERAL, ratingAtOrBelow } from '@/config/finance';

/* ---- bond markets ---------------------------------------------------------- */

/** Will private creditors roll over / extend new debt at this profile?
 *  An active IMF program restores a window (the catalytic anchor). */
export function marketAccess(rating: CreditRating, debtToGdp: number, imfActive: boolean): boolean {
  if (imfActive) return true;
  if (rating === 'CC' || rating === 'D') return false;
  if (rating === 'CCC' && debtToGdp > BOND.cccDebtCutoff) return false;
  return true;
}

/* ---- loan book -------------------------------------------------------------- */

/** Annual interest due across the loan book ($/yr) — feeds LedgerMods.extraInterest. */
export function loanInterestPerYear(loans: Loan[]): number {
  let v = 0;
  for (const l of loans) v += l.outstanding * l.rate;
  return v;
}

/** True once a loan's grace window has lapsed and principal is amortizing. */
export function inRepayment(l: Loan, gameHours: number): boolean {
  return l.outstanding > 0 && gameHours >= l.startedAt + l.graceYears * YEAR_HOURS;
}

/** $/yr of principal currently falling due across the book (0 during grace).
 *  Part of the financing need — surpluses or fresh bonds must cover it. */
export function principalDuePerYear(loans: Loan[], gameHours: number): number {
  let v = 0;
  for (const l of loans) {
    if (!inRepayment(l, gameHours)) continue;
    v += Math.min(l.outstanding, l.principal / l.termYears);
  }
  return v;
}

/** Advance the book by `dtHours`: linear amortization after grace. Returns new
 *  loan objects (never mutates) plus any loans fully retired this step. */
export function amortizeLoans(
  loans: Loan[],
  gameHours: number,
  dtHours: number,
): { loans: Loan[]; principalPaid: number; retired: Loan[] } {
  let principalPaid = 0;
  const retired: Loan[] = [];
  const next: Loan[] = [];
  for (const l of loans) {
    if (!inRepayment(l, gameHours)) {
      next.push(l);
      continue;
    }
    const pay = Math.min(l.outstanding, (l.principal / l.termYears) * (dtHours / YEAR_HOURS));
    principalPaid += pay;
    const outstanding = l.outstanding - pay;
    if (outstanding <= 1) {
      principalPaid += Math.max(0, outstanding);
      retired.push({ ...l, outstanding: 0 });
    } else {
      next.push({ ...l, outstanding });
    }
  }
  return { loans: next, principalPaid, retired };
}

/* ---- IMF program ------------------------------------------------------------ */

/** Distress test for a stabilisation program: high debt, dry reserves or a
 *  junk rating. (Sovereignty + no-active-program are checked by the caller.) */
export function imfEligible(ledger: NationLedger, treasury: number): boolean {
  const monthlyRevenue = ledger.revenue.total / 12;
  const treasuryMonths = monthlyRevenue > 0 ? treasury / monthlyRevenue : 0;
  return (
    ledger.debtToGdp >= IMF.eligibility.minDebtToGdp ||
    treasuryMonths < IMF.eligibility.maxTreasuryMonths ||
    ratingAtOrBelow(ledger.creditRating, IMF.eligibility.maxRating)
  );
}

/** Tranches that should have been released by `gameHours` — the first on
 *  signature, then one per quarterly review through the disbursement window. */
export function imfTranchesDue(p: ImfProgram, gameHours: number): number {
  const quarters = Math.floor((gameHours - p.startedAt) / (YEAR_HOURS / 4));
  return Math.min(IMF.tranches, 1 + Math.max(0, quarters));
}

export const imfTrancheSize = (p: ImfProgram) => p.total / IMF.tranches;

/* ---- bilateral credit lines -------------------------------------------------- */

export interface BilateralOffer {
  lender: string;
  amount: number;
  rate: number;
  termYears: number;
  graceYears: number;
}

/** Price the credit friendly sovereigns would extend right now. `candidates`
 *  are sovereign nation ids with their GDPs; `opinionOf(lender, player)` is the
 *  LENDER's view. Lenders already holding our paper sit out until repaid. */
export function bilateralOffers(
  ledger: NationLedger,
  candidates: { id: string; gdp: number }[],
  opinionOf: (lender: string) => number,
  existingLenders: ReadonlySet<string>,
): BilateralOffer[] {
  const marketRate = ledger.interestRate;
  const offers: BilateralOffer[] = [];
  for (const c of candidates) {
    if (c.gdp <= 0 || existingLenders.has(c.id)) continue;
    const opinion = opinionOf(c.id);
    if (opinion < BILATERAL.minOpinion) continue;
    const rate = Math.min(
      marketRate,
      Math.max(BILATERAL.minRate, marketRate - (opinion / 100) * BILATERAL.opinionDiscount),
    );
    const amount = Math.min(BILATERAL.borrowerGdpFrac * ledger.gdp, BILATERAL.lenderGdpFrac * c.gdp);
    if (amount < 1e8) continue; // sub-$100M lines aren't worth the paperwork
    offers.push({ lender: c.id, amount, rate, termYears: BILATERAL.termYears, graceYears: BILATERAL.graceYears });
  }
  offers.sort((a, b) => a.rate - b.rate || b.amount - a.amount);
  return offers.slice(0, BILATERAL.maxOffers);
}
