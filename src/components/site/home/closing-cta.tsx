'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, categoryBySlug, itemsWithPictures } from '../../../lib/clothing';
import { cn } from '../../../lib/utils';
import { CtaField } from '../art';
import { type DrawableIndex, POPULAR, slotThumb, wrap } from './shared';

export function ClosingCta({ index, renders }: { index: DrawableIndex; renders: number }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  const term = q.trim().toLowerCase();
  const matches = (
    term
      ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(term) || c.slug.includes(term.replace(/\s+/g, '-')))
      : POPULAR.map((s) => categoryBySlug(s)!)
  ).slice(0, 6);
  const total = (slug: string) =>
    itemsWithPictures(index.male[slug] ?? []).length + itemsWithPictures(index.female[slug] ?? []).length;
  const goTo = (slug: string) => window.location.assign(`/browse/${slug}`);

  return (
    <section aria-labelledby="cta-title" className={cn(wrap, 'mt-40')}>
      <div className="relative isolate flex min-h-[78svh] items-center overflow-hidden rounded-t-[28px] border border-b-0 border-hairline pb-24">
        <div className="absolute inset-0 -z-10">
          <CtaField />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-canvas via-canvas/80 to-transparent lg:via-canvas/40"
        />

        <div data-reveal className="w-full max-w-[640px] px-6 py-24 sm:px-14">
          <h2 id="cta-title" className="text-step-5 text-fg-strong">
            Find the piece
            <br />
            you need.
          </h2>
          <p className="mt-5 max-w-[46ch] text-step-2 text-fg-2">
            {renders.toLocaleString()} pictures across {CATEGORIES.length} slots, for male and female. Search one, or
            jump straight in.
          </p>

          <form
            role="search"
            className="relative mt-10"
            onSubmit={(e) => {
              e.preventDefault();
              const hit = matches[hi];
              if (hit) goTo(hit.slug);
            }}
          >
            <label className="flex h-14 items-center gap-3 rounded-full border border-hairline bg-card/90 pl-5 pr-2 backdrop-blur focus-within:border-fg-3">
              <Search size={18} strokeWidth={1.5} className="shrink-0 text-icon" />
              <input
                value={q}
                role="combobox"
                aria-expanded={open}
                aria-controls="cta-results"
                aria-label="Search a slot"
                autoComplete="off"
                placeholder="Search a slot, like shoes or makeup"
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 120)}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHi(0);
                  setOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHi((h) => Math.min(h + 1, matches.length - 1));
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHi((h) => Math.max(h - 1, 0));
                  }
                  if (e.key === 'Escape') setOpen(false);
                }}
                className="min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-3"
              />
              <button
                type="submit"
                className="press flex h-10 shrink-0 items-center rounded-full bg-primary px-5 text-[14px] font-medium text-primary-ink hover:bg-primary/85"
              >
                Open
              </button>
            </label>

            {open && (
              <ul
                id="cta-results"
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: combobox listbox, focus stays on the input
                role="listbox"
                className="absolute inset-x-0 bottom-[calc(100%+8px)] z-10 overflow-hidden rounded-[18px] border border-hairline bg-card p-1.5 shadow-popover"
              >
                {!term && <li className="px-3 pb-1 pt-2 text-[12px] text-fg-3">Popular</li>}
                {matches.map((c, n) => (
                  // biome-ignore lint/a11y: combobox option, focus stays on the input via aria-activedescendant
                  <li key={c.slug} role="option" aria-selected={n === hi}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setHi(n)}
                      onClick={() => goTo(c.slug)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[12px] px-2 py-1.5 text-left',
                        n === hi ? 'bg-elevated' : '',
                      )}
                    >
                      <span className="transparency-grid h-10 w-10 shrink-0 overflow-hidden rounded-[8px] border border-hairline">
                        <img
                          src={slotThumb(c.slug)}
                          alt=""
                          width={40}
                          height={40}
                          loading="lazy"
                          className="h-full w-full object-contain p-0.5"
                        />
                      </span>
                      <span className="flex-1 text-[15px] text-fg">{c.label}</span>
                      <span className="text-[13px] tabular-nums text-fg-3">{total(c.slug).toLocaleString()} items</span>
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-3 py-3 text-[14px] text-fg-2">No slot matches “{q}”. Try tops, shoes or hats.</li>
                )}
              </ul>
            )}
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            {POPULAR.map((s) => (
              <a
                key={s}
                href={`/browse/${s}`}
                className="press inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-card/80 pl-1.5 pr-4 text-[14px] text-fg-2 backdrop-blur hover:bg-elevated hover:text-fg"
              >
                <img
                  src={slotThumb(s)}
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  className="h-7 w-7 rounded-full bg-canvas object-contain"
                />
                {categoryBySlug(s)!.label}
              </a>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            <a
              href="/browse"
              className="press inline-flex h-11 items-center rounded-full bg-primary px-5 text-[15px] font-medium text-primary-ink hover:bg-primary/85"
            >
              Browse the directory
            </a>
            <a
              href="/creator"
              className="press inline-flex h-11 items-center rounded-full border border-hairline bg-canvas/80 px-5 text-[15px] font-medium text-fg backdrop-blur hover:bg-elevated"
            >
              Open Creator Lab
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
