import { Github, Menu } from 'lucide-react';
import { Link } from 'waku';
import { REPO_URL } from '../../lib/site-data';
import { buttonVariants } from '../ui/button';
import { Logo } from '../ui/logo';

const LINKS = [
  { to: '/browse', label: 'Directory' },
  { to: '/creator', label: 'Creator Lab' },
  { to: '/docs', label: 'Docs' },
  { to: '/changelog', label: 'Changelog' },
] as const;

export function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <Logo credit />
    </Link>
  );
}

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 bg-canvas">
      <div className="mx-auto grid h-[52px] max-w-page grid-cols-[1fr_auto] items-center px-6 md:grid-cols-[1fr_auto_1fr]">
        <Wordmark />
        <nav className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex h-9 items-center rounded-full px-4 text-[15px] font-medium text-fg-2 transition-colors hover:bg-elevated hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'hidden gap-1.5 lg:inline-flex' })}
          >
            <Github size={15} strokeWidth={1.5} />
            GitHub
          </a>
          <Link to="/browse" className={buttonVariants({ size: 'sm', className: 'hidden sm:inline-flex' })}>
            Browse directory
          </Link>
          <details className="group relative md:hidden">
            <summary
              aria-label="Menu"
              className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full border border-hairline text-fg-2 [&::-webkit-details-marker]:hidden"
            >
              <Menu size={15} strokeWidth={1.5} />
            </summary>
            <div
              data-ui
              className="absolute right-0 top-10 w-56 rounded-lg border border-hairline bg-card p-1.5 shadow-modal"
            >
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="block rounded-full px-3 py-2 text-[15px] font-medium text-fg-2 hover:bg-elevated hover:text-fg"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full px-3 py-2 text-[15px] font-medium text-fg-2 hover:bg-elevated hover:text-fg"
              >
                <Github size={15} strokeWidth={1.5} />
                GitHub
              </a>
              <Link to="/browse" className={buttonVariants({ size: 'sm', className: 'mt-1.5 w-full' })}>
                Browse directory
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
