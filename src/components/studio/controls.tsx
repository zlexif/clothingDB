'use client';

import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Pills<T extends string | number>({
  value,
  options,
  onChange,
  label,
  render = (o) => String(o),
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  label: string;
  render?: (o: T) => string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-0.5 rounded-full border border-hairline bg-canvas p-0.5"
    >
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={cn(
            'press h-7 flex-1 whitespace-nowrap rounded-full px-3 text-[13px] capitalize',
            o === value ? 'bg-raised text-fg' : 'text-fg-2 hover:text-fg',
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] text-fg-2">{label}</p>
      {children}
    </div>
  );
}

export function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex h-9 items-center rounded-full border border-hairline bg-canvas px-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="press h-7 w-7 rounded-full text-fg-2 hover:bg-elevated hover:text-fg"
      >
        −
      </button>
      <input
        type="number"
        min={0}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full min-w-0 bg-transparent text-center text-[14px] tabular-nums text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(value + 1)}
        className="press h-7 w-7 rounded-full text-fg-2 hover:bg-elevated hover:text-fg"
      >
        +
      </button>
    </div>
  );
}
