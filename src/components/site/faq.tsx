'use client';

import { ArrowDown, ArrowUp, Check, FileArchive, Search, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { imageUrl } from '../../lib/clothing';
import { cn } from '../../lib/utils';
import { FlipCounter } from '../ui/flip-counter';

type DrawableIndex = Record<'male' | 'female', Record<string, number[]>>;
type Topic = 'pictures' | 'use' | 'lab' | 'hosting';
type Demo =
  | 'address'
  | 'colours'
  | 'kinds'
  | 'build'
  | 'img'
  | 'free'
  | 'viewfinder'
  | 'batch'
  | 'keying'
  | 'host'
  | 'forever';

const TOPICS: { id: Topic | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pictures', label: 'Pictures' },
  { id: 'use', label: 'Using them' },
  { id: 'lab', label: 'Creator Lab' },
  { id: 'hosting', label: 'Hosting' },
];

const FAQS: { id: string; topic: Topic; q: string; a: string; demo: Demo }[] = [
  {
    id: 'address',
    topic: 'pictures',
    q: 'How do picture addresses work?',
    a: 'Every picture has a fixed address made of four parts: male or female, the slot, the item number and the colour. Change any part and you get a different picture.',
    demo: 'address',
  },
  {
    id: 'colours',
    topic: 'pictures',
    q: 'What does the colour count mean?',
    a: 'Most items come in more than one colour. Each colour is its own picture with its own number, starting at 0. Top 245 comes in ten.',
    demo: 'colours',
  },
  {
    id: 'kinds',
    topic: 'pictures',
    q: 'Do props and face overlays work the same way?',
    a: 'Yes. Hats, glasses, watches, makeup, facial hair and the rest all use the same four-part address, so one pattern covers every slot.',
    demo: 'kinds',
  },
  {
    id: 'build',
    topic: 'pictures',
    q: 'What happens when the game adds new clothes?',
    a: 'New items are added at the end of each slot. The numbers you already use stay where they are, so anything already using them keeps working.',
    demo: 'build',
  },
  {
    id: 'img',
    topic: 'use',
    q: 'How do I show a picture?',
    a: 'Copy the address and use it as the source of an image, in a game UI, a website, a Discord bot or anything else that shows pictures. There is nothing to download or install.',
    demo: 'img',
  },
  {
    id: 'free',
    topic: 'use',
    q: 'Do I need a key or an account?',
    a: 'No. The pictures are public addresses. Paste one into a browser and it loads, the same way it will anywhere else you use it.',
    demo: 'free',
  },
  {
    id: 'viewfinder',
    topic: 'lab',
    q: 'What is the Creator Lab?',
    a: 'The real male and female ped, loaded in your browser. Dress them, frame the shot and save the picture. The game does not need to be open.',
    demo: 'viewfinder',
  },
  {
    id: 'batch',
    topic: 'lab',
    q: 'Can I photograph a whole range at once?',
    a: 'Pick a slot and a range of items and it photographs every one in every colour, then hands you one ZIP sorted the same way as the addresses.',
    demo: 'batch',
  },
  {
    id: 'keying',
    topic: 'lab',
    q: 'Can I clean up screenshots I took in game?',
    a: 'Drop in shots taken on a green or magenta background and the background is removed for you. Nothing you add leaves your browser.',
    demo: 'keying',
  },
  {
    id: 'host',
    topic: 'hosting',
    q: 'Can we host the pictures ourselves?',
    a: 'Yes. Copy them to your own storage with the same folders and change one setting. Every address on the site then points at your copy.',
    demo: 'host',
  },
  {
    id: 'forever',
    topic: 'hosting',
    q: 'Will an address ever change?',
    a: 'No. A picture keeps its address for good, which is why browsers are told to keep it for a whole year instead of downloading it again.',
    demo: 'forever',
  },
];

const AUTOPLAY_MS = 9000;
const ease = [0.16, 1, 0.3, 1] as const;

function useTick(ms: number, n: number) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce || n < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % n), ms);
    return () => clearInterval(id);
  }, [ms, n, reduce]);
  return i;
}

function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return wide;
}

