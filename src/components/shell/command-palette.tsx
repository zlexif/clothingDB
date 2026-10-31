'use client';

import { ArrowRight, BookOpen, CornerDownLeft, PanelLeft, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, type ItemType } from '../../lib/clothing';
import { cn } from '../../lib/utils';
import { slotThumb } from '../site/home/shared';
import { NAV_ITEMS, type NavItem } from './nav';

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  icon?: ReactNode;
  run: () => void;
}

const GROUP_LABEL: Record<ItemType, string> = { component: 'Clothing', prop: 'Props', overlay: 'Face and body' };

const DOC_PAGES = [
  { href: '/docs/picture-addresses', label: 'Picture addresses' },
  { href: '/docs/slots', label: 'Slot reference' },
  { href: '/docs/creator-lab', label: 'Using the Creator Lab' },
  { href: '/docs/creator-lab-batch', label: 'Batch capture' },
  { href: '/docs/creator-lab-custom', label: 'Add your own clothing' },
  { href: '/docs/key-captures', label: 'Key captures' },
];

export function fuzzyScore(query: string, text: string): { score: number; hits: number[] } | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return { score: 0, hits: [] };
  const hits: number[] = [];
  let score = 0;
  let from = 0;
  for (const ch of q) {
    if (ch === ' ') continue;
    const at = t.indexOf(ch, from);
    if (at < 0) return null;
    const prev = hits.at(-1);
    score += 1;
    if (prev !== undefined && at === prev + 1) score += 3;
    if (at === 0 || /[\s/-]/.test(t[at - 1])) score += 4;
    score -= Math.min(at - from, 6) * 0.2;
    hits.push(at);
    from = at + 1;
  }
  return { score, hits };
}

function Highlight({ text, hits }: { text: string; hits: number[] }) {
  const set = new Set(hits);
  return (
    <>
      {[...text].map((ch, i) =>
        set.has(i) ? (
          <span key={i} className="text-ember">
            {ch}
          </span>
        ) : (
          ch
        ),
      )}
    </>
  );
}

