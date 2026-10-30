'use client';

import { ArrowRight, Github, Globe } from 'lucide-react';
import { useState } from 'react';
import { CATEGORIES } from '../../lib/clothing';
import { AGENCY_URL, PROJECTS_URL, REPO_URL, STORE_URL } from '../../lib/site-data';
import { STATUS_COPY, useServiceStatus } from '../../lib/use-service-status';
import { cn } from '../../lib/utils';
import { LogoMark } from '../ui/logo';

function TebexMark({ size = 17 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 21.25 50"
      height={size * 1.3}
      width={(size * 1.3 * 21.25) / 50}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M11.9031 12.7052C13.8816 9.5737 17.4647 8.66646 17.4647 8.66646C17.4647 8.66646 10.6263 6.93188 10.6263 0C10.6263 6.93188 3.78397 8.66646 3.78397 8.66646C3.78397 8.66646 7.36838 9.5737 9.34826 12.7052H0V24.7107L2.12526 20.9928H6.37447V41.7124L14.8742 50V24.6308C12.7066 23.6565 9.59277 21.1797 8.47727 19.2904C10.3818 19.851 12.9366 20.5882 14.9258 20.9941H21.25V12.7052H11.9031Z" />
    </svg>
  );
}

const PROJECT_LINKS = [
  { href: PROJECTS_URL, label: 'GitHub', icon: Github },
  { href: STORE_URL, label: 'Tebex store', icon: TebexMark },
  { href: AGENCY_URL, label: 'Web agency', icon: Globe },
];

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
      <div className="mx-auto grid max-w-page gap-16 px-6 pb-24 pt-24 sm:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-x-20">
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
            <p>© {new Date().getFullYear()} • Aura Development • Free to use, source available</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="hover:text-fg">
                MIT + Commons Clause
              </a>
              <span aria-hidden="true">•</span>
              <Status />
            </p>
          </div>
        </div>

        <div className="grid gap-x-16 gap-y-14 sm:grid-cols-2 xl:grid-cols-[auto_minmax(16rem,1fr)_auto]">
          <nav aria-label="Footer">
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-fg-2">Navigation</p>
            <ul className="mt-5 space-y-3">
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
            <p className="mt-5 max-w-[24ch] text-[20px] leading-relaxed text-fg-strong">
              Aura Development, making FiveM clothing easier to find.
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.06em] text-fg-2">Projects</p>
            <div className="mt-5 flex flex-col items-start gap-3">
              {PROJECT_LINKS.map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-canvas px-4 text-[15px] text-fg-strong transition-colors hover:border-fg-3"
                >
                  <Icon size={17} strokeWidth={1.75} />
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <FindPiece />
          </div>
        </div>
      </div>
    </footer>
  );
}
