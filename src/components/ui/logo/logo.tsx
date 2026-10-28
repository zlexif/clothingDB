import { cn } from '../../../lib/utils';

const SHIRT = [
  '...XXXX..XXXX...',
  '..XXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXX.XXXXXXXX.XXX',
  'XX..XXXXXXXX..XX',
  '....XXXXXXXX....',
  '....XXXXXXXX....',
  '....XXXXXXXX....',
  '....XXXXXXXX....',
  '....XXXXXXXX....',
  '....XXXXXXXX....',
  '....XXXXXXXX....',
];
const RAMP = ['#ffb347', '#ff7a1a', '#ff5c00', '#c2410c', '#7a1f00'];
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const W = SHIRT[0].length;
const H = SHIRT.length;

export const LOGO_PIXELS: [number, number, string][] = SHIRT.flatMap((row, y) =>
  [...row].flatMap((ch, x): [number, number, string][] => {
    if (ch !== 'X') return [];
    const th = (BAYER4[y % 4][x % 4] + 0.5) / 16;
    const t = (x / (W - 1)) * 0.45 + (y / (H - 1)) * 0.55;
    if (t > 0.78 && th < (t - 0.78) * 3.2) return [];
    const s = t * (RAMP.length - 1);
    const i = Math.min(RAMP.length - 1, Math.floor(s) + (s % 1 > th ? 1 : 0));
    return [[x, y, RAMP[i]]];
  }),
);

export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      className={cn('h-5 w-auto', className)}
    >
      {title && <title>{title}</title>}
      {LOGO_PIXELS.map(([x, y, c]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c} />
      ))}
    </svg>
  );
}

export function Logo({ className, credit = false }: { className?: string; credit?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-[15px] font-medium tracking-[-0.02em] text-fg-strong">clothingDB</span>
      {credit && (
        <span className="hidden items-center gap-2 text-[13px] text-fg-3 sm:inline-flex">
          <span aria-hidden="true" className="h-3.5 w-px bg-hairline-strong" />
          by Aura Development
        </span>
      )}
    </span>
  );
}