export function CommandPalette({
  open,
  onClose,
  counts,
  collapsed,
  onNavigate,
  onToggleSidebar,
}: {
  open: boolean;
  onClose: () => void;
  counts: Record<string, number>;
  collapsed: boolean;
  onNavigate: (item: Pick<NavItem, 'href' | 'external' | 'document'>) => void;
  onToggleSidebar: () => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (item: Pick<NavItem, 'href' | 'external' | 'document'>) => () => {
      onClose();
      onNavigate(item);
    };
    return [
      ...NAV_ITEMS.map((n) => ({
        id: `page:${n.key}`,
        group: 'Pages',
        label: n.label,
        hint: n.hint,
        icon: <n.icon size={16} strokeWidth={1.5} />,
        run: go(n),
      })),
      ...CATEGORIES.map((c) => ({
        id: `cat:${c.slug}`,
        group: GROUP_LABEL[c.type],
        label: c.label,
        hint: `${(counts[c.slug] ?? 0).toLocaleString()} items`,
        keywords: c.slug,
        icon: (
          <img
            src={slotThumb(c.slug)}
            alt=""
            width={28}
            height={28}
            loading="lazy"
            className="h-7 w-7 rounded-[6px] bg-canvas object-contain"
          />
        ),
        run: go({ href: `/browse/${c.slug}` }),
      })),
      ...DOC_PAGES.map((d) => ({
        id: `doc:${d.href}`,
        group: 'Docs',
        label: d.label,
        icon: <BookOpen size={16} strokeWidth={1.5} />,
        run: go({ href: d.href, document: true }),
      })),
      {
        id: 'action:sidebar',
        group: 'Actions',
        label: collapsed ? 'Expand the sidebar' : 'Collapse the sidebar',
        hint: 'Ctrl B',
        keywords: 'toggle rail',
        icon: <PanelLeft size={16} strokeWidth={1.5} />,
        run: () => {
          onClose();
          onToggleSidebar();
        },
      },
    ];
  }, [counts, collapsed, onClose, onNavigate, onToggleSidebar]);

  const results = useMemo(() => {
    const q = query.trim();
    const scored = commands
      .map((c) => {
        const onLabel = fuzzyScore(q, c.label);
        const onKeywords = c.keywords ? fuzzyScore(q, c.keywords) : null;
        const best = onLabel && (!onKeywords || onLabel.score >= onKeywords.score) ? onLabel : onKeywords;
        return best ? { c, score: best.score, hits: best === onLabel ? best.hits : [] } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (q) scored.sort((a, b) => b.score - a.score);
    return q
      ? scored.slice(0, 12)
      : scored.filter((r) => r.c.group === 'Pages' || r.c.group === 'Actions' || r.c.group === 'Clothing');
  }, [commands, query]);

  const groups = useMemo(() => {
    const out: { group: string; rows: (typeof results)[number][] }[] = [];
    for (const r of results) {
      const g = query.trim() ? 'Best matches' : r.c.group;
      const last = out.at(-1);
      if (last?.group === g) last.rows.push(r);
      else out.push({ group: g, rows: [r] });
    }
    return out;
  }, [results, query]);

  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      results[active]?.c.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (typeof document === 'undefined') return null;
  let index = -1;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="palette"
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onKeyDown={onKey}
            initial={{ opacity: 0, y: -12, scale: 0.97, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative w-full max-w-[600px] overflow-hidden rounded-[20px] border border-hairline-strong bg-card shadow-modal"
          >
            <div className="flex items-center gap-3 border-b border-hairline px-4">
              <Search size={18} strokeWidth={1.5} className="shrink-0 text-icon" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, categories and actions"
                aria-label="Search"
                aria-controls="palette-results"
                aria-activedescendant={results[active] ? `palette-${results[active].c.id}` : undefined}
                className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-3"
              />
              <kbd className="rounded-[6px] border border-hairline px-1.5 py-0.5 text-[11px] text-fg-3">Esc</kbd>
            </div>

            <div ref={listRef} id="palette-results" role="listbox" className="max-h-[56vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-10 text-center text-[14px] text-fg-2">Nothing matches “{query}”.</p>
              )}
              {groups.map((g) => (
                <div key={g.group} className="pb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-fg-3">
                    {g.group}
                  </p>
                  {g.rows.map((r) => {
                    index++;
                    const i = index;
                    const on = i === active;
                    return (
                      <button
                        key={r.c.id}
                        id={`palette-${r.c.id}`}
                        type="button"
                        role="option"
                        aria-selected={on}
                        data-index={i}
                        onMouseMove={() => setActive(i)}
                        onClick={() => r.c.run()}
                        className="relative flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left"
                      >
                        {on && (
                          <motion.span
                            layoutId="palette-active"
                            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                            className="absolute inset-0 rounded-[12px] bg-elevated"
                          />
                        )}
                        <span
                          className={cn(
                            'relative flex h-7 w-7 shrink-0 items-center justify-center',
                            on ? 'text-fg' : 'text-icon',
                          )}
                        >
                          {r.c.icon}
                        </span>
                        <span className="relative min-w-0 flex-1 truncate text-[15px] text-fg">
                          <Highlight text={r.c.label} hits={r.hits} />
                        </span>
                        {r.c.hint && (
                          <span className="relative shrink-0 text-[13px] tabular-nums text-fg-3">{r.c.hint}</span>
                        )}
                        <ArrowRight
                          size={14}
                          className={cn(
                            'relative shrink-0 transition-all duration-200',
                            on ? 'translate-x-0 text-fg-2 opacity-100' : '-translate-x-1 opacity-0',
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 border-t border-hairline px-4 py-2.5 text-[12px] text-fg-3">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded-[5px] border border-hairline px-1">↑</kbd>
                <kbd className="rounded-[5px] border border-hairline px-1">↓</kbd> to move
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="flex items-center rounded-[5px] border border-hairline px-1">
                  <CornerDownLeft size={11} />
                </kbd>
                to open
              </span>
              <span className="flex-1" />
              <span>{results.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
