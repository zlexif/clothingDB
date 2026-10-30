'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';

type Size = 'sm' | 'md';

const TILE: Record<Size, string> = {
  sm: 'h-[22px] w-[15px] rounded-[4px] text-[13px]',
  md: 'h-11 w-8 rounded-[8px] text-[26px]',
};

function Half({ digit, half, className }: { digit: string; half: 'top' | 'bottom'; className?: string }) {
  return (
    <span
      className={cn(
        'absolute inset-x-0 h-1/2 overflow-hidden bg-elevated [backface-visibility:hidden]',
        half === 'top' ? 'top-0 rounded-t-[inherit]' : 'bottom-0 rounded-b-[inherit]',
        className,
      )}
    >
      <span
        className={cn(
          'absolute inset-x-0 flex h-[200%] items-center justify-center font-medium tabular-nums leading-none',
          half === 'top' ? 'top-0' : 'bottom-0',
        )}
      >
        {digit}
      </span>
    </span>
  );
}

function Card({ digit, dim, size }: { digit: string; dim: boolean; size: Size }) {
  const [shown, setShown] = useState(digit);
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    if (digit === shown) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(digit);
      return;
    }
    setFrom(shown);
    setShown(digit);
    const t = setTimeout(() => setFrom(null), 520);
    return () => clearTimeout(t);
  }, [digit]);

  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block border border-hairline [perspective:120px]',
        TILE[size],
        dim ? 'text-fg-3/50' : 'text-fg-strong',
      )}
    >
      <Half digit={shown} half="top" />
      <Half digit={from ?? shown} half="bottom" />
      {from !== null && (
        <>
          <Half key={`t${from}${shown}`} digit={from} half="top" className="flap-top z-10 origin-bottom" />
          <Half key={`b${from}${shown}`} digit={shown} half="bottom" className="flap-bottom z-10 origin-top" />
        </>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-canvas" />
    </span>
  );
}

export function FlipCounter({
  value,
  minDigits = 3,
  size = 'md',
  className,
  label,
}: {
  value: number;
  minDigits?: number;
  size?: Size;
  className?: string;
  label?: string;
}) {
  const text = String(Math.max(0, Math.floor(value)));
  const digits = text.padStart(minDigits, '0').split('');
  const lead = digits.length - text.length;

  return (
    <span
      role="img"
      aria-label={label ?? text}
      className={cn('inline-flex align-middle', size === 'sm' ? 'gap-0.5' : 'gap-1', className)}
    >
      {digits.map((d, i) => (
        <Card key={digits.length - i} digit={d} dim={i < lead} size={size} />
      ))}
    </span>
  );
}
