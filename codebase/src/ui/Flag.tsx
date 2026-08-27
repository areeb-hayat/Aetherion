/** Country flag image (served offline from /data/flags/<iso2>.png). */
import { DATA } from '@/config/gameConfig';

export function Flag({ iso2, className = 'h-3.5' }: { iso2: string | null; className?: string }) {
  if (!iso2) return <span className={`inline-block aspect-[4/3] rounded-[2px] bg-steel ${className}`} />;
  return (
    <img
      src={`${DATA.map.flags}/${iso2}.png`}
      alt=""
      className={`inline-block rounded-[2px] ring-1 ring-black/30 ${className}`}
      loading="lazy"
    />
  );
}
