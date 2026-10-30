'use client';

import { Check, ChevronLeft, ChevronRight, ExternalLink, Link2, Search, Shirt, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CATEGORIES,
  categoryBySlug,
  type Gender,
  type ItemType,
  imageUrl,
  itemsWithPictures,
  type Manifest,
  type PictureVariant,
} from '../../lib/clothing';
import { cn } from '../../lib/utils';
import { CATEGORY_EVENT } from '../shell/nav';
import { Pills } from '../studio/controls';
import { Button, buttonVariants } from '../ui/button';
import { FlipCounter } from '../ui/flip-counter';

interface Props {
  manifest: Manifest | null;
  initialGender?: Gender;
  initialCategory?: string;
}

const GROUPS: { type: ItemType; label: string }[] = [
  { type: 'component', label: 'Clothing' },
  { type: 'prop', label: 'Props' },
  { type: 'overlay', label: 'Face and body' },
];

type Density = 'small' | 'medium' | 'large';
const COLUMN_MIN: Record<Density, number> = { small: 112, medium: 160, large: 220 };
const PAGE = 240;

function Thumb({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  const settled = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setState(img.naturalWidth > 0 ? 'ok' : 'missing');
  }, []);
  return (
    <div className={cn('transparency-grid relative aspect-square overflow-hidden', className)}>
      {state === 'loading' && <div className="absolute inset-0 animate-pulse bg-elevated/40" />}
      {state === 'missing' && (
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-fg-3">No image</div>
      )}
      <img
        ref={settled}
        src={src}
        alt={alt}
        loading="lazy"
        draggable={false}
        onLoad={() => setState('ok')}
        onError={() => setState('missing')}
        className={cn(
          'absolute inset-0 h-full w-full object-contain p-[8%] transition-[opacity,transform] duration-300 group-hover:scale-[1.04]',
          state === 'ok' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}

export function DirectoryApp({ manifest, initialGender = 'male', initialCategory = 'tops' }: Props) {
  const [gender, setGender] = useState<Gender>(initialGender);
  const [variant, setVariant] = useState<PictureVariant>('garment');
  const [slug, setSlug] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [density, setDensity] = useState<Density>('medium');
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<number | null>(null);
  const [texture, setTexture] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSlug(initialCategory);
    setSelected(null);
    setTexture(0);
    setQuery('');
    setLimit(PAGE);
  }, [initialCategory]);

  const cat = categoryBySlug(slug) ?? CATEGORIES.find((c) => c.slug === 'tops')!;
  const textureCounts = manifest?.genders?.[gender]?.[slug]?.drawables ?? [];
  const drawables = useMemo(() => itemsWithPictures(textureCounts), [textureCounts]);
  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? drawables.filter((d) => String(d).includes(q)) : drawables;
  }, [drawables, query]);
  const shown = filtered.slice(0, limit);
  const count = (s: string) => itemsWithPictures(manifest?.genders?.[gender]?.[s]?.drawables ?? []).length;

  const textures = selected == null ? 0 : (textureCounts[selected] ?? 1);
  const tex = Math.min(texture, Math.max(0, textures - 1));
  const url = selected == null ? '' : imageUrl(gender, slug, selected, tex, variant);

  function pickCategory(s: string) {
    setSlug(s);
    setSelected(null);
    setTexture(0);
    setQuery('');
    setLimit(PAGE);
    window.history.replaceState(null, '', `/browse/${s}`);
    window.dispatchEvent(new CustomEvent(CATEGORY_EVENT, { detail: s }));
  }

  function open(d: number) {
    setSelected(d);
    setTexture(0);
  }

  function step(dir: 1 | -1) {
    if (selected == null) return;
    const i = filtered.indexOf(selected);
    const next = filtered[i + dir];
    if (next !== undefined) open(next);
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  useEffect(() => {
    if (selected == null) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape') setSelected(null);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const tryOn =
    selected != null && cat.type === 'component' ? `/creator?g=${gender}&slot=${slug}&d=${selected}&t=${tex}` : null;

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-hairline p-3 md:block">
        {GROUPS.map((g) => (
          <div key={g.type} className="mb-5">
            <p className="px-3 pb-1.5 pt-1 text-[13px] text-fg-3">{g.label}</p>
            <div className="space-y-0.5">
              {CATEGORIES.filter((c) => c.type === g.type).map((c) => {
                const on = c.slug === slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => pickCategory(c.slug)}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'press flex h-9 w-full items-center justify-between rounded-full px-3 text-[14px] transition-colors',
                      on ? 'bg-primary text-primary-ink' : 'text-fg-2 hover:bg-elevated hover:text-fg',
                    )}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className={cn('text-[13px] tabular-nums', on ? 'text-primary-ink/60' : 'text-fg-3')}>
                      {count(c.slug)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-4">
          <div className="mr-auto min-w-0">
            <h1 className="truncate text-heading text-fg-strong">{cat.label}</h1>
            <p className="mt-1 flex items-center gap-2 text-[14px] text-fg-2">
              <FlipCounter size="sm" value={drawables.length} label={`${drawables.length} items`} />
              items for the {gender} ped
            </p>
          </div>
          <select
            value={slug}
            onChange={(e) => pickCategory(e.target.value)}
            aria-label="Category"
            className="h-9 rounded-full border border-hairline bg-canvas px-3 text-[14px] text-fg md:hidden"
          >
            {GROUPS.map((g) => (
              <optgroup key={g.type} label={g.label}>
                {CATEGORIES.filter((c) => c.type === g.type).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="w-44">
            <Pills
              label="Ped"
              value={gender}
              options={['male', 'female'] as Gender[]}
              onChange={(g) => {
                setGender(g);
                setSelected(null);
                setLimit(PAGE);
              }}
            />
          </div>
          <div className="w-60">
            <Pills
              label="Show"
              value={variant}
              options={['garment', 'ped'] as PictureVariant[]}
              render={(o) => (o === 'garment' ? 'Just the piece' : 'On the ped')}
              onChange={setVariant}
            />
          </div>
          <label className="flex h-9 w-full items-center gap-2 rounded-full border border-hairline bg-canvas px-3 focus-within:border-fg-3 sm:w-56">
            <Search size={15} className="shrink-0 text-icon" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Find a number"
              inputMode="numeric"
              aria-label="Find an item by number"
              className="w-full bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-3"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="text-fg-3 hover:text-fg"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="hidden w-60 lg:block">
            <Pills
              label="Card size"
              value={density}
              options={['small', 'medium', 'large'] as Density[]}
              onChange={setDensity}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {shown.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
              <p className="text-heading-sm text-fg-strong">No item with that number</p>
              <p className="text-[14px] text-fg-2">
                {cat.label} go from 0 to {drawables.at(-1) ?? 0} for the {gender} ped.
              </p>
            </div>
          ) : (
            <div
              className="grid gap-3 p-4 sm:p-5"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(min(${COLUMN_MIN[density]}px, calc(50% - 6px)), 1fr))`,
              }}
            >
              {shown.map((d) => {
                const on = d === selected;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => open(d)}
                    aria-pressed={on}
                    className={cn(
                      'press group overflow-hidden rounded-2xl border bg-card text-left transition-colors',
                      on ? 'border-fg-2' : 'border-hairline hover:border-hairline-strong',
                    )}
                  >
                    <Thumb src={imageUrl(gender, slug, d, 0, variant)} alt={`${cat.label} ${d}`} />
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-[14px] tabular-nums text-fg">{d}</span>
                      <span className="text-[12px] tabular-nums text-fg-3">
                        {textureCounts[d] ?? 1} {(textureCounts[d] ?? 1) === 1 ? 'colour' : 'colours'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {filtered.length > shown.length && (
            <div className="flex justify-center pb-8">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                Show more ({filtered.length - shown.length} left)
              </Button>
            </div>
          )}
        </div>
      </section>

      {selected != null && (
        <>
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-40 bg-canvas/70 lg:hidden"
          />
          <aside
            aria-label={`${cat.label} ${selected}`}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85svh] overflow-y-auto rounded-t-[22px] border-t border-hairline-strong bg-card p-5 lg:static lg:z-auto lg:max-h-none lg:w-[380px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] text-fg-3">{cat.label}</p>
                <h2 className="text-heading-sm tabular-nums text-fg-strong">Item {selected}</h2>
              </div>
              <div className="flex gap-1">
                <Button variant="secondary" size="icon" aria-label="Previous item" onClick={() => step(-1)}>
                  <ChevronLeft />
                </Button>
                <Button variant="secondary" size="icon" aria-label="Next item" onClick={() => step(1)}>
                  <ChevronRight />
                </Button>
                <Button variant="secondary" size="icon" aria-label="Close details" onClick={() => setSelected(null)}>
                  <X />
                </Button>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-hairline">
              <Thumb key={url} src={url} alt={`${cat.label} ${selected}, colour ${tex}`} />
            </div>

            <div className="mt-5">
              <p className="text-[13px] text-fg-2">
                Colour {tex} of {textures - 1}
              </p>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {Array.from({ length: textures }, (_, t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTexture(t)}
                    aria-label={`Colour ${t}`}
                    aria-pressed={t === tex}
                    className={cn(
                      'press overflow-hidden rounded-[10px] border-2',
                      t === tex ? 'border-fg-strong' : 'border-transparent hover:border-hairline-strong',
                    )}
                  >
                    <Thumb src={imageUrl(gender, slug, selected, t, variant)} alt="" />
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-5 truncate rounded-full border border-hairline bg-canvas px-4 py-2.5 text-[13px] text-fg-2">
              {url}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant={copied ? 'forest' : 'primary'} onClick={() => void copy()}>
                {copied ? <Check /> : <Link2 />}
                {copied ? 'Copied' : 'Copy URL'}
              </Button>
              <a href={url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'secondary' })}>
                <ExternalLink /> Open image
              </a>
            </div>
            {tryOn && (
              <a href={tryOn} className={buttonVariants({ variant: 'secondary', className: 'mt-2 w-full' })}>
                <Shirt /> Try it on in the Ped studio
              </a>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
