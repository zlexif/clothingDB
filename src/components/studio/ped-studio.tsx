'use client';

import { zipSync } from 'fflate';
import { Camera, CircleHelp, Package, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { categoryBySlug, type Gender } from '../../lib/clothing';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Tour, type TourStep } from '../ui/tour';
import { Field, Pills, Stepper } from './controls';
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
    save(
      blob,
      pieceOnly && piece
        ? `clothingDB-${gender}-${pieceSlot}-${piece.drawable}-${piece.texture}.${ext}`
        : `clothingDB-${gender}-${Date.now()}.${ext}`,
    );
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
        await new Promise((r) => setTimeout(r, 0));
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
                    {p && (
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
