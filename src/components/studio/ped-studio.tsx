'use client';

import { zipSync } from 'fflate';
import { Camera, CircleHelp, Package, Plus, Square, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { categoryBySlug, type Gender } from '../../lib/clothing';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Tour, type TourStep } from '../ui/tour';
import { Field, Pills, Stepper } from './controls';
import { AddClothingDialog, type CustomItem, CustomThumb } from './custom-clothing';
import { GarmentSwitch } from './garment-switch';
import {
  type Framing,
  PEDS_BASE,
  type PedManifest,
  PedViewport,
  type PedViewportHandle,
  type SlotPick,
  type StudioBackdrop,
} from './ped-viewport';

const SLOTS = [
  'tops',
  'undershirts',
  'torsos',
  'legs',
  'shoes',
  'masks',
  'hair',
  'accessories',
  'armor',
  'bags',
  'decals',
] as const;
type Slot = (typeof SLOTS)[number];

const ANGLES: { label: string; yaw: number }[] = [
  { label: 'Front', yaw: 0 },
  { label: '¾', yaw: 35 },
  { label: 'Side', yaw: 90 },
  { label: 'Back', yaw: 180 },
];

type Outfit = Record<string, SlotPick | null>;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

async function until(check: () => boolean, timeoutMs = 8000) {
  const start = performance.now();
  while (!check() && performance.now() - start < timeoutMs) await nextFrame();
}

const TOUR_SEEN = 'clothingdb:ped-studio-tour';

const TOUR: TourStep[] = [
  {
    title: 'Welcome to the Ped studio',
    body: (
      <>
        <p>
          This is a photo studio for GTA clothing. The ped is the real one from the game, so anything you put on it
          looks exactly like it does in game.
        </p>
        <p>In about a minute you will know how to dress it and take pictures.</p>
      </>
    ),
  },
  {
    target: 'ped',
    title: 'Choose who you are dressing',
    body: (
      <p>
        Switch between the male and female ped. Each has its own clothing numbers, so switching starts a fresh outfit.
      </p>
    ),
  },
  {
    target: 'outfit',
    title: 'Put clothes on',
    body: (
      <>
        <p>Every row is a clothing slot. Press Wear to add one, or the × to take it off.</p>
        <p>
          The left counter picks the item, the right one its colour or pattern. The line underneath tells you how many
          there are.
        </p>
      </>
    ),
  },
  {
    target: 'custom',
    title: 'Bring your own clothing',
    body: (
      <>
        <p>
          Add a clothing model (.ydd) and its textures (.ytd) from your computer to photograph it here. Your files stay
          on this computer.
        </p>
        <p>Escrowed (encrypted) clothing only opens inside FiveM, so it cannot be added.</p>
      </>
    ),
  },
  {
    target: 'stage',
    title: 'Look around',
    body: <p>Drag on the ped to turn it and scroll to zoom. This only changes the view, nothing else.</p>,
  },
  {
    target: 'garment',
    title: 'With the ped, or just the garment',
    body: (
      <>
        <p>
          Turn on Only the garment to hide the body and every other item. The camera frames the piece by itself, ready
          for a see-through picture.
        </p>
        <p>
          Pick which piece under it. Turn it off to photograph the whole ped wearing the outfit. Capture view and batch
          shots both follow this switch.
        </p>
      </>
    ),
  },
  {
    target: 'view',
    title: 'Set up the shot',
    body: (
      <>
        <p>Backdrop: Clear gives a see-through background; Studio, Green and Magenta give a solid one.</p>
        <p>Framing zooms to a part of the body, and Angle turns the camera to the front, ¾, side or back.</p>
      </>
    ),
  },
  {
    target: 'output',
    title: 'Pick the picture size',
    body: <p>Choose the size and file type before you capture. WebP files are smaller; PNG opens everywhere.</p>,
  },
  {
    target: 'capture',
    title: 'Take one picture',
    body: <p>Saves exactly what you see in the frame as an image on your computer.</p>,
  },
  {
    target: 'batch',
    title: 'Photograph a whole range at once',
    body: (
      <>
        <p>Pick a slot and the first and last item number, then press Capture range.</p>
        <p>
          It shoots every item in every colour, shows only that piece of clothing, and hands you one ZIP sorted by ped,
          slot, item and colour. Stop cancels it at any time.
        </p>
      </>
    ),
  },
  {
    target: 'mode',
    title: 'Already have screenshots from the game?',
    body: <p>Key captures removes a green or magenta background from screenshots you took in game.</p>,
  },
  {
    target: 'help',
    title: 'Need this again?',
    body: <p>Press the question mark any time to replay this walkthrough.</p>,
  },
];