function Stage({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-hairline bg-canvas">
      <div className="flex min-h-[200px] items-center justify-center p-5">{children}</div>
      <p className="border-t border-hairline px-4 py-2 text-[13px] text-fg-3">{caption}</p>
    </div>
  );
}

function Thumb({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn('transparency-grid block overflow-hidden rounded-[10px] border border-hairline', className)}>
      <img src={src} alt="" width={96} height={96} className="h-full w-full object-contain p-1" />
    </span>
  );
}

function AddressDemo() {
  const parts = [
    { v: 'male', l: 'Male or female' },
    { v: 'tops', l: 'Slot' },
    { v: '245', l: 'Item' },
    { v: '0', l: 'Colour' },
  ];
  const i = useTick(1100, parts.length);
  return (
    <Stage caption="Each part of the address picks one thing.">
      <div className="flex flex-wrap items-start justify-center gap-x-1 text-[clamp(18px,2.4vw,28px)] font-medium text-fg-3">
        <span>…/</span>
        {parts.map((p, n) => (
          <span key={p.l} className="flex items-start">
            <span className="relative flex flex-col items-center px-0.5">
              <span className={cn('transition-colors duration-300', n === i ? 'text-fg-strong' : '')}>{p.v}</span>
              <span
                className={cn(
                  'absolute -bottom-1 left-0 right-0 h-[3px] origin-left rounded-full bg-ember transition-transform duration-500 ease-out',
                  n === i ? 'scale-x-100' : 'scale-x-0',
                )}
              />
              <motion.span
                animate={{ opacity: n === i ? 1 : 0, y: n === i ? 0 : -4 }}
                className="mt-3 text-[12px] font-normal text-ember"
              >
                {p.l}
              </motion.span>
            </span>
            {n < parts.length - 1 && <span>/</span>}
          </span>
        ))}
        <span>.webp</span>
      </div>
    </Stage>
  );
}

function ColoursDemo({ count }: { count: number }) {
  const n = Math.max(1, Math.min(10, count));
  const i = useTick(800, n);
  return (
    <Stage caption={`Top 245, colour ${i} of ${n - 1}.`}>
      <div className="flex w-full items-center gap-5">
        <div className="relative aspect-square w-[38%] shrink-0">
          <AnimatePresence initial={false}>
            <motion.img
              key={i}
              src={imageUrl('male', 'tops', 245, i)}
              alt=""
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </AnimatePresence>
        </div>
        <div className="grid flex-1 grid-cols-5 gap-1.5">
          {Array.from({ length: n }, (_, t) => (
            <motion.span
              key={t}
              animate={{ scale: t === i ? 1.08 : 1, opacity: t === i ? 1 : 0.55 }}
              transition={{ duration: 0.25 }}
            >
              <Thumb src={imageUrl('male', 'tops', 245, t)} className={cn('aspect-square', t === i && 'border-fg-2')} />
            </motion.span>
          ))}
        </div>
      </div>
    </Stage>
  );
}

function KindsDemo() {
  const items = [
    { src: imageUrl('male', 'hats', 3, 0), l: 'hats/3' },
    { src: imageUrl('male', 'glasses', 5, 0), l: 'glasses/5' },
    { src: imageUrl('female', 'makeup', 20, 0), l: 'makeup/20' },
  ];
  return (
    <Stage caption="A hat, a pair of glasses and a makeup style, all with the same kind of address.">
      <div className="grid w-full grid-cols-3 gap-3">
        {items.map((it, n) => (
          <motion.div
            key={it.l}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.4, delay: n * 0.12 },
              y: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: n * 0.4 },
            }}
          >
            <Thumb src={it.src} className="aspect-square" />
            <p className="mt-2 text-center text-[13px] tabular-nums text-fg-2">{it.l}</p>
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

const LAST_BEFORE_UPDATE = 150;

function BuildDemo() {
  const before = [LAST_BEFORE_UPDATE - 2, LAST_BEFORE_UPDATE - 1, LAST_BEFORE_UPDATE];
  const added = [LAST_BEFORE_UPDATE + 1, LAST_BEFORE_UPDATE + 2, LAST_BEFORE_UPDATE + 3];
  const card = (n: number, fresh: boolean) => (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cn(
          'transparency-grid block h-14 w-14 overflow-hidden rounded-[12px] border sm:h-16 sm:w-16',
          fresh ? 'border-ember/70' : 'border-hairline',
        )}
      >
        <img
          src={imageUrl('male', 'shoes', n, 0)}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-contain p-1.5"
        />
      </span>
      <span className={cn('text-[12px] tabular-nums', fresh ? 'text-ember' : 'text-fg-2')}>{n}</span>
    </div>
  );
  return (
    <Stage caption="New items are added after the last one. The numbers you already use never move.">
      <div className="flex items-start gap-1.5 sm:gap-2">
        {before.map((n) => (
          <div key={n}>{card(n, false)}</div>
        ))}
        <span
          aria-hidden="true"
          className="mx-1.5 h-14 w-px self-start border-l border-dashed border-hairline-strong sm:h-16"
        />
        {added.map((n, i) => (
          <motion.div
            key={n}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.4, ease }}
          >
            {card(n, true)}
          </motion.div>
        ))}
      </div>
    </Stage>
  );
}

