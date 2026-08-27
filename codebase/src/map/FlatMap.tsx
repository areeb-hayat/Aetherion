/** React mount point for the 3D globe renderer. */
import { useEffect, useRef, useState } from 'react';
import { loadFlatMap } from '@/map/data/mapLoader';
import { GlobeScene } from '@/map/core/GlobeScene';
import { useWorldStore } from '@/store/worldStore';

type Status = 'loading' | 'ready' | 'error';

export function FlatMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setWorld = useWorldStore((s) => s.setWorld);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let scene: GlobeScene | null = null;

    loadFlatMap()
      .then((data) => {
        if (cancelled || !containerRef.current || !canvasRef.current) return;
        setWorld(data.world, data.cities);
        scene = new GlobeScene(containerRef.current, canvasRef.current, data);
        setStatus('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setError(String(e?.message ?? e));
        setStatus('error');
      });

    return () => {
      cancelled = true;
      scene?.dispose();
    };
  }, [setWorld]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" style={{ touchAction: 'none' }} />
      {status !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {status === 'loading' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="font-display text-3xl font-semibold tracking-[0.42em] text-gold-light [text-shadow:0_0_24px_rgba(184,134,11,0.35)]">
                AETHERION
              </div>
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-px w-12 bg-gradient-to-r from-transparent to-gold/60" />
                <span aria-hidden className="text-[9px] text-gold/80">✦</span>
                <span className="animate-pulse font-serif text-sm italic tracking-[0.18em] text-slate">
                  Charting the world
                </span>
                <span aria-hidden className="text-[9px] text-gold/80">✦</span>
                <span aria-hidden className="h-px w-12 bg-gradient-to-l from-transparent to-gold/60" />
              </div>
            </div>
          ) : (
            <div className="max-w-md rounded-md bg-gradient-to-b from-crimson/60 to-steel/30 p-px shadow-[0_12px_40px_rgba(0,0,0,0.55)]">
              <div className="rounded-[7px] bg-gradient-to-b from-navy/95 to-ink/95 p-4 font-mono text-sm text-off-white">
                <div className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-crimson">
                  Failed to load map data
                </div>
                <div className="text-slate">{error}</div>
                <div className="mt-2 text-xs text-slate">
                  Run <span className="text-gold">pnpm etl</span> to generate the map, then reload.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