const BASE_OUTFIT: Outfit = {
  head: { drawable: 0, texture: 0 },
  torsos: { drawable: 0, texture: 0 },
  legs: { drawable: 0, texture: 0 },
  shoes: { drawable: 0, texture: 0 },
  tops: { drawable: 0, texture: 0 },
};

export function PedStudio({ modeSwitch }: { modeSwitch: React.ReactNode }) {
  const [gender, setGender] = useState<Gender>('male');
  const [manifest, setManifest] = useState<Record<Gender, PedManifest | null>>({ male: null, female: null });
  const [failed, setFailed] = useState(false);
  const [outfit, setOutfit] = useState<Outfit>(BASE_OUTFIT);
  const [backdrop, setBackdrop] = useState<StudioBackdrop>('transparent');
  const [framing, setFraming] = useState<Framing>('full');
  const [yaw, setYaw] = useState(0);
  const [size, setSize] = useState(512);
  const [format, setFormat] = useState<'webp' | 'png'>('webp');
  const [batchSlot, setBatchSlot] = useState<Slot>('tops');
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(9);
  const [focus, setFocus] = useState<string | null>(null);
  const [garmentOnly, setGarmentOnly] = useState(false);
  const [pieceSlot, setPieceSlot] = useState<Slot>('tops');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const handle = useRef<PedViewportHandle | null>(null);
  const cancel = useRef(false);
  const [tour, setTour] = useState(false);
  const [customs, setCustoms] = useState<CustomItem[]>([]);
  const [adding, setAdding] = useState(false);
  const customById = useMemo(() => Object.fromEntries(customs.map((c) => [c.id, c])), [customs]);
  const customPieces = useMemo(() => Object.fromEntries(customs.map((c) => [c.id, c.piece])), [customs]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const slot = q.get('slot');
    if (!slot || !(SLOTS as readonly string[]).includes(slot)) return;
    const d = Math.max(0, Number(q.get('d')) || 0);
    const t = Math.max(0, Number(q.get('t')) || 0);
    setGender(q.get('g') === 'female' ? 'female' : 'male');
    setOutfit({ ...BASE_OUTFIT, [slot]: { drawable: d, texture: t } });
    setBatchSlot(slot as Slot);
    setPieceSlot(slot as Slot);
    setFrom(d);
    setTo(d);
  }, []);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(TOUR_SEEN) === '1';
    } catch {
      seen = false;
    }
    if (seen) return;
    const t = setTimeout(() => setTour(true), 600);
    return () => clearTimeout(t);
  }, []);

  function closeTour() {
    setTour(false);
    try {
      localStorage.setItem(TOUR_SEEN, '1');
    } catch {}
  }

  const m = manifest[gender];

  useEffect(() => {
    if (manifest[gender]) return;
    fetch(`${PEDS_BASE}/${gender}/manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: PedManifest) => setManifest((s) => ({ ...s, [gender]: data })))
      .catch(() => setFailed(true));
  }, [gender, manifest]);

  const counts = (slot: string) => m?.slots[slot]?.drawables ?? [];
  const maxDrawable = (slot: string) => Math.max(0, counts(slot).length - 1);
  const maxTexture = (slot: string, d: number) => Math.max(0, (counts(slot)[d] ?? 1) - 1);
  const customColours = (id: string) => customById[id]?.piece.textures.length ?? 0;

  function wearCustom(item: CustomItem) {
    const pick: SlotPick = { drawable: -1, texture: 0, custom: item.id };
    if (item.gender !== gender) {
      setGender(item.gender);
      setOutfit({ ...BASE_OUTFIT, [item.slot]: pick });
    } else {
      setOutfit((o) => ({ ...o, [item.slot]: pick }));
    }
    setPieceSlot(item.slot as Slot);
  }

  function addCustoms(items: CustomItem[]) {
    setCustoms((c) => [...c, ...items]);
    setAdding(false);
    if (items[0]) wearCustom(items[0]);
  }

  function removeCustom(id: string) {
    setCustoms((c) => c.filter((x) => x.id !== id));
    setOutfit((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v?.custom === id ? null : v])));
  }

  function customColour(slot: string, p: SlotPick, t: number) {
    const last = Math.max(0, customColours(p.custom ?? '') - 1);
    setOutfit((o) => ({ ...o, [slot]: { ...p, texture: Math.min(Math.max(0, t), last) } }));
  }

  function pick(slot: string, patch: Partial<SlotPick> | null) {
    if (patch !== null) setPieceSlot(slot as Slot);
    setOutfit((o) => {
      if (patch === null) return { ...o, [slot]: null };
      const cur = o[slot] ?? { drawable: 0, texture: 0 };
      const drawable = Math.min(patch.drawable ?? cur.drawable, maxDrawable(slot));
      const texture = Math.min(
        patch.drawable !== undefined && patch.drawable !== cur.drawable ? 0 : (patch.texture ?? cur.texture),
        maxTexture(slot, drawable),
      );
      return { ...o, [slot]: { drawable, texture } };
    });
  }

  const ext = format;
  const mime = `image/${format}`;

  function save(blob: Blob, name: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const piece = outfit[pieceSlot];
  const pieceOnly = garmentOnly && !progress;
  const worn = SLOTS.filter((s) => outfit[s]);
  const viewOutfit: Outfit = pieceOnly ? (piece ? { [pieceSlot]: piece } : {}) : outfit;
  const viewFocus = progress ? focus : pieceOnly ? pieceSlot : null;

  async function captureView() {
    if (!handle.current) return;
    const blob = await handle.current.capture(size, mime);
    const own = piece?.custom ? customById[piece.custom] : undefined;
    save(
      blob,
      pieceOnly && own && piece
        ? `clothingDB-${own.name}-${piece.texture}.${ext}`
        : pieceOnly && piece
          ? `clothingDB-${gender}-${pieceSlot}-${piece.drawable}-${piece.texture}.${ext}`
          : `clothingDB-${gender}-${Date.now()}.${ext}`,
    );
  }

  async function runCustomBatch(item: CustomItem) {
    if (!handle.current) return;
    const total = Math.max(1, item.piece.textures.length);
    const base = item.gender === gender ? outfit : BASE_OUTFIT;
    if (item.gender !== gender) setGender(item.gender);
    cancel.current = false;
    setProgress({ done: 0, total });
    setFocus(item.slot);
    const files: Record<string, Uint8Array> = {};
    try {
      for (let t = 0; t < total; t++) {
        if (cancel.current) break;
        const job: SlotPick = { drawable: -1, texture: t, custom: item.id };
        setOutfit(garmentOnly ? { [item.slot]: job } : { ...base, [item.slot]: job });
        await until(() => handle.current?.showing(item.slot) === `custom:${item.id}#${t}`);
        await handle.current.ready();
        const blob = await handle.current.capture(size, mime);
        files[`${item.gender}/${item.slot}/${item.name}/${t}.${ext}`] = new Uint8Array(await blob.arrayBuffer());
        setProgress({ done: t + 1, total });
      }
      if (Object.keys(files).length)
        save(
          new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' }),
          `clothingDB-${item.name}.zip`,
        );
    } finally {
      setOutfit({ ...base, [item.slot]: { drawable: -1, texture: 0, custom: item.id } });
      setPieceSlot(item.slot as Slot);
      setFocus(null);
      setProgress(null);
    }
  }

  async function runBatch() {
    if (!handle.current || !m) return;
    const slot = batchSlot;
    const last = Math.min(to, maxDrawable(slot));
    const jobs: SlotPick[] = [];
    for (let d = Math.max(0, from); d <= last; d++)
      for (let t = 0; t <= maxTexture(slot, d); t++) jobs.push({ drawable: d, texture: t });
    if (!jobs.length) return;

    const before = outfit;
    cancel.current = false;
    setProgress({ done: 0, total: jobs.length });
    setFocus(slot);
    const files: Record<string, Uint8Array> = {};
    try {
      for (let i = 0; i < jobs.length; i++) {
        if (cancel.current) break;
        const job = jobs[i];
        setOutfit(garmentOnly ? { [slot]: job } : { ...before, [slot]: job });
        await until(() => handle.current?.showing(slot) === `${gender}/${slot}/${job.drawable}#${job.texture}`);
        await handle.current.ready();
        const blob = await handle.current.capture(size, mime);
        files[`${gender}/${slot}/${job.drawable}/${job.texture}.${ext}`] = new Uint8Array(await blob.arrayBuffer());
        setProgress({ done: i + 1, total: jobs.length });
      }
      if (Object.keys(files).length)
        save(
          new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: 'application/zip' }),
          `clothingDB-${gender}-${slot}.zip`,
        );
    } finally {
      setOutfit(before);
      setFocus(null);
      setProgress(null);
    }
  }

  const header = (
    <div className="flex flex-wrap items-center gap-4 border-b border-hairline px-6 py-5">
      <div className="min-w-0 flex-1">
        <h1 className="text-heading text-fg-strong">Creator Lab</h1>
        <p className="mt-0.5 text-body-sm text-fg-2">Put clothes on the ped and save pictures of them.</p>
      </div>
      <button
        type="button"
        data-tour="help"
        onClick={() => setTour(true)}
        aria-label="How the Ped studio works"
        title="How the Ped studio works"
        className="press flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-fg-2 hover:bg-elevated hover:text-fg"
      >
        <CircleHelp size={17} strokeWidth={1.75} />
      </button>
      {modeSwitch}
      <Button data-tour="capture" onClick={() => void captureView()} disabled={!m || !!progress}>
        <Camera /> Capture view
      </Button>
    </div>
  );

  if (failed && !m)
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {header}
        <div className="m-6 rounded-lg border border-hairline p-8">
          <h2 className="text-heading-sm text-fg-strong">The ped could not load</h2>
          <p className="mt-2 max-w-xl text-body-sm text-fg-2">
            The ped models are not available right now. Try again in a moment. If you run this site yourself, start them
            with <code>bun run serve-peds</code>.
          </p>
        </div>
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tour steps={TOUR} open={tour} onClose={closeTour} />
      <AddClothingDialog open={adding} gender={gender} onClose={() => setAdding(false)} onAdd={addCustoms} />
      {header}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)_300px] lg:overflow-hidden">
        <aside className="flex flex-col gap-5 border-b border-hairline p-5 lg:min-h-0 lg:border-b-0 lg:border-r">
          <div data-tour="ped">
            <Field label="Ped">
              <Pills
                label="Ped"
                value={gender}
                options={['male', 'female'] as Gender[]}
                onChange={(g) => {
                  setGender(g);
                  setOutfit(BASE_OUTFIT);
                }}
              />
            </Field>
          </div>
          <div data-tour="custom" className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-fg-2">Your clothing</p>
              {customs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="press flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] text-fg-2 hover:bg-elevated hover:text-fg"
                >
                  <Plus size={13} /> Add
                </button>
              )}
            </div>
            {customs.length === 0 ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                disabled={!m}
                className="press flex w-full items-center gap-3 rounded-2xl border border-dashed border-hairline-strong p-3 text-left hover:border-fg-3 disabled:opacity-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-elevated text-fg-2">
                  <Plus size={16} />
                </span>
                <span>
                  <span className="block text-[14px] text-fg">Add your own clothing</span>
                  <span className="block text-[12px] text-fg-3">.ydd and .ytd files, not escrowed</span>
                </span>
              </button>
            ) : (
              <ul className="space-y-1.5">
                {customs.map((c) => {
                  const worn = outfit[c.slot]?.custom === c.id;
                  return (
                    <li key={c.id} className="flex items-center gap-2.5 rounded-2xl border border-hairline p-2">
                      <CustomThumb item={c} className="h-9 w-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-fg">{c.name}</span>
                        <span className="block truncate text-[12px] text-fg-3">
                          {categoryBySlug(c.slot)?.label ?? c.slot}
                          {c.gender !== gender ? ` · for the ${c.gender} ped` : ''}
                        </span>
                      </span>
                      {worn ? (
                        <button
                          type="button"
                          aria-label={`Capture every colour of ${c.name}`}
                          title="Capture every colour"
                          onClick={() => void runCustomBatch(c)}
                          disabled={!!progress}
                          className="press flex h-7 w-7 items-center justify-center rounded-full text-fg-2 hover:bg-elevated hover:text-fg disabled:opacity-40"
                        >
                          <Package size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => wearCustom(c)}
                          disabled={!!progress}
                          className="press rounded-full px-2.5 py-0.5 text-[13px] text-fg-2 hover:bg-elevated hover:text-fg"
                        >
                          Wear
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${c.name}`}
                        title="Remove"
                        onClick={() => removeCustom(c.id)}
                        disabled={!!progress}
                        className="press flex h-7 w-7 items-center justify-center rounded-full text-fg-3 hover:bg-elevated hover:text-fg disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div data-tour="outfit" className="flex flex-col gap-2 lg:min-h-0 lg:flex-1">
            <p className="text-[13px] text-fg-2">Outfit</p>
            <div className="space-y-2 lg:-mr-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
              {SLOTS.map((slot) => {
                const p = outfit[slot];
                const label = categoryBySlug(slot)?.label ?? slot;
                return (
                  <div
                    key={slot}
                    className={cn('rounded-2xl border p-2.5', p ? 'border-hairline-strong bg-card' : 'border-hairline')}
                  >
                    <div className="flex items-center justify-between gap-2 px-1">
                      <span className="truncate text-[14px] text-fg">{label}</span>
                      {p ? (
                        <button
                          type="button"
                          aria-label={`Take off ${label}`}
                          onClick={() => pick(slot, null)}
                          className="press flex h-6 w-6 items-center justify-center rounded-full text-fg-3 hover:bg-elevated hover:text-fg"
                        >
                          <X size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => pick(slot, { drawable: 0, texture: 0 })}
                          className="press rounded-full px-2.5 py-0.5 text-[13px] text-fg-2 hover:bg-elevated hover:text-fg"
                        >
                          Wear
                        </button>
                      )}
                    </div>
                    {p?.custom && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <span className="flex h-9 min-w-0 items-center rounded-full border border-ember/60 px-3 text-[13px] text-fg">
                          <span className="truncate">{customById[p.custom]?.name ?? 'Your item'}</span>
                        </span>
                        <Stepper
                          label={`${label} colour`}
                          value={p.texture}
                          onChange={(v) => customColour(slot, p, v)}
                        />
                        <span className="col-span-2 flex items-center justify-between gap-2 px-1 text-[12px] text-fg-3">
                          <span>
                            Your item, {Math.max(1, customColours(p.custom))}{' '}
                            {customColours(p.custom) === 1 ? 'colour' : 'colours'}
                          </span>
                          <button
                            type="button"
                            onClick={() => pick(slot, { drawable: 0, texture: 0 })}
                            className="text-fg-2 underline-offset-2 hover:text-fg hover:underline"
                          >
                            Use game items
                          </button>
                        </span>
                      </div>
                    )}
                    {p && !p.custom && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Stepper
                          label={`${label} drawable`}
                          value={p.drawable}
                          onChange={(v) => pick(slot, { drawable: v })}
                        />
                        <Stepper
                          label={`${label} texture`}
                          value={p.texture}
                          onChange={(v) => pick(slot, { texture: v })}
                        />
                        <span className="col-span-2 px-1 text-[12px] tabular-nums text-fg-3">
                          of {maxDrawable(slot)} drawables, {maxTexture(slot, p.drawable) + 1} textures
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="flex min-h-[70svh] min-w-0 flex-col p-4 lg:min-h-0 lg:p-6">
          <div
            data-tour="stage"
            className={cn(
              'relative min-h-0 flex-1 overflow-hidden rounded-lg border border-hairline',
              backdrop === 'transparent' && 'transparency-grid',
            )}
          >
            <PedViewport
              className="absolute inset-0"
              gender={gender}
              outfit={viewOutfit}
              customs={customPieces}
              backdrop={backdrop}
              framing={framing}
              yaw={yaw}
              focus={viewFocus}
              onReady={(h) => (handle.current = h)}
            />
            {!m && (
              <p className="absolute inset-0 flex items-center justify-center text-body-sm text-fg-2">
                Loading the ped…
              </p>
            )}
            {m && pieceOnly && !piece && (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-body-sm text-fg-2">
                Nothing is worn in {categoryBySlug(pieceSlot)?.label ?? pieceSlot}. Wear something there, or pick
                another piece.
              </p>
            )}
            {progress && (
              <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-full border border-hairline bg-canvas/90 py-1.5 pl-4 pr-1.5">
                <span className="text-[13px] tabular-nums text-fg">
                  Capturing {progress.done} of {progress.total}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                  <span
                    className="block h-full rounded-full bg-ember transition-[width]"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </span>
                <Button size="sm" variant="secondary" onClick={() => (cancel.current = true)}>
                  <Square /> Stop
                </Button>
              </div>
            )}
          </div>
          <div data-tour="view" className="mt-3 grid gap-2 sm:grid-cols-2">
            <Pills
              label="Backdrop"
              value={backdrop}
              options={['transparent', 'studio', 'green', 'magenta'] as StudioBackdrop[]}
              render={(o) => (o === 'transparent' ? 'Clear' : o)}
              onChange={setBackdrop}
            />
            <Pills
              label="Angle"
              value={yaw}
              options={ANGLES.map((a) => a.yaw)}
              render={(y) => ANGLES.find((a) => a.yaw === y)!.label}
              onChange={setYaw}
            />
            <div className="sm:col-span-2">
              <Pills
                label="Framing"
                value={framing}
                options={['full', 'upper', 'lower', 'feet', 'head'] as Framing[]}
                onChange={setFraming}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-6 overflow-y-auto border-t border-hairline p-5 lg:min-h-0 lg:border-l lg:border-t-0">
          <section data-tour="garment">
            <GarmentSwitch
              on={garmentOnly}
              onChange={setGarmentOnly}
              piece={pieceSlot}
              pieces={worn.includes(pieceSlot) ? worn : [pieceSlot, ...worn]}
              onPiece={(s) => setPieceSlot(s as Slot)}
              label={(s) => categoryBySlug(s)?.label ?? s}
            />
          </section>

          <section data-tour="output" className="space-y-4">
            <h2 className="text-[15px] font-medium text-fg">Output</h2>
            <Field label="Size">
              <Pills label="Size" value={size} options={[256, 512, 1024]} render={(o) => `${o}px`} onChange={setSize} />
            </Field>
            <Field label="Format">
              <Pills
                label="Format"
                value={format}
                options={['webp', 'png'] as ('webp' | 'png')[]}
                render={(o) => o.toUpperCase()}
                onChange={setFormat}
              />
            </Field>
          </section>

          <section data-tour="batch" className="space-y-4">
            <h2 className="text-[15px] font-medium text-fg">Batch capture</h2>
            <Field label="Slot">
              <select
                value={batchSlot}
                onChange={(e) => setBatchSlot(e.target.value as Slot)}
                className="h-9 w-full rounded-full border border-hairline bg-canvas px-3 text-[14px] text-fg"
              >
                {SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {categoryBySlug(s)?.label ?? s} ({counts(s).length})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From drawable">
                <Stepper
                  label="From drawable"
                  value={from}
                  onChange={(v) => setFrom(Math.min(v, maxDrawable(batchSlot)))}
                />
              </Field>
              <Field label="To drawable">
                <Stepper label="To drawable" value={to} onChange={(v) => setTo(Math.min(v, maxDrawable(batchSlot)))} />
              </Field>
            </div>
            <p className="text-[13px] text-fg-3">
              {(() => {
                let n = 0;
                for (let d = from; d <= Math.min(to, maxDrawable(batchSlot)); d++) n += maxTexture(batchSlot, d) + 1;
                return n;
              })()} shots, each framed on the garment, {garmentOnly ? 'with only the garment' : 'with the whole ped'},
              saved as a ZIP of gender/slot/drawable/texture.
            </p>
            <Button className="w-full" onClick={() => void runBatch()} disabled={!m || !!progress}>
              <Package /> Capture range
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}
