'use client';

import { useEffect, useRef, useState } from 'react';
import { categoryBySlug, type Gender, imageUrl } from '../../../lib/clothing';
import { cn } from '../../../lib/utils';
import { HeroField, Landscape } from '../art';
import { wrap } from './shared';

interface Frame {
  gender: Gender;
  slug: string;
  drawable: number;
  texture: number;
}

const HERO_FRAMES: Frame[] = [
  { gender: 'male', slug: 'tops', drawable: 245, texture: 0 },
  { gender: 'male', slug: 'hats', drawable: 3, texture: 0 },
  { gender: 'female', slug: 'shoes', drawable: 5, texture: 0 },
  { gender: 'male', slug: 'masks', drawable: 30, texture: 0 },
];

function ReelFrame({ f, priority = false }: { f: Frame; priority?: boolean }) {
  const cat = categoryBySlug(f.slug)!;
  return (
    <figure
      data-ui
      className="relative isolate aspect-video w-full overflow-hidden rounded-lg border border-hairline bg-card"
    >
      <div className="absolute inset-0 -z-10">
        <Landscape />
      </div>
      <img
        src={imageUrl(f.gender, f.slug, f.drawable, f.texture)}
        alt={`${f.gender} ${cat.label} drawable ${f.drawable}, transparent render`}
        width={512}
        height={512}
        loading={priority ? 'eager' : 'lazy'}
        className="absolute inset-0 h-full w-full object-contain p-[7%]"
      />
      <figcaption className="absolute bottom-3 left-3 right-3 truncate rounded-full border border-hairline bg-canvas/85 px-2.5 py-1.5 text-[13px] text-fg">
        <code>{imageUrl(f.gender, f.slug, f.drawable, f.texture)}</code>
      </figcaption>
    </figure>
  );
}

export function HeroReel({ renders }: { renders: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const reel = reelRef.current;
    const frame = frameRef.current;
    if (!section || !reel || !frame) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wide = window.matchMedia('(min-width: 1024px)');
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!wide.matches) {
        reel.style.transform = '';
        return;
      }
      const rect = section.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -rect.top / span)) : 0;
      const pos = p * (HERO_FRAMES.length - 1);
      const h = frame.offsetHeight;
      const stage = reel.closest<HTMLElement>('[data-stage]')!.offsetHeight;
      const step = stage / 2 - 60 + h / 2;
      reel.style.setProperty('--step', `${step}px`);
      reel.style.transform = `translate3d(0, ${-pos * step}px, 0)`;
      setActive(Math.round(pos));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const cur = HERO_FRAMES[active];
  return (
    <section ref={sectionRef} aria-labelledby="hero-title" className="relative lg:h-[210vh] motion-reduce:lg:h-auto">
      <div className="relative isolate overflow-hidden lg:sticky lg:top-[52px] lg:h-[calc(100svh-52px)]">
        <div className="absolute inset-x-2 bottom-2 top-0 -z-10 overflow-hidden rounded-lg border border-hairline sm:inset-x-4 lg:bottom-4">
          <HeroField />
        </div>
        <div className={cn(wrap, 'relative pb-10 pt-10 lg:h-full lg:pb-0 lg:pt-0')}>
          <h1
            id="hero-title"
            className="text-step-4 text-fg-strong lg:grid lg:h-full lg:grid-cols-[1fr_min(48vw,720px)_1fr] lg:content-start lg:pt-[calc(50svh-26px-min(13.5vw,202.5px)-48px)] lg:text-[clamp(30px,2.9vw,48px)]"
          >
            <span className="block lg:col-start-1 lg:row-start-1">Every garment,</span>
            <span className="mt-6 block text-right lg:col-start-3 lg:row-start-1 lg:mt-0">one URL away.</span>
          </h1>
          <div className="mt-6 lg:hidden">
            <ReelFrame f={HERO_FRAMES[0]} priority />
          </div>

          <div data-stage className="absolute inset-y-0 left-1/2 hidden w-[min(48vw,720px)] -translate-x-1/2 lg:block">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
              <div ref={reelRef} className="relative will-change-transform">
                {HERO_FRAMES.map((f, i) => (
                  <div
                    key={f.slug}
                    ref={i === 0 ? frameRef : undefined}
                    className="absolute inset-x-0 top-0"
                    style={{ transform: `translateY(calc(${i} * var(--step, 100vh) - 50%))` }}
                  >
                    <ReelFrame f={f} priority />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 max-w-md lg:absolute lg:bottom-8 lg:left-8 lg:mt-0 lg:max-w-[calc((100%-64px-min(48vw,720px))/2-24px)]">
            <p className="text-step-2 text-fg">
              {renders.toLocaleString()} see-through pictures of GTA&nbsp;V ped clothing, each at an address you can use
              anywhere.
            </p>
            <a
              href="/browse"
              className="press mt-6 inline-flex h-9 items-center rounded-full bg-primary px-4 text-[14px] font-medium text-primary-ink hover:bg-primary/85"
            >
              Browse the directory
            </a>
          </div>
          <p
            aria-live="polite"
            className="hidden text-right text-body-sm text-fg-2 lg:absolute lg:bottom-8 lg:right-8 lg:block"
          >
            {cur.gender === 'male' ? 'Male' : 'Female'} {categoryBySlug(cur.slug)!.label.toLowerCase()}, drawable{' '}
            {cur.drawable}
          </p>
        </div>
      </div>
    </section>
  );
}