function ImgDemo() {
  const code = `<img src="…/male/tops/245/0.webp">`;
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? code.length : 0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setN((v) => (v >= code.length + 24 ? 0 : v + 1)), 45);
    return () => clearInterval(id);
  }, [code.length, reduce]);
  const done = n >= code.length;
  return (
    <Stage caption="One line of HTML, and the picture shows up.">
      <div className="flex w-full flex-col items-center gap-5 sm:flex-row">
        <code className="min-h-[48px] flex-1 break-all rounded-[10px] border border-hairline bg-card px-4 py-3 text-[14px] text-fg">
          {code.slice(0, n)}
          <span
            className={cn(
              'ml-px inline-block h-4 w-[2px] translate-y-0.5 bg-ember',
              done ? 'opacity-0' : 'animate-pulse',
            )}
          />
        </code>
        <motion.div
          animate={{ opacity: done ? 1 : 0.15, scale: done ? 1 : 0.92 }}
          transition={{ duration: 0.4, ease }}
          className="w-28 shrink-0"
        >
          <Thumb src={imageUrl('male', 'tops', 245, 0)} className="aspect-square" />
        </motion.div>
      </div>
    </Stage>
  );
}

function FreeDemo() {
  const chips = ['No key', 'No account', 'No sign-up form', 'Works in any browser'];
  return (
    <Stage caption="Paste an address and it loads.">
      <div className="flex flex-wrap justify-center gap-2">
        {chips.map((c, n) => (
          <motion.span
            key={c}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + n * 0.12, type: 'spring', stiffness: 360, damping: 24 }}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-card px-4 text-[15px] text-fg"
          >
            <Check size={15} strokeWidth={2} className="text-ember" />
            {c}
          </motion.span>
        ))}
      </div>
    </Stage>
  );
}

