'use client';

import { ArrowRight, Github } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '../../lib/clothing';
import { REPO_URL } from '../../lib/site-data';
import { STATUS_COPY, useServiceStatus } from '../../lib/use-service-status';
import { cn } from '../../lib/utils';
import { LogoMark } from '../ui/logo';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Directory', href: '/browse' },
  { label: 'Creator Lab', href: '/creator' },
  { label: 'Docs', href: '/docs' },
  { label: 'Changelog', href: '/changelog' },
];

function Status() {
  const state = useServiceStatus();
  return (
    <a href="/health" className="inline-flex items-center gap-2 transition-colors hover:text-fg">
      <span className="relative flex h-2 w-2">
        {state === 'ok' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verdant opacity-60" />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', STATUS_COPY[state].dot)} />
      </span>
      {STATUS_COPY[state].label}
    </a>
  );
}

function FindPiece() {
  const [q, setQ] = useState('');
  const [miss, setMiss] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const name = q.trim().toLowerCase();
        const hit =
          CATEGORIES.find((c) => c.slug === name.replace(/\s+/g, '-')) ??
          CATEGORIES.find((c) => c.label.toLowerCase().startsWith(name));
        if (!name || !hit) return setMiss(true);
        window.location.assign(`/browse/${hit.slug}`);
      }}
    >
      <label htmlFor="footer-find" className="text-[13px] font-medium uppercase tracking-[0.06em] text-fg-2">
        Find a piece
      </label>
      <div className="mt-3 flex h-14 items-center rounded-full border border-fg/70 bg-canvas p-1.5 pl-6 transition-colors focus-within:border-fg">
        <input
          id="footer-find"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setMiss(false);
          }}
          autoComplete="off"
          placeholder="TOPS, SHOES, HATS…"
          className="min-w-0 flex-1 bg-transparent text-[17px] font-medium uppercase tracking-[0.02em] text-fg outline-none placeholder:text-fg-2"
        />
        <button
          type="submit"
          className="press group inline-flex h-full shrink-0 items-center gap-2 rounded-full bg-primary px-6 text-[14px] font-semibold uppercase tracking-[0.02em] text-primary-ink hover:bg-primary/85"
        >
          Open
          <ArrowRight size={15} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
      <p className={cn('mt-2 h-5 text-[13px]', miss ? 'text-amber' : 'text-transparent')} aria-live="polite">
        No slot by that name. Try tops, shoes or hats.
      </p>
    </form>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('relative border-t border-hairline bg-card', className)}>
      <div className="mx-auto grid max-w-page gap-14 px-6 pb-20 pt-20 sm:px-10 lg:grid-cols-[1fr_1.35fr] lg:gap-10">
        <div className="flex flex-col justify-between gap-12">
          <a href="/" className="flex items-center gap-5" aria-label="clothingDB home">
            <LogoMark className="h-16 shrink-0 sm:h-20" />
            <span className="whitespace-nowrap text-[clamp(26px,2.8vw,40px)] font-bold uppercase leading-[0.95] tracking-[0.04em] text-fg-strong">
              Clothing DB
              <span className="mt-2 block text-[13px] font-medium normal-case tracking-normal text-fg-2">
                by Aura Development
              </span>
            </span>
          </a>
          <div className="space-y-2 text-[14px] text-fg-2">
            <p>© MMXXVI • Aura Development • Free and open source</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a href="https://opensource.org/license/mit" target="_blank" rel="noreferrer" className="hover:text-fg">
                MIT License
              </a>
              <span aria-hidden="true">•</span>
              <Status />
            </p>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-[auto_1fr_auto]">
          <nav aria-label="Footer">
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-fg-2">Navigation</p>
            <ul className="mt-4 space-y-1.5">
              {NAV.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="group relative inline-block text-[22px] text-fg-strong">
                    {l.label}
                    <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-ember transition-transform duration-300 group-hover:scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-fg-2">Who we are</p>
            <p className="mt-4 max-w-[30ch] text-[20px] leading-relaxed text-fg-strong">
              Aura Development, making FiveM clothing easier to find.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-fg-2">Projects</p>
            <div className="mt-4 flex gap-3">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-canvas px-4 text-[15px] text-fg-strong transition-colors hover:border-fg-3"
              >
                <Github size={17} strokeWidth={1.75} />
                GitHub
              </a>
            </div>
          </div>
          <div className="sm:col-span-3">
            <FindPiece />
          </div>
        </div>
      </div>
    </footer>
  );
}
