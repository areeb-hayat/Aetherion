/**
 * ============================================================================
 *  AETHERION — SOVEREIGNTY LOGIC  (pure reads over the autonomy config)
 * ============================================================================
 *  Answers "who is this nation's sovereign?", "what may it do?", and "who runs
 *  its foreign policy?" — the questions the UI, diplomacy and AI scheduler all
 *  ask. All data comes from config/autonomy.ts (generated sovereignty.json +
 *  the control matrix). No state, no side effects.
 */
import {
  AUTONOMY,
  DEPENDENCIES,
  CONTESTED,
  type AutonomyTier,
  type Controls,
  type DependencyRec,
} from '@/config/autonomy';

/* -- runtime override: polities that WON independence this campaign ---------
 * politicsStore feeds this on hydration/change so the static NE-derived map is
 * corrected by campaign history without a store import cycle here. */
let independent: ReadonlySet<string> = new Set();
export function setIndependentOverride(ids: Iterable<string>) {
  independent = new Set(ids);
  _deps = null; // reverse index must rebuild
}

/** The dependency record for a nation, or null if it is a sovereign state. */
export function dependencyRec(id: string): DependencyRec | null {
  if (independent.has(id)) return null;
  return DEPENDENCIES[id] ?? null;
}

export function autonomyTier(id: string): AutonomyTier {
  return dependencyRec(id)?.tier ?? 'INTEGRAL';
}

export function isSovereign(id: string): boolean {
  return !dependencyRec(id);
}

export function isDependency(id: string): boolean {
  return !!dependencyRec(id);
}

export function isContested(id: string): boolean {
  return CONTESTED.has(id) || !!DEPENDENCIES[id]?.contested;
}

/** The sovereign that administers `id` (itself if already sovereign). */
export function sovereignOf(id: string): string {
  return dependencyRec(id)?.sovereign ?? id;
}

/** What `id` may do itself (develop / police / military / diplomacy). */
export function controls(id: string): Controls {
  return AUTONOMY[autonomyTier(id)].controls;
}

/** The nation that actually conducts `id`'s foreign relations: itself if it has
 *  full/limited diplomacy, otherwise its sovereign. Diplomacy, wars and the
 *  diplomacy card all resolve through this so a dependency shares its sovereign's
 *  stances instead of holding its own. */
export function effectiveForeignPolicyNation(id: string): string {
  return controls(id).diplomacy === 'none' ? sovereignOf(id) : id;
}

/* -- reverse index: sovereign → its dependencies (built once) --------------- */
let _deps: Map<string, string[]> | null = null;
function depIndex(): Map<string, string[]> {
  if (_deps) return _deps;
  const m = new Map<string, string[]>();
  for (const [dep, rec] of Object.entries(DEPENDENCIES)) {
    if (independent.has(dep)) continue; // won independence this campaign
    if (!m.has(rec.sovereign)) m.set(rec.sovereign, []);
    m.get(rec.sovereign)!.push(dep);
  }
  _deps = m;
  return m;
}

/** The dependencies administered by a sovereign (empty for most nations). */
export function dependenciesOf(sovereignId: string): string[] {
  return depIndex().get(sovereignId) ?? [];
}

export const autonomyLabel = (id: string): string => AUTONOMY[autonomyTier(id)].label;

/** "Overseas Territory of France" — needs a name resolver for the sovereign. */
export function sovereigntyDescriptor(id: string, nameOf: (id: string) => string | undefined): string | null {
  const rec = dependencyRec(id);
  if (!rec) return null;
  return `${AUTONOMY[rec.tier].label} of ${nameOf(rec.sovereign) ?? rec.sovereign}`;
}
