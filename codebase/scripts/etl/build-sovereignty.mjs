/**
 * ============================================================================
 *  AETHERION ETL — STEP: SOVEREIGNTY  (`pnpm etl:sov`)
 * ============================================================================
 *  Derives the real sovereign → dependency map from the Natural Earth admin-0
 *  cache and writes it to src/config/sovereignty.json (a runtime lookup — it
 *  does NOT touch world.json or any binary, so it is safe to run standalone and
 *  needs no re-download).
 *
 *  Natural Earth groups every polity under a SOV_A3 pseudo-code ("FR1", "GB1",
 *  "US1", …). Within a group:
 *    • the METROPOLE is the member with an empty NOTE_ADM0 (mainland France,
 *      the UK, the USA …) — it becomes the `sovereign`.
 *    • every member carrying a note ("Fr.", "U.K.", "U.S.A.", "Den." …) is a
 *      DEPENDENCY of that metropole. Its autonomy TIER comes from NE's TYPE:
 *        Country     → CONSTITUENT_COUNTRY (Greenland, Aruba, Hong Kong, Jersey)
 *        Dependency  → OVERSEAS_TERRITORY  (French Polynesia, Bermuda, Guam)
 *        Lease       → MILITARY_LEASE      (Guantanamo, Baykonur — see overrides)
 *        Disputed    → OVERSEAS_TERRITORY  + contested (Gibraltar, Falklands)
 *      "Assoc. with N.Z." notes → FREE_ASSOCIATION (Cook Islands, Niue).
 *    • an empty-note member that is NOT the metropole (Palestine vs Israel) is
 *      a CONTESTED sovereign, never a vassal.
 *
 *  Autonomy tier semantics (what each can do) live in src/config/autonomy.ts.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATHS, SOURCES } from './config.mjs';
import { readJson, writeJson, log, prop } from './lib/util.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../src/config/sovereignty.json');

/** Judgment overrides applied AFTER the automatic derivation. NE files the two
 *  military leases under the LESSOR (Cuba, Kazakhstan); gameplay wants them under
 *  the administering power instead. */
const OVERRIDES = {
  USG: { sovereign: 'USA', tier: 'MILITARY_LEASE' }, // Guantanamo Bay
  KAB: { sovereign: 'RUS', tier: 'MILITARY_LEASE' }, // Baykonur Cosmodrome
  FRO: { sovereign: 'DNK', tier: 'CONSTITUENT_COUNTRY' }, // Faroe — home rule like Greenland
};

/** NE TYPE + note → our autonomy tier. */
function tierFor(type, note) {
  if (note && /assoc/i.test(note)) return 'FREE_ASSOCIATION';
  switch (type) {
    case 'Lease':
      return 'MILITARY_LEASE';
    case 'Country':
      return 'CONSTITUENT_COUNTRY';
    case 'Dependency':
      return 'OVERSEAS_TERRITORY';
    case 'Disputed':
      return 'OVERSEAS_TERRITORY'; // administered-but-claimed (Gibraltar, Falklands)
    default:
      return 'OVERSEAS_TERRITORY';
  }
}

function main() {
  const admin0 = readJson(path.join(PATHS.cache, SOURCES.admin0.file));

  // Group every feature by its SOV_A3 pseudo-code.
  const groups = new Map();
  for (const f of admin0.features) {
    const p = f.properties;
    const a3 = prop(p, 'ADM0_A3', 'adm0_a3');
    const sov = prop(p, 'SOV_A3', 'sov_a3');
    if (!a3 || !sov) continue;
    const rec = {
      a3,
      sov,
      type: prop(p, 'TYPE', 'type') || '',
      note: (prop(p, 'NOTE_ADM0', 'note_adm0') || '').trim(),
      name: prop(p, 'ADMIN', 'NAME', 'name') || a3,
    };
    if (!groups.has(sov)) groups.set(sov, []);
    groups.get(sov).push(rec);
  }

  const dependencies = {}; // a3 → { sovereign, tier, kind, contested?, note }
  const contested = new Set();

  for (const [, members] of groups) {
    if (members.length < 2) continue; // a lone member is a plain sovereign state

    // Metropole = the empty-note member (prefer a Sovereign/Country TYPE if tied).
    const metropoles = members.filter((m) => !m.note);
    let parent = metropoles[0];
    for (const m of metropoles) {
      if (/^Sovereign/.test(m.type) || m.type === 'Country' || m.type === 'Sovereignty') {
        parent = m;
        break;
      }
    }
    if (!parent) continue;

    for (const m of members) {
      if (m.a3 === parent.a3) continue;
      if (!m.note) {
        // Empty-note sibling of a metropole = a contested sovereign (Palestine).
        contested.add(m.a3);
        continue;
      }
      dependencies[m.a3] = {
        sovereign: parent.a3,
        tier: tierFor(m.type, m.note),
        kind: m.type || 'Dependency',
        note: m.note,
        contested: m.type === 'Disputed' || undefined,
      };
    }
  }

  // Apply hand overrides (lease administering power).
  for (const [a3, ov] of Object.entries(OVERRIDES)) {
    dependencies[a3] = { ...(dependencies[a3] || {}), ...ov, kind: dependencies[a3]?.kind || 'Lease' };
  }

  const out = {
    generated: new Date().toISOString(),
    source: 'Natural Earth 10m admin_0 (SOV_A3 / TYPE / NOTE_ADM0)',
    dependencyCount: Object.keys(dependencies).length,
    dependencies,
    contested: [...contested].sort(),
  };
  writeJson(OUT, out, true);

  // Report.
  const byTier = {};
  for (const d of Object.values(dependencies)) byTier[d.tier] = (byTier[d.tier] || 0) + 1;
  log.step('Sovereignty map');
  log.ok(`${out.dependencyCount} dependencies → ${OUT.replace(/.*[\\/]/, '')}`);
  log.info(`tiers: ${JSON.stringify(byTier)}`);
  log.info(`contested (kept sovereign): ${out.contested.join(', ') || '—'}`);
  // Spot-checks called out in the plan.
  for (const a3 of ['PYF', 'NCL', 'PRI', 'GUM', 'GRL', 'FRO', 'HKG']) {
    const d = dependencies[a3];
    log.info(`  ${a3} → ${d ? `${d.sovereign} (${d.tier})` : 'NONE'}`);
  }
}

main();
