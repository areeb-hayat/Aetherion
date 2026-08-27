/**
 * Camera command bridge — lets HUD widgets (zoom buttons, "frame the world")
 * drive the globe camera without holding a reference to the WebGL scene. The
 * GlobeScene registers itself on construction and unregisters on dispose; the
 * commands are safe no-ops while the map is still loading.
 */

export interface MapCommands {
  /** Dolly by a distance multiplier (<1 zooms in, >1 zooms out). */
  zoomBy(factor: number): void;
  /** Return to the framed-world home view. */
  resetView(): void;
}

let commands: MapCommands | null = null;

export function registerMapControl(c: MapCommands | null) {
  commands = c;
}

export const mapControl = {
  zoomIn: () => commands?.zoomBy(1 / 1.4),
  zoomOut: () => commands?.zoomBy(1.4),
  resetView: () => commands?.resetView(),
};
