'use client';

import { ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { imageUrl, type PictureVariant } from '../../../lib/clothing';
import { cn } from '../../../lib/utils';
import { LogoMark } from '../../ui/logo';

export const ease = [0.16, 1, 0.3, 1] as const;
export const spring = { type: 'spring', stiffness: 380, damping: 34 } as const;

export const ITEM = { slug: 'tops', d: 245, t: 0, name: 'Top 245', colours: 10 };

export const pic = (slug: string, d: number, t = 0, kind: PictureVariant = 'garment') =>
  imageUrl('male', slug, d, t, kind);

function Hero({
  kind = 'garment',
  className,
  radius = 14,
}: {
  kind?: PictureVariant;
  className?: string;
  radius?: number;
}) {
  return (
    <motion.div
      layoutId="uc-hero"
      transition={spring}
      style={{ borderRadius: radius }}
      className={cn('transparency-grid relative overflow-hidden border border-hairline', className)}
    >
      <img
        src={pic(ITEM.slug, ITEM.d, ITEM.t, kind)}
        alt=""
        className={cn('h-full w-full object-contain', kind === 'ped' ? 'p-1' : 'p-3')}
      />
    </motion.div>
  );
}

function Thumb({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn('transparency-grid block overflow-hidden rounded-[9px] border border-hairline', className)}>
      <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
    </span>
  );
}

export function StoreScene() {
  return (
    <div className="flex h-full items-center justify-center gap-8">
      <Hero className="h-[240px] w-[240px]" radius={18} />
      <div className="w-[200px]">
        <p className="text-[11px] uppercase tracking-[0.16em] text-fg-3">Clothing store</p>
        <p className="mt-1.5 text-[22px] font-medium text-fg-strong">{ITEM.name}</p>
        <p className="mt-1 text-[13px] text-fg-3">{ITEM.colours} colours</p>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((t) => (
            <Thumb
              key={t}
              src={pic(ITEM.slug, ITEM.d, t)}
              className={cn('aspect-square', t === ITEM.t && 'ring-2 ring-ember/80')}
            />
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-[20px] font-medium text-fg-strong">$85</p>
          <span className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[12.5px] font-medium text-primary-ink">
            <ShoppingBag size={13} />
            Add to bag
          </span>
        </div>
      </div>
    </div>
  );
}

export function EditorScene() {
  return (
    <div className="flex h-full items-center justify-center gap-10">
      <Hero kind="ped" className="h-[330px] w-[230px] bg-canvas" radius={20} />
      <div className="w-[220px] space-y-2 rounded-[16px] border border-hairline bg-card p-3">
        <p className="px-1 pb-1 text-[13px] font-medium text-fg-strong">Character</p>
        {[
          ['Slot', 'Tops'],
          ['Item', '‹  245  ›'],
          ['Colour', '‹  1 / 10  ›'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between rounded-[10px] bg-canvas px-3 py-2 text-[12.5px]">
            <span className="text-fg-3">{k}</span>
            <span className="whitespace-pre tabular-nums text-fg">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const BAG: [string, number][] = [
  ['glasses', 5],
  ['hats', 3],
  ['watches', 20],
  ['legs', 1],
  ['shoes', 12],
  ['masks', 20],
];
const SPOTS = [0, 2, 4, 9, 13, 16];

export function InventoryScene() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-[16px] border border-hairline bg-card p-3">
        <div className="flex items-center justify-between px-1 pb-3 text-[13px]">
          <span className="font-medium text-fg-strong">Inventory</span>
          <span className="text-[11px] tabular-nums text-fg-3">7 / 18</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 18 }, (_, i) => {
            const filler = BAG[SPOTS.indexOf(i)];
            return (
              <div key={i} className="relative h-[62px] w-[62px] rounded-[11px] border border-hairline bg-canvas">
                {i === 7 && <Hero className="absolute inset-0 bg-ember/10 ring-1 ring-ember/70" radius={11} />}
                {filler && (
                  <img
                    src={pic(filler[0], filler[1])}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain p-1.5"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const OUTFIT: [string, string, number][] = [
  ['Hat', 'hats', 30],
  ['Top', 'tops', 245],
  ['Legs', 'legs', 15],
  ['Shoes', 'shoes', 25],
];

export function OutfitScene() {
  return (
    <div className="flex h-full items-center justify-center gap-8">
      <Hero kind="ped" className="h-[330px] w-[230px] bg-canvas" radius={20} />
      <div className="w-[230px] rounded-[16px] border border-hairline bg-card p-3">
        <p className="px-1 text-[13px] font-medium text-fg-strong">Saved outfit</p>
        <ul className="mt-2 space-y-1">
          {OUTFIT.map(([name, slug, d]) => (
            <li
              key={slug}
              className={cn('flex items-center gap-3 rounded-[10px] px-2 py-1.5', slug === ITEM.slug && 'bg-raised')}
            >
              <Thumb src={pic(slug, d)} className="h-9 w-9" />
              <span className="text-[12.5px] text-fg">{name}</span>
              <span className="ml-auto text-[11px] tabular-nums text-fg-3">{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function WebsiteScene({ neighbours }: { neighbours: number[] }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-[520px] overflow-hidden rounded-[16px] border border-hairline bg-card">
        <div className="flex items-center gap-1.5 border-b border-hairline px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-raised" />
          <span className="h-2 w-2 rounded-full bg-raised" />
          <span className="h-2 w-2 rounded-full bg-raised" />
          <span className="ml-2 rounded-full bg-canvas px-3 py-0.5 text-[11px] text-fg-3">
            your-server.com/wiki/tops
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 p-3">
          {neighbours.map((d) => (
            <div key={d}>
              {d === ITEM.d ? (
                <Hero className="aspect-square ring-2 ring-ember/80" radius={10} />
              ) : (
                <Thumb src={pic(ITEM.slug, d)} className="aspect-square rounded-[10px]" />
              )}
              <p className="mt-1 text-[11px] tabular-nums text-fg-3">Top {d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DiscordScene() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-[480px] space-y-4 rounded-[16px] border border-hairline bg-card p-4">
        <div className="flex gap-3">
          <img src="/avatars/zlexif.webp" alt="" className="h-8 w-8 shrink-0 rounded-full bg-black object-cover" />
          <div className="text-[13px]">
            <p className="font-medium text-fg-strong">zlexif</p>
            <p className="text-fg-2">
              <span className="rounded-[4px] bg-[#5865f2]/20 px-1 text-[#a5adff]">/item</span> tops 245
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline bg-canvas">
            <LogoMark className="h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px]">
              <span className="font-medium text-fg-strong">clothingDB</span>
              <span className="rounded-[4px] bg-[#5865f2] px-1 text-[9px] font-medium leading-4 text-white">APP</span>
            </p>
            <div className="mt-1.5 flex gap-4 rounded-[8px] border-l-4 border-ember bg-canvas p-3">
              <div className="flex-1">
                <p className="text-[14px] font-medium text-fg-strong">{ITEM.name}</p>
                <p className="mt-1 text-[12px] text-fg-3">{ITEM.colours} colours · tops/245</p>
              </div>
              <Hero className="h-[96px] w-[96px] shrink-0" radius={8} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