function ViewfinderDemo() {
  const shot = useTick(1600, 2);
  const corner = 'absolute h-5 w-5 border-fg-strong';
  return (
    <Stage caption="Frame the garment, take the shot, keep a see-through picture.">
      <div className="relative aspect-[4/3] w-[min(100%,280px)] overflow-hidden rounded-[10px] bg-card">
        <img
          src={imageUrl('male', 'tops', 20, 0)}
          alt=""
          className="absolute inset-0 h-full w-full object-contain p-6"
        />
        <motion.div
          animate={{ inset: shot ? '14%' : '4%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          className="absolute"
        >
          <span className={cn(corner, 'left-0 top-0 border-l-2 border-t-2')} />
          <span className={cn(corner, 'right-0 top-0 border-r-2 border-t-2')} />
          <span className={cn(corner, 'bottom-0 left-0 border-b-2 border-l-2')} />
          <span className={cn(corner, 'bottom-0 right-0 border-b-2 border-r-2')} />
        </motion.div>
        <AnimatePresence>
          {shot === 1 && (
            <motion.span
              key="flash"
              initial={{ opacity: 0.85 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="absolute inset-0 bg-fg-strong"
            />
          )}
        </AnimatePresence>
        <span className="absolute right-2 top-2 flex items-center gap-1.5 text-[11px] text-fg-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-crimson" />
          live
        </span>
      </div>
    </Stage>
  );
}

function BatchDemo({ count }: { count: number }) {
  const n = Math.max(1, Math.min(8, count));
  const step = useTick(520, n + 5);
  const done = Math.min(step, n);
  const finished = done === n;
  return (
    <Stage
      caption={
        finished ? `All ${n} colours of top 245, saved as one ZIP.` : `Photographing colour ${done + 1} of ${n}…`
      }
    >
      <div className="flex w-full flex-col gap-5 sm:flex-row sm:items-center">
        <ul className="grid flex-1 grid-cols-4 gap-2">
          {Array.from({ length: n }, (_, t) => {
            const shot = t < done;
            const now = t === done && !finished;
            return (
              <li key={t} className="relative">
                <motion.span
                  animate={{ opacity: shot ? 1 : now ? 0.8 : 0.25, scale: now ? 1.04 : 1 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    'transparency-grid relative block aspect-square overflow-hidden rounded-[10px] border',
                    now ? 'border-ember' : shot ? 'border-hairline' : 'border-dashed border-outline',
                  )}
                >
                  <img
                    src={imageUrl('male', 'tops', 245, t)}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-contain p-1"
                  />
                  <AnimatePresence>
                    {t === done - 1 && (
                      <motion.span
                        key="flash"
                        initial={{ opacity: 0.9 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.45 }}
                        className="absolute inset-0 bg-fg-strong"
                      />
                    )}
                  </AnimatePresence>
                </motion.span>
                <AnimatePresence>
                  {shot && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-verdant text-canvas"
                    >
                      <Check size={10} strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="mt-1 block text-center text-[11px] tabular-nums text-fg-3">{t}.webp</span>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-3 rounded-[12px] border border-hairline bg-card p-3 sm:w-[190px] sm:flex-col sm:items-stretch">
          <motion.span
            animate={{ scale: finished ? [1, 1.15, 1] : 1, rotate: finished ? [0, -6, 0] : 0 }}
            transition={{ duration: 0.5 }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-canvas sm:mx-auto"
          >
            <FileArchive size={22} strokeWidth={1.5} className="text-ember" />
          </motion.span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[13px] font-medium text-fg sm:text-center">tops.zip</p>
            <p className="truncate text-[12px] text-fg-3 sm:text-center">male / tops / 245 /</p>
            <span className="block h-1 overflow-hidden rounded-full bg-raised">
              <motion.span
                animate={{ width: `${(done / n) * 100}%` }}
                transition={{ duration: 0.3 }}
                className={cn('block h-full', finished ? 'bg-verdant' : 'bg-ember')}
              />
            </span>
            <p className="text-[12px] tabular-nums text-fg-2 sm:text-center">
              {done} / {n} pictures
            </p>
          </div>
        </div>
      </div>
    </Stage>
  );
}

function KeyingDemo() {
  return (
    <Stage caption="Green in, see-through out.">
      <div className="relative aspect-[4/3] w-[min(100%,280px)] overflow-hidden rounded-[10px]">
        <div className="transparency-grid absolute inset-0" />
        <motion.div
          className="absolute inset-0 bg-[#00ff00]"
          animate={{ clipPath: ['inset(0 0% 0 0)', 'inset(0 0% 0 100%)', 'inset(0 0% 0 100%)', 'inset(0 0% 0 0)'] }}
          transition={{ duration: 4, times: [0, 0.45, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }}
        />
        <img
          src={imageUrl('male', 'tops', 245, 3)}
          alt=""
          className="absolute inset-0 h-full w-full object-contain p-5"
        />
      </div>
    </Stage>
  );
}

function HostDemo() {
  const hosts = ['cdn.auradevelopment.xyz', 'pictures.your-server.com'];
  const i = useTick(1800, 2);
  return (
    <Stage caption="Change one setting and the whole site follows.">
      <div className="flex flex-wrap items-center justify-center text-[clamp(15px,2vw,22px)] font-medium">
        <span className="text-fg-3">https://</span>
        <motion.span layout className="relative inline-flex overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={hosts[i]}
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.4, ease }}
              className={i ? 'text-ember' : 'text-fg-strong'}
            >
              {hosts[i]}
            </motion.span>
          </AnimatePresence>
        </motion.span>
        <motion.span layout className="text-fg-3">
          /clothingdb/garment/male/tops/245/0.webp
        </motion.span>
      </div>
    </Stage>
  );
}

function ForeverDemo() {
  const steps = [1, 7, 30, 90, 180, 365];
  const i = useTick(900, steps.length + 2);
  return (
    <Stage caption="Days a browser keeps each picture before asking again.">
      <div className="flex items-baseline gap-3">
        <FlipCounter value={steps[Math.min(i, steps.length - 1)]} minDigits={3} />
        <span className="text-[15px] text-fg-2">days</span>
      </div>
    </Stage>
  );
}

function DemoFor({ demo, index }: { demo: Demo; index: DrawableIndex }) {
  const colours = index.male.tops?.[245] ?? 1;
  switch (demo) {
    case 'address':
      return <AddressDemo />;
    case 'colours':
      return <ColoursDemo count={colours} />;
    case 'kinds':
      return <KindsDemo />;
    case 'build':
      return <BuildDemo />;
    case 'img':
      return <ImgDemo />;
    case 'free':
      return <FreeDemo />;
    case 'viewfinder':
      return <ViewfinderDemo />;
    case 'batch':
      return <BatchDemo count={colours} />;
    case 'keying':
      return <KeyingDemo />;
    case 'host':
      return <HostDemo />;
    case 'forever':
      return <ForeverDemo />;
  }
}

export function Faq({ index }: { index: DrawableIndex }) {
  const [topic, setTopic] = useState<Topic | 'all'>('all');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(FAQS[0].id);
  const [auto, setAuto] = useState(true);
  const reduce = useReducedMotion();
  const wide = useWide();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter(
      (f) => (topic === 'all' || f.topic === topic) && (!q || `${f.q} ${f.a}`.toLowerCase().includes(q)),
    );
  }, [topic, query]);
  const current = list.find((f) => f.id === activeId) ?? list[0];
  const pos = current ? list.indexOf(current) : -1;
  const playing = auto && inView && !reduce && list.length > 1;

  const stop = () => setAuto(false);
  const go = (delta: number) => {
    if (!list.length) return;
    setActiveId(list[(pos + delta + list.length) % list.length].id);
  };
  const choose = (id: string) => {
    stop();
    setActiveId(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || !inView) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inView]);

  const answer = current && (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
        transition={{ duration: 0.38, ease }}
        className="flex h-full flex-col"
      >
        <p className="flex items-center gap-2 text-[13px] text-fg-3">
          <span className="text-ember">{TOPICS.find((t) => t.id === current.topic)?.label}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {String(pos + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
          </span>
        </p>
        {wide && <h3 className="mt-3 text-step-3 font-medium text-fg-strong">{current.q}</h3>}
        <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-fg-2">
          {current.a.split(' ').map((w, n) => (
            <motion.span
              key={n}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.3, delay: 0.1 + Math.min(n, 40) * 0.018 }}
              className="inline-block whitespace-pre"
            >
              {w}{' '}
            </motion.span>
          ))}
        </p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25, ease }}
          className="mt-6"
        >
          <DemoFor demo={current.demo} index={index} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <section ref={ref} aria-labelledby="faq-title" className="mx-auto mt-40 w-full max-w-page px-4 sm:px-8">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
        <h2 id="faq-title" className="text-step-4 text-fg-strong">
          <span className="text-fg-2">Questions,</span>
          <br />
          answered.
        </h2>
        <label className="flex h-11 w-full items-center gap-2 rounded-full border border-hairline bg-card px-4 focus-within:border-fg-3 sm:w-[340px]">
          <Search size={16} strokeWidth={1.5} className="shrink-0 text-icon" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => {
              stop();
              setQuery(e.target.value);
            }}
            placeholder="Search the answers"
            aria-label="Search the answers"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-3"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="text-fg-3 hover:text-fg"
            >
              <X size={15} />
            </button>
          ) : (
            <kbd className="rounded-[6px] border border-hairline px-1.5 text-[12px] text-fg-3">/</kbd>
          )}
        </label>
      </div>

      <div
        data-reveal
        className="mt-12 grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-lg border border-hairline bg-card lg:grid-cols-[380px_minmax(0,1fr)]"
      >
        <div className="border-b border-hairline lg:border-b-0 lg:border-r">
          <LayoutGroup id="faq-topics">
            <div role="tablist" aria-label="Topics" className="flex flex-wrap gap-1 border-b border-hairline p-2">
              {TOPICS.map((t) => {
                const on = t.id === topic;
                const n = t.id === 'all' ? FAQS.length : FAQS.filter((f) => f.topic === t.id).length;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => {
                      stop();
                      setTopic(t.id);
                    }}
                    className={cn(
                      'relative h-9 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors',
                      on ? 'text-primary-ink' : 'text-fg-2 hover:text-fg',
                    )}
                  >
                    {on && (
                      <motion.span
                        layoutId="faq-topic"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-primary"
                      />
                    )}
                    <span className="relative">
                      {t.label}{' '}
                      <span className={cn('tabular-nums', on ? 'text-primary-ink/60' : 'text-fg-3')}>{n}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>

          <LayoutGroup id="faq-list">
            <ul
              aria-label="Questions"
              className="p-2"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  stop();
                  go(e.key === 'ArrowDown' ? 1 : -1);
                }
              }}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {list.map((f, n) => {
                  const on = f.id === current?.id;
                  return (
                    <motion.li
                      key={f.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25, ease }}
                    >
                      <button
                        type="button"
                        aria-expanded={on}
                        onClick={() => choose(f.id)}
                        className={cn(
                          'relative flex w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left transition-colors',
                          on ? 'text-fg-strong' : 'text-fg-2 hover:text-fg',
                        )}
                      >
                        {on && (
                          <motion.span
                            layoutId="faq-active"
                            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                            className="absolute inset-0 rounded-[12px] bg-elevated"
                          >
                            <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-ember" />
                          </motion.span>
                        )}
                        <span
                          className={cn(
                            'relative w-6 shrink-0 pt-px text-[13px] tabular-nums',
                            on ? 'text-ember' : 'text-fg-3',
                          )}
                        >
                          {String(n + 1).padStart(2, '0')}
                        </span>
                        <span className="relative text-[15px] font-medium">{f.q}</span>
                      </button>
                      {!wide && on && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.35, ease }}
                          className="overflow-hidden px-3 pb-4 pt-2"
                        >
                          {answer}
                        </motion.div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
              {list.length === 0 && (
                <li className="px-3 py-8 text-center text-[15px] text-fg-2">
                  Nothing matches “{query}”.{' '}
                  <button type="button" onClick={() => setQuery('')} className="link-ember">
                    Clear the search
                  </button>
                </li>
              )}
            </ul>
          </LayoutGroup>
        </div>

        {wide && (
          <div className="flex min-h-[560px] flex-col p-6 sm:p-8">
            <div className="flex-1">{answer}</div>

            {current && (
              <div className="mt-8 flex items-center gap-4">
                <div className="flex flex-1 gap-1">
                  {list.map((f, n) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-label={`Question ${n + 1}`}
                      onClick={() => choose(f.id)}
                      className="group h-4 flex-1 py-1.5"
                    >
                      <span className="block h-1 overflow-hidden rounded-full bg-raised group-hover:bg-outline">
                        {n < pos && <span className="block h-full w-full bg-fg-3" />}
                        {n === pos &&
                          (playing ? (
                            <motion.span
                              key={`${f.id}-${topic}-${query}`}
                              initial={{ width: '0%' }}
                              animate={{ width: '100%' }}
                              transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
                              onAnimationComplete={() => go(1)}
                              className="block h-full bg-ember"
                            />
                          ) : (
                            <span className="block h-full w-full bg-ember" />
                          ))}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous question"
                    onClick={() => {
                      stop();
                      go(-1);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-canvas text-fg-2 hover:text-fg"
                  >
                    <ArrowUp size={15} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next question"
                    onClick={() => {
                      stop();
                      go(1);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-canvas text-fg-2 hover:text-fg"
                  >
                    <ArrowDown size={15} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
