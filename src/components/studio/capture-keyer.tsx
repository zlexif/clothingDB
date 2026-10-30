'use client';

import { zipSync } from 'fflate';
import { Download, ImagePlus, Package, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, type KeySettings, type Processed, processCapture } from '../../lib/chroma';
import { CATEGORIES, type Gender, type ItemType, imageUrl } from '../../lib/clothing';
import { cn } from '../../lib/utils';
import { Landscape } from '../site/art';
import { Button } from '../ui/button';
import { Field, Pills, Stepper } from './controls';

interface ItemName {
  gender: Gender;
  slug: string;
  drawable: number;
  texture: number;
}

interface Item {
  id: string;
  file: File;
  src: string;
  name: ItemName;
  out?: Processed;
  error?: string;
}

type Backdrop = 'checker' | 'black' | 'white' | 'art';

const KINDS: { type: ItemType; label: string }[] = [
  { type: 'component', label: 'Components' },
  { type: 'prop', label: 'Props' },
  { type: 'overlay', label: 'Overlays' },
];

const outPath = (n: ItemName, format: string) => `${n.gender}/${n.slug}/${n.drawable}/${n.texture}.${format}`;

function parseName(file: string): Partial<ItemName> {
  const m = file.toLowerCase().match(/(male|female)[_\-/ ]+([a-z-]+)[_\-/ ]+(\d+)[_\-/ ]+(\d+)/);
  if (!m || !CATEGORIES.some((c) => c.slug === m[2])) return {};
  return { gender: m[1] as Gender, slug: m[2], drawable: +m[3], texture: +m[4] };
}

const BACKDROP_CLASS: Record<Exclude<Backdrop, 'art'>, string> = {
  checker: 'transparency-grid',
  black: 'bg-canvas',
  white: 'bg-[#f4f4f4]',
};

