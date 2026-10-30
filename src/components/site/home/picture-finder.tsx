'use client';

import { Check, ChevronLeft, ChevronRight, Copy, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, categoryBySlug, type Gender, imageUrl, itemsWithPictures } from '../../../lib/clothing';
import { cn } from '../../../lib/utils';
import { type DrawableIndex, KINDS, wrap } from './shared';

type Backdrop = 'checker' | 'green' | 'magenta';
const BACKDROP: Record<Backdrop, string> = {
  checker: 'transparency-grid',
  green: 'bg-[#00ff00]',
  magenta: 'bg-[#ff00ff]',
};

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-0.5 rounded-full border border-hairline bg-canvas p-0.5"
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={cn(
            'press h-7 rounded-full px-3 text-[13px] capitalize',
            o === value ? 'bg-raised text-fg' : 'text-fg-2 hover:text-fg',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function PictureFinder({ index }: { index: DrawableIndex }) {
  const [gender, setGender] = useState<Gender>('male');
  const [slug, setSlug] = useState('tops');
  const [drawable, setDrawable] = useState(245);
  const [texture, setTexture] = useState(0);
  const [draft, setDraft] = useState<string | null>(null);
  const [backdrop, setBackdrop] = useState<Backdrop>('checker');
  const [copied, setCopied] = useState(false);

  const list = index[gender][slug] ?? [];
  const items = itemsWithPictures(list);
  const maxD = items.at(-1) ?? 0;
  const d = Math.min(drawable, maxD);
  const colours = list[d] ?? 0;
  const empty = colours === 0;
  const t = Math.max(0, Math.min(texture, colours - 1));
  const cat = categoryBySlug(slug)!;
  const url = imageUrl(gender, slug, d, t);

  const go = (n: number) => {
    setDrawable(Math.max(0, Math.min(maxD, n)));
    setTexture(0);
    setDraft(null);
  };
  const prev = items.findLast((n) => n < d);
  const next = items.find((n) => n > d);
  const step = (dir: 1 | -1) => {
    const n = dir === 1 ? next : prev;
    if (n !== undefined) go(n);
  };
  const at = Math.max(
    0,
    items.findIndex((n) => n >= d),
  );
  const from = Math.max(0, Math.min(at - 4, items.length - 9));
  const strip = items.slice(from, from + 9);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const label = 'text-[14px] text-fg-2';
  const arrow =
    'flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-card/80 text-fg-2 backdrop-blur hover:text-fg disabled:opacity-30';

  return (
    <section aria-labelledby="builder-title" className={cn(wrap, 'mt-40')}>
      <div className="mx-auto max-w-[1040px]">
        <div data-reveal>
          <h2 id="builder-title" className="text-step-4 text-fg-strong">
            Find any picture.
          </h2>
          <p className="mt-3 max-w-xl text-step-2 text-fg-2">
            Type the item number you need, or step through the ones next to it. Pick a colour and copy the address.
          </p>
        </div>

        <div
          data-ui
          data-reveal
          className="mt-10 grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-lg border border-hairline bg-card lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard and pointer handlers for the picture stage */}
          <div
            className="flex min-w-0 flex-col"
            onKeyDown={(e) => {
              if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
              if (e.key === 'ArrowLeft') step(-1);
              if (e.key === 'ArrowRight') step(1);
            }}
          >
            <div className={cn('relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] lg:flex-1', BACKDROP[backdrop])}>
              {empty ? (
                <p className="absolute inset-0 flex items-center justify-center px-10 text-center text-[15px] text-fg-2">
                  {cat.label} {d} has no picture. The game ships this number empty.
                </p>
              ) : (
                <img
                  src={url}
                  alt={`${gender} ${cat.label} ${d}, colour ${t}`}
                  width={512}
                  height={512}
                  className="absolute inset-0 h-full w-full object-contain p-10"
                />
              )}
              <div className="absolute right-3 top-3">
                <Segmented
                  label="Backdrop"
                  value={backdrop}
                  options={['checker', 'green', 'magenta']}
                  onChange={setBackdrop}
                />
              </div>
              <button
                type="button"
                aria-label="Previous item"
                disabled={prev === undefined}
                onClick={() => step(-1)}
                className={cn(arrow, 'absolute left-3 top-1/2 -translate-y-1/2')}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="Next item"
                disabled={next === undefined}
                onClick={() => step(1)}
                className={cn(arrow, 'absolute right-3 top-1/2 -translate-y-1/2')}
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="border-t border-hairline p-3">
              <ul className="grid grid-cols-5 gap-1.5 sm:grid-cols-9">
                {strip.map((n, i) => (
                  <li key={n} className={cn((i < 2 || i > 6) && 'hidden sm:block')}>
                    <button
                      type="button"
                      aria-label={`Item ${n}`}
                      aria-current={n === d || undefined}
                      onClick={() => go(n)}
                      className={cn(
                        'transparency-grid relative block aspect-square w-full overflow-hidden rounded-[10px] border',
                        n === d ? 'border-fg-2' : 'border-hairline opacity-70 hover:opacity-100',
                      )}
                    >
                      <img
                        src={imageUrl(gender, slug, n, 0)}
                        alt=""
                        width={80}
                        height={80}
                        loading="lazy"
                        className="h-full w-full object-contain p-1"
                      />
                      <span className="absolute bottom-0.5 left-1.5 text-[11px] tabular-nums text-fg-2">{n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-5 border-t border-hairline bg-elevated p-5 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between gap-3">
              <span className={label}>Ped</span>
              <Segmented label="Ped" value={gender} options={['male', 'female']} onChange={setGender} />
            </div>

            <label className="block">
              <span className={label}>Category</span>
              <select
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  go(0);
                }}
                className="mt-2 h-10 w-full rounded-full border border-hairline bg-canvas px-4 text-[14px] text-fg"
              >
                {KINDS.map((k) => (
                  <optgroup key={k.type} label={k.label}>
                    {CATEGORIES.filter((c) => c.type === k.type).map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <div>
              <label htmlFor="finder-item" className={label}>
                Item number
              </label>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-12 flex-1 items-center rounded-full border border-hairline bg-canvas pl-5 pr-4 focus-within:border-fg-3">
                  <input
                    id="finder-item"
                    inputMode="numeric"
                    autoComplete="off"
                    value={draft ?? String(d)}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setDraft(v);
                      if (v !== '' && Number(v) <= maxD) {
                        setDrawable(Number(v));
                        setTexture(0);
                      }
                    }}
                    onBlur={() => draft !== null && go(draft === '' ? d : Number(draft))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur();
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        step(1);
                      }
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        step(-1);
                      }
                    }}
                    className="w-full min-w-0 bg-transparent text-[22px] font-medium tabular-nums text-fg outline-none"
                  />
                  <span className="shrink-0 text-[14px] tabular-nums text-fg-3">of 0–{maxD}</span>
                </div>
                <button
                  type="button"
                  aria-label="Previous item"
                  disabled={prev === undefined}
                  onClick={() => step(-1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-canvas text-fg-2 hover:text-fg disabled:opacity-30"
                >
                  <Minus size={15} />
                </button>
                <button
                  type="button"
                  aria-label="Next item"
                  disabled={next === undefined}
                  onClick={() => step(1)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-canvas text-fg-2 hover:text-fg disabled:opacity-30"
                >
                  <Plus size={15} />
                </button>
              </div>
              {draft !== null && draft !== '' && Number(draft) > maxD && (
                <p className="mt-2 text-[13px] text-fg-3">
                  The last {cat.label.toLowerCase()} item is {maxD}.
                </p>
              )}
            </div>

            <div>
              <p className={label}>
                Colour <span className="tabular-nums text-fg-3">· {colours}</span>
              </p>
              <ul className="mt-2 grid max-h-[148px] grid-cols-6 gap-1.5 overflow-y-auto">
                {Array.from({ length: colours }, (_, n) => (
                  <li key={`${d}-${n}`}>
                    <button
                      type="button"
                      aria-label={`Colour ${n}`}
                      aria-pressed={n === t}
                      onClick={() => setTexture(n)}
                      className={cn(
                        'transparency-grid block aspect-square w-full overflow-hidden rounded-[8px] border',
                        n === t ? 'border-fg-2' : 'border-hairline hover:border-fg-3',
                      )}
                    >
                      <img
                        src={imageUrl(gender, slug, d, n)}
                        alt=""
                        width={48}
                        height={48}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto space-y-2 pt-2">
              <code className="block truncate rounded-full border border-hairline bg-canvas px-4 py-2.5 text-[13px] text-fg-2">
                {url}
              </code>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={empty}
                  onClick={() => void copy()}
                  className={cn(
                    'press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] font-medium disabled:opacity-40',
                    copied ? 'bg-forest text-fg-strong' : 'bg-primary text-primary-ink hover:bg-primary/85',
                  )}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy address'}
                </button>
                <a
                  href={empty ? undefined : url}
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={empty}
                  className="press flex h-10 flex-1 aria-disabled:pointer-events-none aria-disabled:opacity-40 items-center justify-center rounded-full border border-hairline bg-canvas text-[14px] font-medium text-fg hover:bg-raised"
                >
                  Open image
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
