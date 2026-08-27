/**
 * Assemble the shareable release folder from a finished `tauri build`.
 *
 * Produces, at the repo root:
 *
 *   release/
 *     Aetherion-Setup-<version>.exe   double-click: installs, Start menu, shortcut
 *     Aetherion-portable/             unzip and run, installs nothing
 *     README.txt
 *   Aetherion-<version>-windows.zip   the whole folder, ready to hand over
 *
 * Run via `pnpm release` (which builds first). Windows-only by design: the
 * bundle it packages is a Windows NSIS installer.
 */
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const repo = resolve(root, '..');
const version = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8')).version;

const setupSrc = join(root, `src-tauri/target/release/bundle/nsis/Aetherion_${version}_x64-setup.exe`);
const exeSrc = join(root, 'src-tauri/target/release/aetherion.exe');
for (const f of [setupSrc, exeSrc]) {
  if (!existsSync(f)) {
    console.error(`missing ${f}\nRun \`pnpm tauri build\` first (or use \`pnpm release\`, which does).`);
    process.exit(1);
  }
}

const out = join(repo, 'release');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'Aetherion-portable'), { recursive: true });

copyFileSync(setupSrc, join(out, `Aetherion-Setup-${version}.exe`));
copyFileSync(exeSrc, join(out, 'Aetherion-portable', 'Aetherion.exe'));

writeFileSync(
  join(out, 'README.txt'),
  `AETHERION ${version}
Real-time geopolitical simulator — the whole world at district level.

TO INSTALL
  Run  Aetherion-Setup-${version}.exe
  It installs the game, adds a Start-menu entry and a desktop shortcut, and
  registers an uninstaller under Settings > Apps.

TO RUN WITHOUT INSTALLING
  Open  Aetherion-portable\\  and run Aetherion.exe. Nothing is written outside
  your user profile, and nothing is registered.

REQUIREMENTS
  Windows 10 or 11, 64-bit. Nothing else — the entire world map (276 nations,
  56,034 provinces, terrain, rivers, coastlines) is inside the executable, so
  there is no download on first run and no internet needed to play.
  On Windows 10 without Microsoft Edge WebView2, the installer fetches it;
  Windows 11 already has it.

A NOTE ON GRAPHICS
  If your machine has both an integrated and a discrete GPU, Windows may hand
  the game the integrated one. For the full visual quality, bind it to the
  discrete card: Settings > Display > Graphics > Add desktop app > Aetherion >
  Options > High performance.

SAVING
  The campaign autosaves continuously and resumes where you left it. Saves are
  per-user and local to your machine.
`.replace(/\n/g, '\r\n'),
);

// Compress-Archive keeps this to the platform's own tooling — no zip dependency.
const zip = join(repo, `Aetherion-${version}-windows.zip`);
rmSync(zip, { force: true });
execFileSync(
  'powershell',
  ['-NoProfile', '-Command', `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}' -CompressionLevel Optimal`],
  { stdio: 'inherit' },
);

const mb = (p) => (readFileSync(p).length / 1048576).toFixed(0);
console.log(`\nrelease/  Aetherion-Setup-${version}.exe (${mb(join(out, `Aetherion-Setup-${version}.exe`))} MB)`);
console.log(`          Aetherion-portable/Aetherion.exe (${mb(join(out, 'Aetherion-portable', 'Aetherion.exe'))} MB)`);
console.log(`          README.txt`);
console.log(`${zip} (${mb(zip)} MB) — this is the file to share.`);