export function CaptureKeyer({ modeSwitch }: { modeSwitch: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<KeySettings>(DEFAULT_SETTINGS);
  const [backdrop, setBackdrop] = useState<Backdrop>('checker');
  const [dragOver, setDragOver] = useState(false);
  const [zipping, setZipping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const active = items.find((i) => i.id === activeId) ?? items[0] ?? null;

  const process = useCallback(async (item: Item, s: KeySettings) => {
    try {
      const out = await processCapture(item.file, s);
      setItems((list) =>
        list.map((i) => {
          if (i.id !== item.id) return i;
          if (i.out) URL.revokeObjectURL(i.out.url);
          return { ...i, out, error: undefined };
        }),
      );
    } catch {
      setItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, error: 'This file could not be read as an image.' } : i)),
      );
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => itemsRef.current.forEach((i) => void process(i, settings)), 150);
    return () => clearTimeout(t);
  }, [settings, process]);

  useEffect(
    () => () =>
      itemsRef.current.forEach((i) => {
        URL.revokeObjectURL(i.src);
        if (i.out) URL.revokeObjectURL(i.out.url);
      }),
    [],
  );

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const last = itemsRef.current.at(-1)?.name ?? active?.name;
    const base: ItemName = last ?? { gender: 'male', slug: 'tops', drawable: 0, texture: -1 };
    const added = files.map((file, n): Item => {
      const parsed = parseName(file.name);
      return {
        id: crypto.randomUUID(),
        file,
        src: URL.createObjectURL(file),
        name: { ...base, texture: base.texture + 1 + n, ...parsed },
      };
    });
    setItems((l) => [...l, ...added]);
    setActiveId(added[0].id);
    added.forEach((i) => void process(i, settings));
  }

  function rename(patch: Partial<ItemName>) {
    if (!active) return;
    setItems((l) => l.map((i) => (i.id === active.id ? { ...i, name: { ...i.name, ...patch } } : i)));
  }

  function remove(id: string) {
    setItems((l) => {
      const gone = l.find((i) => i.id === id);
      if (gone) {
        URL.revokeObjectURL(gone.src);
        if (gone.out) URL.revokeObjectURL(gone.out.url);
      }
      return l.filter((i) => i.id !== id);
    });
  }

  function save(blob: Blob, filename: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function exportZip() {
    const ready = items.filter((i) => i.out);
    if (!ready.length) return;
    setZipping(true);
    try {
      const entries: Record<string, Uint8Array> = {};
      for (const i of ready)
        entries[outPath(i.name, settings.format)] = new Uint8Array(await i.out!.blob.arrayBuffer());
      const zipped = zipSync(entries, { level: 0 });
      save(new Blob([zipped as BlobPart], { type: 'application/zip' }), 'clothingDB-captures.zip');
    } finally {
      setZipping(false);
    }
  }

  const duplicates = useMemo(() => {
    const seen = new Map<string, number>();
    items.forEach((i) => {
      const p = outPath(i.name, settings.format);
      seen.set(p, (seen.get(p) ?? 0) + 1);
    });
    return seen;
  }, [items, settings.format]);

  const set = <K extends keyof KeySettings>(k: K, v: KeySettings[K]) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop zone for picture files
    <div
      className="flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="flex flex-wrap items-center gap-4 border-b border-hairline px-6 py-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-heading text-fg-strong">Creator Lab</h1>
          <p className="mt-0.5 text-body-sm text-fg-2">
            Drop green or magenta captures taken in game. Each one is keyed, framed and named on this device.
          </p>
        </div>
        {modeSwitch}
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          <ImagePlus /> Add captures
        </Button>
        <Button onClick={() => void exportZip()} disabled={!items.some((i) => i.out) || zipping}>
          <Package /> {zipping ? 'Packing…' : `Export ${items.length || ''} as ZIP`.replace('  ', ' ')}
        </Button>
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative isolate m-6 flex min-h-[60svh] flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed text-center transition-colors',
            dragOver ? 'border-ember' : 'border-hairline-strong hover:border-fg-3',
          )}
        >
          <div className="absolute inset-0 -z-10 opacity-40">
            <Landscape />
          </div>
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-card">
            <ImagePlus size={22} strokeWidth={1.5} className="text-fg" />
          </span>
          <span className="mt-5 text-heading-sm text-fg-strong">Drop your captures here</span>
          <span className="mt-2 max-w-md text-body-sm text-fg-2">
            Take screenshots in game on a plain green or magenta background, then drop them here. PNG, JPG or WebP.
          </span>
          <span className="mt-6 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[14px] font-medium text-primary-ink">
            Choose files
          </span>
        </button>
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          <aside className="flex min-h-0 flex-col border-b border-hairline lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[14px] font-medium text-fg">Captures</p>
              <button
                type="button"
                onClick={() => {
                  for (const i of items) remove(i.id);
                  setActiveId(null);
                }}
                className="press flex h-7 items-center gap-1 rounded-full px-2.5 text-[13px] text-fg-2 hover:bg-elevated hover:text-fg"
              >
                <Trash2 size={13} /> Clear
              </button>
            </div>
            <ul className="flex gap-1.5 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-y-auto">
              {items.map((i) => {
                const on = i.id === active?.id;
                const dup = (duplicates.get(outPath(i.name, settings.format)) ?? 0) > 1;
                return (
                  <li key={i.id} className="shrink-0">
                    <div
                      className={cn(
                        'group flex w-56 items-center gap-3 rounded-2xl border p-1.5 pr-2 lg:w-auto',
                        on ? 'border-hairline-strong bg-elevated' : 'border-transparent hover:bg-card',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveId(i.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="transparency-grid block h-12 w-12 shrink-0 overflow-hidden rounded-[10px]">
                          {i.out && <img src={i.out.url} alt="" className="h-full w-full object-contain" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] text-fg">
                            {i.name.slug} {i.name.drawable}/{i.name.texture}
                          </span>
                          <span
                            className={cn(
                              'flex items-center gap-1.5 text-[12px]',
                              i.error || dup ? 'text-crimson' : 'text-fg-3',
                            )}
                          >
                            {i.error ? (
                              'Unreadable'
                            ) : dup ? (
                              'Same name as another'
                            ) : i.out ? (
                              <>
                                <span
                                  className={cn(
                                    'h-2 w-2 rounded-full',
                                    i.out.key === 'green' ? 'bg-[#00d26a]' : 'bg-[#ff3df5]',
                                  )}
                                />
                                {i.name.gender}, {i.out.key}
                              </>
                            ) : (
                              'Keying…'
                            )}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${i.file.name}`}
                        onClick={() => remove(i.id)}
                        className="press flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-fg-3 opacity-0 hover:bg-raised hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="flex min-h-[60svh] min-w-0 flex-col p-4 lg:min-h-0 lg:p-6">
            <div className="relative isolate min-h-0 flex-1 overflow-hidden rounded-lg border border-hairline">
              {backdrop === 'art' ? (
                <div className="absolute inset-0 -z-10">
                  <Landscape />
                </div>
              ) : (
                <div className={cn('absolute inset-0 -z-10', BACKDROP_CLASS[backdrop])} />
              )}
              {active && (
                <>
                  {active.out && (
                    <img
                      src={active.out.url}
                      alt={`Keyed result for ${active.file.name}`}
                      className="absolute inset-0 h-full w-full object-contain p-8"
                    />
                  )}
                  <figure className="absolute bottom-3 left-3 w-[min(34%,220px)] overflow-hidden rounded-2xl border border-hairline bg-card">
                    <img
                      src={active.src}
                      alt={`Original capture ${active.file.name}`}
                      className="aspect-video w-full object-cover"
                    />
                    <figcaption className="px-2.5 py-1.5 text-[12px] text-fg-2">Original capture</figcaption>
                  </figure>
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="w-[min(100%,320px)]">
                <Pills
                  label="Preview backdrop"
                  value={backdrop}
                  options={['checker', 'black', 'white', 'art']}
                  onChange={setBackdrop}
                />
              </div>
              <p className="truncate text-[13px] text-fg-2">{active ? outPath(active.name, settings.format) : ''}</p>
            </div>
          </section>

          <aside className="space-y-7 overflow-y-auto border-t border-hairline p-5 lg:border-l lg:border-t-0">
            {active && (
              <section className="space-y-4">
                <h2 className="text-[15px] font-medium text-fg">This capture</h2>
                <Field label="Ped">
                  <Pills
                    label="Ped"
                    value={active.name.gender}
                    options={['male', 'female'] as Gender[]}
                    onChange={(g) => rename({ gender: g })}
                  />
                </Field>
                <Field label="Slot">
                  <select
                    value={active.name.slug}
                    onChange={(e) => rename({ slug: e.target.value })}
                    className="h-9 w-full rounded-full border border-hairline bg-canvas px-3 text-[14px] text-fg"
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
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Drawable">
                    <Stepper label="Drawable" value={active.name.drawable} onChange={(v) => rename({ drawable: v })} />
                  </Field>
                  <Field label="Texture">
                    <Stepper label="Texture" value={active.name.texture} onChange={(v) => rename({ texture: v })} />
                  </Field>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-hairline p-2">
                  <span className="transparency-grid block h-14 w-14 shrink-0 overflow-hidden rounded-[10px]">
                    <img
                      src={imageUrl(active.name.gender, active.name.slug, active.name.drawable, active.name.texture)}
                      alt="Current CDN render for this name"
                      className="h-full w-full object-contain"
                      onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                    />
                  </span>
                  <p className="text-[13px] text-fg-2">
                    The render the CDN serves under this name today, to check you numbered it right.
                  </p>
                </div>
                {active.out && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => save(active.out!.blob, outPath(active.name, settings.format).replaceAll('/', '_'))}
                  >
                    <Download /> Download this one
                  </Button>
                )}
              </section>
            )}

            <section className="space-y-4">
              <h2 className="text-[15px] font-medium text-fg">Keying</h2>
              <Field label="Backdrop colour">
                <Pills
                  label="Backdrop colour"
                  value={settings.key}
                  options={['auto', 'green', 'magenta'] as KeySettings['key'][]}
                  onChange={(v) => set('key', v)}
                />
              </Field>
              <Field label={`Edge feather, ${settings.feather}px`}>
                <input
                  type="range"
                  min={0}
                  max={4}
                  value={settings.feather}
                  onChange={(e) => set('feather', Number(e.target.value))}
                  className="w-full"
                  aria-label="Edge feather"
                />
              </Field>
              <Field label={`Feather passes, ${settings.passes}`}>
                <input
                  type="range"
                  min={0}
                  max={3}
                  value={settings.passes}
                  onChange={(e) => set('passes', Number(e.target.value))}
                  className="w-full"
                  aria-label="Feather passes"
                />
              </Field>
            </section>

            <section className="space-y-4">
              <h2 className="text-[15px] font-medium text-fg">Framing</h2>
              <Pills
                label="Framing"
                value={settings.framing}
                options={['subject', 'centre'] as KeySettings['framing'][]}
                render={(o) => (o === 'subject' ? 'Fit garment' : 'Centre crop')}
                onChange={(v) => set('framing', v)}
              />
              {settings.framing === 'subject' && (
                <Field label={`Padding, ${Math.round(settings.padding * 100)}%`}>
                  <input
                    type="range"
                    min={0}
                    max={0.25}
                    step={0.01}
                    value={settings.padding}
                    onChange={(e) => set('padding', Number(e.target.value))}
                    className="w-full"
                    aria-label="Padding"
                  />
                </Field>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-[15px] font-medium text-fg">Export</h2>
              <Field label="Size">
                <Pills
                  label="Size"
                  value={settings.size}
                  options={[256, 512, 1024]}
                  render={(o) => `${o}px`}
                  onChange={(v) => set('size', v)}
                />
              </Field>
              <Field label="Format">
                <Pills
                  label="Format"
                  value={settings.format}
                  options={['webp', 'png'] as KeySettings['format'][]}
                  render={(o) => o.toUpperCase()}
                  onChange={(v) => set('format', v)}
                />
              </Field>
              <p className="text-[13px] text-fg-3">
                The ZIP is laid out as gender/slot/drawable/texture, the same paths the CDN uses.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
