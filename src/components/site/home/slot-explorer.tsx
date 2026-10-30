'use client';

import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES, type ItemType, imageUrl, itemsWithPictures } from '../../../lib/clothing';
import { cn } from '../../../lib/utils';
import { DEFAULT_PICK, type DrawableIndex, GROUPS, PICKS, wrap } from './shared';

export function SlotExplorer({ index }: { index: DrawableIndex }) {
  const [slug, setSlug] = useState('tops');
  const cat = CATEGORIES.find((c) => c.slug === slug)!;
  const [open, setOpen] = useState<Set<ItemType>>(() => new Set<ItemType>(['component']));
  const male = itemsWithPictures(index.male[slug] ?? []).length;
  const female = itemsWithPictures(index.female[slug] ?? []).length;
  const pick = PICKS[slug] ?? DEFAULT_PICK;
  const textures = index[pick.gender][slug] ?? [];
  const items = pick.d.filter((d) => (textures[d] ?? 0) > 0).slice(0, 6);

  const toggle = (t: ItemType) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  return (
    <section aria-labelledby="slots-title" className={cn(wrap, 'mt-40')}>
      <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="slots-title" className="text-step-4 text-fg-strong">
          <span className="text-fg-2">Head to toe,</span>
          <br />
          male and female.
        </h2>
        <a
          href="/browse"
          className="press inline-flex h-9 items-center rounded-full border border-hairline bg-canvas px-4 text-[14px] font-medium text-fg hover:bg-elevated"
        >
          Browse all categories
        </a>
      </div>

      <div data-reveal className="mt-14 overflow-hidden rounded-lg border border-hairline bg-card shadow-window">
        <div className="flex items-center gap-3 border-b border-hairline px-3 py-2.5 sm:px-4">
          <span aria-hidden="true" className="hidden gap-1.5 sm:flex">
            <span className="h-3 w-3 rounded-full bg-raised" />
            <span className="h-3 w-3 rounded-full bg-raised" />
            <span className="h-3 w-3 rounded-full bg-raised" />
          </span>
          <nav
            aria-label="Path"
            className="flex h-9 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-full border border-hairline bg-canvas px-3 text-[14px] text-fg-3"
          >
            <span className="hidden sm:inline">v1</span>
            <ChevronRight size={14} strokeWidth={1.5} className="hidden shrink-0 sm:block" />
            <span>{pick.gender}</span>
            <ChevronRight size={14} strokeWidth={1.5} className="shrink-0" />
            <span className="truncate text-fg">{slug}</span>
          </nav>
          <a
            href={`/browse/${slug}`}
            className="press inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-4 text-[14px] font-medium text-primary-ink hover:bg-primary/85"
          >
            Open
          </a>
        </div>

        <div className="grid md:grid-cols-[230px_minmax(0,1fr)]">
          <ul
            aria-label="Categories"
            className="max-h-[220px] overflow-y-auto border-b border-hairline p-2 md:max-h-[520px] md:border-b-0 md:border-r"
          >
            {GROUPS.map((g) => {
              const expanded = open.has(g.type);
              const cats = CATEGORIES.filter((c) => c.type === g.type);
              return (
                <li key={g.type}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggle(g.type)}
                    className="flex h-8 w-full items-center gap-1.5 rounded-[8px] px-2 text-left text-[14px] font-medium text-fg hover:bg-elevated"
                  >
                    <ChevronRight
                      size={14}
                      strokeWidth={1.5}
                      className={cn('shrink-0 text-icon transition-transform', expanded && 'rotate-90')}
                    />
                    {expanded ? (
                      <FolderOpen size={15} strokeWidth={1.5} className="shrink-0 text-ember" />
                    ) : (
                      <Folder size={15} strokeWidth={1.5} className="shrink-0 text-ember" />
                    )}
                    <span className="flex-1 truncate">{g.label}</span>
                    <span className="text-[13px] tabular-nums text-fg-3">{cats.length}</span>
                  </button>
                  {expanded && (
                    <ul className="ml-[15px] border-l border-hairline pl-1.5">
                      {cats.map((c) => {
                        const on = c.slug === slug;
                        return (
                          <li key={c.slug}>
                            <button
                              type="button"
                              aria-current={on || undefined}
                              onClick={() => setSlug(c.slug)}
                              className={cn(
                                'flex h-8 w-full items-center gap-2 rounded-[8px] px-2 text-left text-[14px]',
                                on ? 'bg-elevated text-fg' : 'text-fg-2 hover:bg-elevated/60 hover:text-fg',
                              )}
                            >
                              <Folder
                                size={14}
                                strokeWidth={1.5}
                                className={cn('shrink-0', on ? 'fill-ember/25 text-ember' : 'text-icon')}
                              />
                              <span className="truncate">{c.slug}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex min-w-0 flex-col">
            <div key={slug} className="swap-in grid flex-1 grid-cols-2 content-start gap-2 p-3 sm:grid-cols-3 sm:p-4">
              {items.map((d) => (
                <a key={d} href={`/browse/${slug}`} className="group rounded-[14px] p-1.5 hover:bg-elevated">
                  <span className="transparency-grid block aspect-[4/3] overflow-hidden rounded-[10px] border border-hairline">
                    <img
                      src={imageUrl(pick.gender, slug, d, 0)}
                      alt={`${cat.label} ${d}`}
                      width={200}
                      height={150}
                      loading="lazy"
                      className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                  </span>
                  <span className="mt-2 flex items-baseline justify-between gap-2 px-1">
                    <span className="truncate text-[14px] font-medium tabular-nums text-fg">{d}</span>
                    <span className="shrink-0 text-[13px] tabular-nums text-fg-3">
                      {textures[d]} {textures[d] === 1 ? 'colour' : 'colours'}
                    </span>
                  </span>
                </a>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-hairline px-4 py-2 text-[13px] tabular-nums text-fg-3">
              <span className="truncate">{cat.label}</span>
              <span className="shrink-0">
                {male} male · {female} female
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
