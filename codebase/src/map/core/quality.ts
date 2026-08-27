/**
 * GPU quality tiering. The map's post-processing (coastline glow, animated
 * water, cinematic grade) is fragment-heavy; a discrete GPU eats it for
 * breakfast, an integrated one needs a lighter pass. We read the GL renderer
 * string once and pick a tier from tokens.mapViz.quality.
 *
 * NOTE: browsers (and Tauri's webview) often default to the integrated GPU even
 * on a laptop with a dGPU. To actually use an RTX, bind the app to the
 * high-performance GPU (Windows → Settings → Display → Graphics, or the NVIDIA
 * Control Panel; Chrome → enable "high performance"). See README.
 */
import { mapViz } from '@/config/tokens';
import type * as THREE from 'three';

export interface QualityTier {
  pixelRatio: number;
  maskScale: number;
  blurPasses: number;
  oceanIters: number;
}

const STRONG = /(nvidia|geforce|rtx|gtx|quadro|radeon|\brx\b|apple m\d|apple gpu|arc\b)/i;
const WEAK = /(intel|uhd|hd graphics|iris|microsoft basic|swiftshader|llvmpipe|software|mesa)/i;

export function detectQuality(renderer: THREE.WebGLRenderer): {
  tier: QualityTier;
  name: 'high' | 'low';
  gpu: string;
} {
  let gpu = 'unknown';
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) gpu = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
  } catch {
    /* keep 'unknown' */
  }
  // A strong keyword that isn't overridden by a weak one (ANGLE strings can list
  // both vendor and adapter) wins HIGH; otherwise play it safe with LOW.
  const strong = STRONG.test(gpu) && !WEAK.test(gpu);
  const name = strong ? 'high' : 'low';
  return { tier: mapViz.quality[name], name, gpu };
}
