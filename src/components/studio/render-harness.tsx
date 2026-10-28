'use client';

import { useEffect, useRef, useState } from 'react';
import type { Gender } from '../../lib/clothing';
import {
  type Framing,
  type OverlayPaint,
  PedViewport,
  type PedViewportHandle,
  type SlotPick,
  slotUrl,
} from './ped-viewport';

export type RenderVariant = 'garment' | 'ped';

export interface RenderJob {
  gender: Gender;
  slot: string;
  drawable: number;
  texture: number;
  variant: RenderVariant;
  size: number;
}

declare global {
  interface Window {
    __clothingdbRender?: (job: RenderJob) => Promise<string | null>;
    __clothingdbReady?: boolean;
  }
}

const BASE: Record<string, SlotPick> = {
  head: { drawable: 0, texture: 0 },
  torsos: { drawable: 0, texture: 0 },
  legs: { drawable: 0, texture: 0 },
  shoes: { drawable: 0, texture: 0 },
  tops: { drawable: 0, texture: 0 },
};

const HIDES: Record<string, string[]> = {
  undershirts: ['tops'],
};

const PED_FRAMING: Record<string, Framing> = {
  masks: 'head',
  hair: 'head',
  hats: 'head',
  glasses: 'head',
  ears: 'head',
};

const PED_FOCUS = new Set(['watches', 'bracelets']);

const headFor = (gender: Gender): SlotPick => ({ drawable: gender === 'female' ? 21 : 0, texture: 0 });

const BARE_TORSO: SlotPick = { drawable: 15, texture: 0 };

const HAIR: [number, number, number] = [40, 28, 20];

const OVERLAYS: Record<
  string,
  { target: 'head' | 'torsos'; mode: OverlayPaint['mode']; color?: [number, number, number] }
> = {
  blemishes: { target: 'head', mode: 'detail' },
  'facial-hair': { target: 'head', mode: 'tint', color: HAIR },
  eyebrows: { target: 'head', mode: 'tint', color: HAIR },
  ageing: { target: 'head', mode: 'detail' },
  makeup: { target: 'head', mode: 'color' },
  blush: { target: 'head', mode: 'flat', color: [205, 95, 105] },
  complexion: { target: 'head', mode: 'detail' },
  'sun-damage': { target: 'head', mode: 'detail' },
  lipstick: { target: 'head', mode: 'flat', color: [160, 35, 50] },
  moles: { target: 'head', mode: 'detail' },
  'chest-hair': { target: 'torsos', mode: 'tint', color: HAIR },
  'body-blemishes': { target: 'torsos', mode: 'detail' },
};

const YAW: Record<string, number> = { bags: 180 };

type Scene = {
  gender: Gender;
  outfit: Record<string, SlotPick | null>;
  focus: string | null;
  framing: Framing;
  yaw: number;
};

function sceneFor(job: RenderJob): Scene {
  const ov = OVERLAYS[job.slot];
  if (ov) {
    const skin = ov.target === 'head' ? headFor(job.gender) : BARE_TORSO;
    if (job.variant === 'garment')
      return { gender: job.gender, outfit: { [ov.target]: skin }, focus: ov.target, framing: 'full', yaw: 0 };
    const outfit: Record<string, SlotPick | null> = { ...BASE, head: headFor(job.gender), [ov.target]: skin };
    if (ov.target === 'torsos') delete outfit.tops;
    return { gender: job.gender, outfit, focus: null, framing: ov.target === 'head' ? 'head' : 'upper', yaw: 0 };
  }
  const pick = { drawable: job.drawable, texture: job.texture };
  if (job.variant === 'garment')
    return {
      gender: job.gender,
      outfit: { [job.slot]: pick },
      focus: job.slot,
      framing: 'full',
      yaw: YAW[job.slot] ?? 0,
    };
  const outfit: Record<string, SlotPick | null> = { ...BASE, head: headFor(job.gender), [job.slot]: pick };
  for (const s of HIDES[job.slot] ?? []) delete outfit[s];
  return {
    gender: job.gender,
    outfit,
    focus: PED_FOCUS.has(job.slot) ? job.slot : null,
    framing: PED_FRAMING[job.slot] ?? 'full',
    yaw: YAW[job.slot] ?? 0,
  };
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] ?? '');
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });

export function RenderHarness() {
  const [scene, setScene] = useState<Scene>({ gender: 'male', outfit: {}, focus: null, framing: 'full', yaw: 0 });
  const handle = useRef<PedViewportHandle | null>(null);
  const waiting = useRef<{ job: RenderJob; resolve: (v: string | null) => void; reject: (e: unknown) => void } | null>(
    null,
  );

  useEffect(() => {
    window.__clothingdbRender = (job) =>
      new Promise((resolve, reject) => {
        waiting.current = { job, resolve, reject };
        setScene(sceneFor(job));
      });
    window.__clothingdbReady = true;
    return () => {
      delete window.__clothingdbRender;
      window.__clothingdbReady = false;
    };
  }, []);

  useEffect(() => {
    const w = waiting.current;
    const h = handle.current;
    if (!w || !h) return;
    waiting.current = null;
    (async () => {
      await h.ready();
      const ov = OVERLAYS[w.job.slot];
      if (ov) {
        if (!h.has(ov.target)) return w.resolve(null);
        const url = `${slotUrl(w.job.gender, w.job.slot, { drawable: w.job.drawable, texture: 0 })}/0.png`;
        const painted = await h.paint(ov.target, { url, mode: ov.mode, color: ov.color }).catch(() => false);
        if (!painted) return w.resolve(null);
      } else if (!h.has(w.job.slot)) return w.resolve(null);
      const blob = await h.capture(w.job.size, 'image/webp');
      w.resolve(await toBase64(blob));
    })().catch(w.reject);
  }, [scene]);

  return (
    <div style={{ width: 512, height: 512 }}>
      <PedViewport
        className="h-full w-full"
        gender={scene.gender}
        outfit={scene.outfit}
        backdrop="transparent"
        framing={scene.framing}
        yaw={scene.yaw}
        focus={scene.focus}
        onReady={(h) => (handle.current = h)}
      />
    </div>
  );
}
