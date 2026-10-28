'use client';

import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { ChangeArea, ChangeKind, ChangelogEntry } from '../../lib/site-data';
import { cn } from '../../lib/utils';

const AREAS: ('All' | ChangeArea)[] = ['All', 'Directory', 'Creator Lab', 'Pictures', 'Site'];

const KIND: Record<ChangeKind, { label: string; dot: string; text: string }> = {
  new: { label: 'New', dot: 'bg-ember', text: 'text-ember' },
  improved: { label: 'Improved', dot: 'bg-verdant', text: 'text-verdant' },
  fixed: { label: 'Fixed', dot: 'bg-amber', text: 'text-amber' },
};

const ease = [0.16, 1, 0.3, 1] as const;

export function ChangelogView({ entries }: { entries: ChangelogEntry[] }) {
  const [area, setArea] = useState<'All' | ChangeArea>('All');
  const list = useMemo(() => entries.filter((e) => area === 'All' || e.areas.includes(area)), [entries, area]);
  const count = (a: 'All' | ChangeArea) =>
    a === 'All' ? entries.length : entries.filter((e) => e.areas.includes(a)).length;

  return (
    <div
      className={cn(
        'mx-auto grid max-w-6xl gap-10 px-6 pb-24 pt-10',
        entries.length > 1 ? 'lg:grid-cols-[200px_minmax(0,1fr)]' : 'max-w-4xl',
      )}
    >
      <aside className={cn('lg:sticky lg:top-10 lg:self-start', entries.length < 2 && 'hidden')}>
        <p className="text-[13px] text-fg-3">Show</p>
        <LayoutGroup id="changelog-areas">
          <div role="tablist" aria-label="Area" className="mt-2 flex flex-wrap gap-1 lg:flex-col">
            {AREAS.map((a) => {
              const on = a === area;
              return (
                <button
                  key={a}
                  role="tab"
                  type="button"
                  aria-selected={on}
                  onClick={() => setArea(a)}
                  className={cn(
                    'relative flex h-9 items-center justify-between gap-3 rounded-full px-3.5 text-left text-[14px] font-medium transition-colors',
                    on ? 'text-primary-ink' : 'text-fg-2 hover:text-fg',
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId="changelog-area"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                  )}
                  <span className="relative">{a}</span>
                  <span className={cn('relative text-[13px] tabular-nums', on ? 'text-primary-ink/60' : 'text-fg-3')}>
                    {count(a)}
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <p className="mt-8 hidden text-[13px] text-fg-3 lg:block">Releases</p>
        <ul className="mt-2 hidden space-y-1 lg:block">
          {list.map((e) => (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className="block truncate rounded-[8px] px-3.5 py-1.5 text-[13px] text-fg-2 hover:bg-elevated hover:text-fg"
              >
                {e.title}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0">
        <header>
          <h1 className="text-step-4 text-fg-strong">Changelog</h1>
          <p className="mt-3 max-w-xl text-step-2 text-fg-2">What changed, what got better, and what is coming next.</p>
          <div className="mt-6 flex flex-wrap gap-4 text-[13px] text-fg-2">
            {(Object.keys(KIND) as ChangeKind[])
              .filter((k) => entries.some((e) => e.changes.some((c) => c.kind === k)))
              .map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', KIND[k].dot)} />
                  {KIND[k].label}
                </span>
              ))}
          </div>
        </header>

        <ol className="relative mt-12 space-y-6 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-hairline sm:before:left-[11px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((e, i) => (
              <motion.li
                key={e.id}
                id={e.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, delay: i * 0.04, ease }}
                className="relative scroll-mt-10 pl-8 sm:pl-12"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-6 flex h-[15px] w-[15px] items-center justify-center rounded-full border sm:left-1 sm:h-[15px] sm:w-[15px]',
                    e.planned ? 'border-dashed border-fg-3 bg-canvas' : 'border-ember bg-canvas',
                  )}
                >
                  {!e.planned && <span className="h-[7px] w-[7px] rounded-full bg-ember" />}
                </span>

                <article
                  className={cn(
                    'rounded-lg border p-6 sm:p-7',
                    e.planned ? 'border-dashed border-outline bg-transparent' : 'border-hairline bg-card',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className={cn('font-medium', e.planned ? 'text-fg-2' : 'text-fg')}>{e.when}</span>
                    {e.version && (
                      <span className="rounded-full border border-hairline px-2 py-0.5 tabular-nums text-fg-3">
                        {e.version}
                      </span>
                    )}
                    <span className="flex-1" />
                    {e.areas.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setArea(a)}
                        className="rounded-full bg-elevated px-2.5 py-0.5 text-fg-2 hover:text-fg"
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <h2 className="mt-3 text-step-3 font-medium text-fg-strong">{e.title}</h2>
                  <p className="mt-2 max-w-[62ch] text-[16px] text-fg-2">{e.summary}</p>
                  <ul className="mt-5 space-y-2.5 border-t border-hairline pt-5">
                    {e.changes.map((c) => (
                      <li key={c.text} className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-3 text-[15px]">
                        <span className={cn('flex items-center gap-1.5 text-[13px] font-medium', KIND[c.kind].text)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', KIND[c.kind].dot)} />
                          {KIND[c.kind].label}
                        </span>
                        <span className="text-fg">{c.text}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  );
}
