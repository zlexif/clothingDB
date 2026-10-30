'use client';

import { CATEGORIES, imageUrl } from '../../../lib/clothing';
import { cn } from '../../../lib/utils';
import { AnatomyField } from '../art';
import { type DrawableIndex, wrap } from './shared';

function Part({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span className="text-fg-strong">{value}</span>
      <span aria-hidden="true" className="mt-2 h-2 w-full rounded-b-[6px] border-x border-b border-ember/70" />
      <span className="mt-1.5 text-[13px] tracking-normal text-fg-2">{label}</span>
    </span>
  );
}

function Mini({ src, alt, on = false }: { src: string; alt: string; on?: boolean }) {
  return (
    <span
      className={cn(
        'transparency-grid block aspect-square overflow-hidden rounded-[10px] border',
        on ? 'border-fg-2' : 'border-transparent',
      )}
    >
      <img src={src} alt={alt} width={96} height={96} loading="lazy" className="h-full w-full object-contain p-1.5" />
    </span>
  );
}

export function AddressAnatomy({ index }: { index: DrawableIndex }) {
  const tops = index.male.tops ?? [];
  const colours = Math.min(6, tops[245] ?? 1);
  const cards: { title: string; body: string; visual: React.ReactNode }[] = [
    {
      title: 'Male or female',
      body: 'Each has its own set of clothes and its own numbers.',
      visual: (
        <div className="grid grid-cols-2 gap-1.5">
          <Mini src={imageUrl('male', 'tops', 0, 0)} alt="A male top" />
          <Mini src={imageUrl('female', 'tops', 0, 0)} alt="A female top" />
        </div>
      ),
    },
    {
      title: 'Slot',
      body: `${CATEGORIES.length} of them, like tops, shoes or hats.`,
      visual: (
        <div className="grid grid-cols-3 gap-1.5">
          <Mini src={imageUrl('male', 'tops', 1, 0)} alt="Tops" on />
          <Mini src={imageUrl('male', 'shoes', 1, 0)} alt="Shoes" />
          <Mini src={imageUrl('male', 'hats', 3, 0)} alt="Hats" />
        </div>
      ),
    },
    {
      title: 'Item',
      body: `The item's number in that slot. Male tops go from 0 to ${Math.max(0, tops.length - 1)}.`,
      visual: (
        <div className="grid grid-cols-3 gap-1.5">
          {[244, 245, 246].map((d) => (
            <Mini key={d} src={imageUrl('male', 'tops', d, 0)} alt={`Top ${d}`} on={d === 245} />
          ))}
        </div>
      ),
    },
    {
      title: 'Colour',
      body: `Which version of the item. Top 245 comes in ${tops[245] ?? 1} colours.`,
      visual: (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: Math.min(3, colours) }, (_, t) => (
            <Mini key={t} src={imageUrl('male', 'tops', 245, t)} alt={`Top 245, colour ${t}`} on={t === 0} />
          ))}
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="anatomy-title" className={cn(wrap, 'mt-40')}>
      <div
        data-reveal
        className="relative isolate overflow-hidden rounded-lg border border-hairline bg-canvas p-6 sm:p-10"
      >
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <AnatomyField />
        </div>
        <h2 id="anatomy-title" className="text-step-4 text-fg-strong">
          Four parts make
          <br />
          every address.
        </h2>

        <p className="mt-10 flex flex-wrap items-start gap-x-1 gap-y-4 text-[clamp(22px,3vw,40px)] font-medium tracking-[-0.02em] text-fg-3">
          <span className="hidden sm:inline">…/garment/</span>
          <Part value="male" label="Ped" />
          <span>/</span>
          <Part value="tops" label="Slot" />
          <span>/</span>
          <Part value="245" label="Item" />
          <span>/</span>
          <Part value="0" label="Colour" />
          <span>.webp</span>
        </p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <li
              key={c.title}
              className="flex flex-col gap-4 rounded-2xl border border-hairline bg-card/90 p-4 backdrop-blur-sm"
            >
              <div>
                <p className="text-[15px] font-medium text-fg">{c.title}</p>
                <p className="mt-1 text-[14px] text-fg-2">{c.body}</p>
              </div>
              <div className="mt-auto">{c.visual}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
