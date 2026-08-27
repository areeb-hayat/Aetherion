# Aetherion — Phase 1: The World Graph

A real-time geopolitical simulator. **Phase 1** delivers the foundation: a flat,
equal-area **Equal Earth** map of the **entire world** rendered as crisp vectors
(razor-sharp at any zoom) at **district level** — ~218 nations and **~49,000
districts** — with rivers, lakes, cities, a NASA Blue Marble terrain overlay, all
14 map overlays, hover/selection with a custom cursor, a worker-driven simulation
clock, and the floating HUD. 60fps, structured to grow into the full simulation.

Data: geoBoundaries ADM2 districts (CC-BY) + Natural Earth rivers/lakes/cities
(public domain) + NASA Blue Marble (public domain). Switch to lighter Natural
Earth provinces via `PROVINCE_SOURCE` in `scripts/etl/config.mjs`.

Built on **Vite + React + TypeScript + Three.js + Tauri** (see
[DECISIONS.md](./DECISIONS.md) for why, including the deviation from the TDD's
Next.js).

---

## Quick start

```bash
pnpm install      # install dependencies
pnpm etl          # generate world map data (downloads Natural Earth, ~50MB, once)
pnpm dev          # run in the browser at http://localhost:1420
```

Open **http://localhost:1420**. That's it — **no Rust needed** to run in the
browser. (`pnpm etl` only needs to run once; its output is committed to
`public/data/`, so a fresh clone can skip straight to `pnpm dev`.)

### Controls

| Input | Action |
| --- | --- |
| Drag | Pan map · Scroll | Zoom to cursor |
| Hover | District tooltip · Click | Select district |
| `1` `2` `3` | Sim speed · `Space` | Pause |
| `H` | Hide/show HUD · `Esc` | Deselect |
| Bottom toolbar | Switch the 14 overlays (incl. **TER** = terrain reveal) |

---

## Running as a desktop app (Tauri)

The desktop build is optional for Phase 1 but ready to go. It needs Rust on your
PATH — Rust **is installed** on this machine, it's just not exported to the
shell:

1. **Fix the PATH** (Rust lives at `C:\Users\<you>\.cargo\bin`):
   - Restart your terminal (the installer added it; new shells pick it up), or
   - run `& "$env:USERPROFILE\.cargo\bin\rustup.exe" default stable` once to
     refresh, or
   - add `%USERPROFILE%\.cargo\bin` to your user PATH and reopen the terminal.
   - Verify: `cargo --version` should print `cargo 1.x`.
2. **Generate app icons** (one-time, Tauri needs them to bundle):
   ```bash
   pnpm tauri icon path/to/any-1024x1024.png
   ```
3. **Run / build the desktop app:**
   ```bash
   pnpm tauri dev      # native window with hot reload
   pnpm tauri build    # produces a native installer / .exe
   ```

The Tauri config sets the same COOP/COEP headers as the dev server, so the
simulation's `SharedArrayBuffer` works identically in the desktop build.

---

## Project layout

```
scripts/etl/         Geo data pipeline (download → process → bake ID texture)
public/data/         Generated: world.json + province-id-map.png (+ manifest)
src/
  config/            ⭐ SINGLE SOURCE OF TRUTH — tokens (colors/motion), game
                        constants, overlay registry, keybindings
  types/             All shared TypeScript shapes
  lib/               Pure helpers (color, geo, format)
  store/             Zustand stores (ui, world, sim, notifications)
  engine/            Simulation: SharedArrayBuffer layout, tick worker, client
  map/               Three.js globe: shaders, scene, overlay controller, picker
  features/          UI features (hud, district, overlays, tooltip, cursor, …)
  ui/                Reusable primitives (Panel, Button, StatRow)
src-tauri/           Desktop shell (Rust — you don't write Rust)
```

### Where to change things (centralization)

- **A color, a motion timing, a radius?** → `src/config/tokens.ts` only. It feeds
  Tailwind classes, CSS variables, *and* the Three.js shaders.
- **A map overlay?** → `src/config/overlays.ts` — one entry per view.
- **A sim constant (clock speed, start date, player nation)?** →
  `src/config/gameConfig.ts`.
- **A keyboard shortcut?** → `src/config/keybindings.ts`.

No component hard-codes a hex value, a duration, or a magic number.

---

## Regenerating map data

```bash
pnpm etl              # download sources + build the vector map
pnpm etl:build        # rebuild the map only (after editing config)
```

Edit `scripts/etl/config.mjs`: `PROVINCE_SOURCE` (`'adm2'` districts vs
`'admin1'` provinces), `SCOPE.onlyNations` (regional slice), `CITY_MIN_POP`.
For district data setup see `scripts/etl/simplify-adm2.md`.

---

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | Vite dev server (browser) |
| `pnpm build` | Typecheck + production web build |
| `pnpm typecheck` | TypeScript only |
| `pnpm etl` | Download sources + build the vector map |
| `pnpm etl:build` | Rebuild the map from cached sources |
| `pnpm tauri dev` / `build` | Desktop app (needs Rust on PATH) |
