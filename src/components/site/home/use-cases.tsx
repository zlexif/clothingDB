'use client';

import { Backpack, Check, Copy, Globe, Layers, MessageSquare, Shirt, UserRound } from 'lucide-react';
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useInView, useReducedMotion } from 'motion/react';
import { type ComponentType, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { itemsWithPictures, type PictureVariant } from '../../../lib/clothing';
import { cn } from '../../../lib/utils';
import { type DrawableIndex, wrap } from './shared';
import {
  DiscordScene,
  EditorScene,
  ease,
  InventoryScene,
  ITEM,
  OutfitScene,
  pic,
  StoreScene,
  spring,
  WebsiteScene,
} from './use-case-scenes';

interface UseCase {
  id: string;
  icon: typeof Shirt;
  title: string;
  blurb: string;
  kind: PictureVariant;
  Scene: ComponentType<{ neighbours: number[] }>;
}

const USES: UseCase[] = [
  {
    id: 'store',
    icon: Shirt,
    title: 'Clothing stores',
    blurb: 'Show every item and every colour in an in-game shop.',
    kind: 'garment',
    Scene: StoreScene,
  },
  {
    id: 'editor',
    icon: UserRound,
    title: 'Appearance editors',
    blurb: 'Show the piece worn while players build their look.',
    kind: 'ped',
    Scene: EditorScene,
  },
  {
    id: 'inventory',
    icon: Backpack,
    title: 'Inventory icons',
    blurb: 'Give clothing a real icon. The picture is see-through, so any slot style works.',
    kind: 'garment',
    Scene: InventoryScene,
  },
  {
    id: 'outfit',
    icon: Layers,
    title: 'Outfits and wardrobes',
    blurb: 'Show saved outfits piece by piece.',
    kind: 'ped',
    Scene: OutfitScene,
  },
  {
    id: 'website',
    icon: Globe,
    title: 'Websites and wikis',
    blurb: 'Every clothing picture in one place, so you never spend hours digging through sites for the right image.',
    kind: 'garment',
    Scene: WebsiteScene,
  },
  {
    id: 'discord',
    icon: MessageSquare,
    title: 'Discord bots',
    blurb: 'Answer a command with the item in an embed.',
    kind: 'garment',
    Scene: DiscordScene,
  },
];

const AUTO_MS = 6000;
const W = 620;
const H = 400;

function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="uc-stage relative w-full overflow-hidden" style={{ height: H * scale }}>
      <div
        className="absolute top-0"
        style={{
          width: W,
          height: H,
          left: scale < 1 ? 0 : `calc(50% - ${W / 2}px)`,
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AddressBar({ kind }: { kind: PictureVariant }) {
  const [copied, setCopied] = useState(false);
  const url = pic(ITEM.slug, ITEM.d, ITEM.t, kind);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <div className="flex items-center gap-3 border-t border-hairline px-4 py-3">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-[13px] text-fg-3 [scrollbar-width:none]">
        …/
        <span className="relative inline-flex overflow-hidden align-bottom">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={kind}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.3, ease }}
              className="inline-block text-ember"
            >
              {kind}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="text-fg">/male/tops/245/0.webp</span>
      </code>
      <button
        type="button"
        onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true))}
        className="press flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[12px] text-fg-2 hover:border-hairline-strong hover:text-fg"
      >
        {copied ? <Check size={13} className="text-ember" /> : <Copy size={13} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function UseCases({ index }: { index: DrawableIndex }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const playing = auto && inView && !reduce;
  const use = USES[active];

  const neighbours = useMemo(() => {
    const valid = itemsWithPictures(index.male[ITEM.slug] ?? []);
    const pos = Math.max(0, valid.indexOf(ITEM.d));
    const start = Math.min(Math.max(0, pos - 3), Math.max(0, valid.length - 8));
    return valid.slice(start, start + 8);
  }, [index]);

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % USES.length), AUTO_MS);
    return () => clearTimeout(id);
  }, [playing, active]);

  const choose = (i: number) => {
    setAuto(false);
    setActive(i);
  };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="uses">
        <section ref={ref} aria-labelledby="uses-title" className={cn(wrap, 'mt-40')}>
          <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
            <h2 id="uses-title" className="text-step-4 text-fg-strong">
              <span className="text-fg-2">One picture set,</span>
              <br />
              many uses.
            </h2>
            <p className="max-w-sm text-step-2 text-fg-2">
              Every picture is a plain address, so it fits anywhere an image does.
            </p>
          </div>

          <div data-reveal className="mt-12 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div
              role="tablist"
              aria-label="Use cases"
              className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:px-0"
            >
              {USES.map((u, i) => {
                const on = i === active;
                return (
                  <button
                    key={u.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => choose(i)}
                    className="group relative shrink-0 overflow-hidden rounded-[14px] px-4 py-3 text-left"
                  >
                    {on && (
                      <motion.span
                        layoutId="uc-rail"
                        transition={spring}
                        className="absolute inset-0 rounded-[14px] border border-hairline bg-card"
                      />
                    )}
                    <span className="relative flex items-center gap-3">
                      <u.icon
                        size={16}
                        strokeWidth={1.7}
                        className={cn('transition-colors', on ? 'text-ember' : 'text-fg-3 group-hover:text-fg-2')}
                      />
                      <span
                        className={cn(
                          'whitespace-nowrap text-[14.5px] font-medium transition-colors',
                          on ? 'text-fg-strong' : 'text-fg-2 group-hover:text-fg',
                        )}
                      >
                        {u.title}
                      </span>
                    </span>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.span
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease }}
                          className="relative hidden overflow-hidden lg:block"
                        >
                          <span className="block pl-7 pt-1.5 text-[13px] leading-relaxed text-fg-2">{u.blurb}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {on && playing && (
                      <motion.span
                        key={u.id}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: AUTO_MS / 1000, ease: 'linear' }}
                        className="absolute inset-x-4 bottom-0 h-[2px] origin-left rounded-full bg-ember/70"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 overflow-hidden rounded-[18px] border border-hairline bg-card">
              <Stage>
                <AnimatePresence initial={false}>
                  <motion.div
                    key={use.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="absolute inset-0"
                  >
                    <use.Scene neighbours={neighbours} />
                  </motion.div>
                </AnimatePresence>
              </Stage>
              <p className="border-t border-hairline px-4 py-3 text-[14px] text-fg-2 lg:hidden">{use.blurb}</p>
              <AddressBar kind={use.kind} />
            </div>
          </div>
        </section>
      </LayoutGroup>
    </MotionConfig>
  );
}
