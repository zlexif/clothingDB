'use client';

import { ArrowUpRight, Command, Keyboard, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useRouter } from 'waku';
import { categoryBySlug } from '../../lib/clothing';
import { DISCORD_URL } from '../../lib/site-data';
import { cn } from '../../lib/utils';
import { SidebarField } from '../site/art';
import { slotThumb } from '../site/home/shared';
import { Logo, LogoMark } from '../ui/logo';
import { CommandPalette } from './command-palette';
import { CATEGORY_EVENT, isActive, isTyping, NAV, NAV_ITEMS, type NavItem, pushRecent, readRecent } from './nav';

const COLLAPSED_KEY = 'clothingdb:sidebar-collapsed';
const WIDE = 252;
const RAIL = 72;
const spring = { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 } as const;

interface SidebarProps {
  counts: Record<string, number>;
}

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    } catch {
      setCollapsed(false);
    }
  }, []);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
      } catch {
        return !c;
      }
      return !c;
    });
  }, []);
  return [collapsed, toggle] as const;
}

function useLivePath() {
  const router = useRouter();
  const [path, setPath] = useState(router.path);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(readRecent()), []);
  useEffect(() => {
    setPath(router.path);
    const m = router.path.match(/^\/browse\/([a-z-]+)/);
    if (m && categoryBySlug(m[1])) setRecent(pushRecent(m[1]));
  }, [router.path]);
  useEffect(() => {
    const onCategory = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      setPath(`/browse/${slug}`);
      setRecent(pushRecent(slug));
    };
    window.addEventListener(CATEGORY_EVENT, onCategory);
    return () => window.removeEventListener(CATEGORY_EVENT, onCategory);
  }, []);
  const clear = () => {
    try {
      localStorage.removeItem('clothingdb:recent-categories');
    } catch {
      return setRecent([]);
    }
    setRecent([]);
  };
  return { path, recent, clear };
}

function useIsMac() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);
  return mac;
}

function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[6px] border border-hairline bg-canvas px-1 text-[11px] font-medium text-fg-3',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

function RailTip({ show, label, keys }: { show: boolean; label: string; keys?: string[] }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, x: -6, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-[10px] border border-hairline-strong bg-elevated px-2.5 py-1.5 text-[13px] text-fg shadow-popover"
        >
          {label}
          {keys?.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function NavLink({
  item,
  active,
  collapsed,
  hovered,
  onHover,
  index,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  hovered: boolean;
  onHover: (key: string | null) => void;
  index: number;
  onNavigate?: () => void;
}) {
  const inner = (
    <>
      {hovered && !active && (
        <motion.span
          layoutId="sidebar-hover"
          transition={spring}
          className="absolute inset-0 rounded-[12px] bg-elevated/60"
        />
      )}
      {active && (
        <motion.span
          layoutId="sidebar-active"
          transition={spring}
          className="absolute inset-0 rounded-[12px] bg-elevated"
        >
          <motion.span
            layoutId="sidebar-active-bar"
            transition={spring}
            className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-ember"
          />
        </motion.span>
      )}
      <span
        className={cn(
          'relative flex h-5 w-5 shrink-0 items-center justify-center transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110',
          active ? 'text-ember' : 'text-icon group-hover:text-fg',
        )}
      >
        <item.icon size={17} strokeWidth={1.6} />
      </span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.16 }}
            className="relative flex min-w-0 flex-1 items-center gap-2"
          >
            <span className="truncate">{item.label}</span>
            <span className="flex-1" />
            {item.external ? (
              <ArrowUpRight size={13} className="text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" />
            ) : (
              item.go && (
                <span className="flex gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Kbd>G</Kbd>
                  <Kbd>{item.go.toUpperCase()}</Kbd>
                </span>
              )
            )}
          </motion.span>
        )}
      </AnimatePresence>
      {collapsed && (
        <RailTip show={hovered} label={item.label} keys={item.go ? ['G', item.go.toUpperCase()] : undefined} />
      )}
    </>
  );
  const cls = cn(
    'group relative flex h-10 items-center gap-3 rounded-[12px] px-3 text-[14px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ember/60',
    active ? 'text-fg-strong' : 'text-fg-2 hover:text-fg',
    collapsed && 'justify-center px-0',
  );
  const events = {
    onMouseEnter: () => onHover(item.key),
    onMouseLeave: () => onHover(null),
    onFocus: () => onHover(item.key),
    onBlur: () => onHover(null),
    onClick: onNavigate,
  };
  return (
    <li className="sidebar-enter" style={{ animationDelay: `${50 + index * 35}ms` }}>
      {item.external ? (
        <a
          href={item.href}
          target="_blank"
          rel="noreferrer"
          aria-label={collapsed ? item.label : undefined}
          className={cls}
          {...events}
        >
          {inner}
        </a>
      ) : item.document ? (
        <a href={item.href} aria-label={collapsed ? item.label : undefined} className={cls} {...events}>
          {inner}
        </a>
      ) : (
        <Link
          to={item.href as never}
          aria-current={active ? 'page' : undefined}
          aria-label={collapsed ? item.label : undefined}
          className={cls}
          {...events}
        >
          {inner}
        </Link>
      )}
    </li>
  );
}

function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.26a18.3 18.3 0 0 0-5.49 0 12.6 12.6 0 0 0-.62-1.26.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.09-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.09-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42Z" />
    </svg>
  );
}

function CommunityCard({ collapsed }: { collapsed: boolean }) {
  const [hover, setHover] = useState(false);
  if (collapsed)
    return (
      <a
        href={DISCORD_URL}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label="Join the Aura Development Discord"
        className="group relative mx-auto flex h-10 w-10 items-center justify-center rounded-[12px] text-[#8b93ff] transition-colors hover:bg-elevated/60"
      >
        <DiscordMark className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
        <RailTip show={hover} label="Join our Discord" />
      </a>
    );
  return (
    <div
      className="sidebar-enter relative isolate overflow-hidden rounded-[16px] border border-hairline bg-canvas"
      style={{ animationDelay: '260ms' }}
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-80">
        <SidebarField />
      </div>
      <div className="bg-gradient-to-t from-canvas via-canvas/90 to-canvas/40 p-3.5">
        <p className="text-[13px] font-medium text-fg-strong">Made for the community</p>
        <p className="mt-1 text-[12px] leading-relaxed text-fg-2">
          Thanks for using clothingDB. Come hang out with Aura Development, share what you build and help shape what
          comes next.
        </p>
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
          className="group mt-3 flex h-9 items-center justify-center gap-2 rounded-full bg-[#5865f2] text-[13px] font-medium text-white transition-colors hover:bg-[#4752c4]"
        >
          <DiscordMark className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
          Join our Discord
        </a>
      </div>
    </div>
  );
}

const SHORTCUTS: [string[], string][] = [
  [['Ctrl', 'K'], 'Search everything'],
  [['Ctrl', 'B'], 'Collapse or expand the sidebar'],
  [['G', 'D'], 'Go to the Directory'],
  [['G', 'C'], 'Go to the Creator Lab'],
  [['G', 'O'], 'Go to the Docs'],
  [['G', 'L'], 'Go to the Changelog'],
  [['G', 'H'], 'Go home'],
  [['?'], 'Show these shortcuts'],
];

function ShortcutsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close shortcuts"
            className="fixed inset-0 z-[90] cursor-default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={spring}
            className="fixed bottom-4 left-4 z-[95] w-[300px] rounded-[18px] border border-hairline-strong bg-card p-3 shadow-modal"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-[13px] font-medium text-fg">Keyboard shortcuts</p>
              <button
                type="button"
                aria-label="Close shortcuts"
                onClick={onClose}
                className="rounded-full p-1 text-fg-3 hover:text-fg"
              >
                <X size={14} />
              </button>
            </div>
            <ul className="space-y-1">
              {SHORTCUTS.map(([keys, label], i) => (
                <motion.li
                  key={label}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-1.5 text-[13px] text-fg-2"
                >
                  {label}
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GoHint({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
          transition={spring}
          className="fixed bottom-5 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-3 rounded-full border border-hairline-strong bg-card/95 px-4 py-2 text-[13px] text-fg-2 shadow-modal backdrop-blur"
        >
          <Kbd className="border-ember/60 text-ember">G</Kbd>
          <span>then</span>
          {NAV_ITEMS.filter((n) => n.go).map((n) => (
            <span key={n.key} className="flex items-center gap-1">
              <Kbd>{n.go!.toUpperCase()}</Kbd>
              <span className="text-fg">{n.label}</span>
            </span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SidebarBody({
  collapsed,
  path,
  recent,
  onClearRecent,
  onSearch,
  onShortcuts,
  onToggle,
  onNavigate,
  mobile = false,
}: {
  collapsed: boolean;
  path: string;
  recent: string[];
  onClearRecent: () => void;
  onSearch: () => void;
  onShortcuts: () => void;
  onToggle?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [searchHover, setSearchHover] = useState(false);
  const mac = useIsMac();
  let index = 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex h-[60px] shrink-0 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <Link to="/" aria-label="clothingDB home" className="flex min-w-0 items-center" onClick={onNavigate}>
          {collapsed ? <LogoMark className="h-6" /> : <Logo />}
        </Link>
        {!collapsed && <span className="flex-1" />}
        {onToggle && !collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse the sidebar"
            title="Collapse (Ctrl B)"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] text-icon transition-colors hover:bg-elevated hover:text-fg"
          >
            <PanelLeftClose size={16} strokeWidth={1.6} />
          </button>
        )}
      </div>

      <div className={cn('px-3', collapsed && 'px-0')}>
        <button
          type="button"
          onClick={onSearch}
          onMouseEnter={() => setSearchHover(true)}
          onMouseLeave={() => setSearchHover(false)}
          aria-label="Search"
          className={cn(
            'group relative flex h-10 w-full items-center gap-2.5 rounded-[12px] border border-hairline bg-canvas px-3 text-[14px] text-fg-3 transition-colors hover:border-hairline-strong hover:text-fg-2',
            collapsed && 'mx-auto w-10 justify-center px-0',
          )}
        >
          <Search
            size={16}
            strokeWidth={1.6}
            className="shrink-0 transition-transform duration-300 group-hover:scale-110"
          />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search</span>
              <span className="flex gap-0.5">
                <Kbd>{mac ? <Command size={10} /> : 'Ctrl'}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </>
          )}
          {collapsed && <RailTip show={searchHover} label="Search" keys={['Ctrl', 'K']} />}
        </button>
      </div>

      <nav
        aria-label="Main"
        className={cn('mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3', collapsed && 'overflow-visible px-2')}
      >
        <LayoutGroup id={mobile ? 'sidebar-mobile' : 'sidebar'}>
          {NAV.map((group, gi) => (
            <div key={group.label} className={cn(gi > 0 && 'mt-5')}>
              <AnimatePresence initial={false} mode="popLayout">
                {collapsed ? (
                  gi > 0 && (
                    <motion.div
                      key="rule"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mx-auto mb-3 h-px w-6 bg-hairline"
                    />
                  )
                ) : (
                  <motion.p
                    key="label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.1em] text-fg-3"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.key}
                    item={item}
                    active={isActive(item, path)}
                    collapsed={collapsed}
                    hovered={hovered === item.key}
                    onHover={setHovered}
                    index={index++}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>
          ))}

          <AnimatePresence initial={false}>
            {recent.length > 0 && (
              <motion.div
                key="recent"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5"
              >
                {collapsed ? (
                  <div className="mx-auto mb-3 h-px w-6 bg-hairline" />
                ) : (
                  <div className="mb-1.5 flex items-center justify-between px-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-3">Recently opened</p>
                    <button
                      type="button"
                      onClick={onClearRecent}
                      className="text-[11px] text-fg-3 transition-colors hover:text-fg"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <ul className={cn('space-y-0.5', collapsed && 'flex flex-col items-center gap-1 space-y-0')}>
                  <AnimatePresence initial={false}>
                    {recent.map((slug) => {
                      const cat = categoryBySlug(slug);
                      if (!cat) return null;
                      const on = path === `/browse/${slug}`;
                      return (
                        <motion.li
                          key={slug}
                          layout
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={spring}
                        >
                          <Link
                            to={`/browse/${slug}` as never}
                            onClick={onNavigate}
                            onMouseEnter={() => setHovered(`recent:${slug}`)}
                            onMouseLeave={() => setHovered(null)}
                            aria-label={collapsed ? cat.label : undefined}
                            className={cn(
                              'group relative flex h-9 items-center gap-3 rounded-[12px] px-2 text-[13px] transition-colors',
                              on ? 'text-fg' : 'text-fg-2 hover:text-fg',
                              collapsed && 'h-10 w-10 justify-center px-0',
                            )}
                          >
                            {hovered === `recent:${slug}` && (
                              <motion.span
                                layoutId="sidebar-hover"
                                transition={spring}
                                className="absolute inset-0 rounded-[12px] bg-elevated/60"
                              />
                            )}
                            <span
                              className={cn(
                                'transparency-grid relative h-7 w-7 shrink-0 overflow-hidden rounded-[8px] border transition-transform duration-300 group-hover:scale-105',
                                on ? 'border-ember/60' : 'border-hairline',
                              )}
                            >
                              <img
                                src={slotThumb(slug)}
                                alt=""
                                width={28}
                                height={28}
                                loading="lazy"
                                className="h-full w-full object-contain"
                              />
                            </span>
                            {!collapsed && <span className="relative truncate">{cat.label}</span>}
                            {collapsed && <RailTip show={hovered === `recent:${slug}`} label={cat.label} />}
                          </Link>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </nav>

      <div className={cn('shrink-0 space-y-2 border-t border-hairline p-3', collapsed && 'px-2')}>
        <CommunityCard collapsed={collapsed} />
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          <button
            type="button"
            onClick={onShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className={cn(
              'flex h-9 items-center gap-2 rounded-[10px] px-2.5 text-[12px] text-fg-3 transition-colors hover:bg-elevated hover:text-fg',
              collapsed && 'w-10 justify-center px-0',
            )}
          >
            <Keyboard size={15} strokeWidth={1.6} />
            {!collapsed && 'Shortcuts'}
          </button>
          {!collapsed && <span className="flex-1" />}
          {onToggle && collapsed && (
            <button
              type="button"
              onClick={onToggle}
              aria-label="Expand the sidebar"
              title="Expand (Ctrl B)"
              className="flex h-9 w-10 items-center justify-center rounded-[10px] text-icon transition-colors hover:bg-elevated hover:text-fg"
            >
              <PanelLeftOpen size={16} strokeWidth={1.6} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ counts }: SidebarProps) {
  const router = useRouter();
  const [collapsed, toggle] = useCollapsed();
  const { path, recent, clear } = useLivePath();
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [goPending, setGoPending] = useState(false);
  const goTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const navigate = useCallback(
    (item: Pick<NavItem, 'href' | 'external' | 'document'>) => {
      setDrawer(false);
      if (item.external) window.open(item.href, '_blank', 'noreferrer');
      else if (item.document) window.location.assign(item.href);
      else void router.push(item.href as never);
    },
    [router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
        return;
      }
      if (mod || e.altKey || isTyping(e)) return;
      if (goPending) {
        const target = NAV_ITEMS.find((n) => n.go === e.key.toLowerCase());
        clearTimeout(goTimer.current);
        setGoPending(false);
        if (target) {
          e.preventDefault();
          navigate(target);
        }
        return;
      }
      if (e.key === 'g') {
        setGoPending(true);
        goTimer.current = setTimeout(() => setGoPending(false), 1400);
      } else if (e.key === '?') {
        setShortcuts((s) => !s);
      } else if (e.key === 'Escape') {
        setShortcuts(false);
        setDrawer(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPending, navigate, toggle]);

  useEffect(() => () => clearTimeout(goTimer.current), []);

  const body = (mobile: boolean) => (
    <SidebarBody
      collapsed={!mobile && collapsed}
      path={path}
      recent={recent}
      onClearRecent={clear}
      onSearch={() => setPalette(true)}
      onShortcuts={() => setShortcuts((s) => !s)}
      onToggle={mobile ? undefined : toggle}
      onNavigate={mobile ? () => setDrawer(false) : undefined}
      mobile={mobile}
    />
  );

  return (
    <>
      <header className="flex h-[56px] shrink-0 items-center gap-2 border-b border-hairline bg-card px-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open the menu"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-fg-2 hover:bg-elevated hover:text-fg"
        >
          <Menu size={18} strokeWidth={1.6} />
        </button>
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setPalette(true)}
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-fg-2 hover:bg-elevated hover:text-fg"
        >
          <Search size={17} strokeWidth={1.6} />
        </button>
      </header>

      <AnimatePresence>
        {drawer && (
          <motion.div
            key="drawer"
            className="fixed inset-0 z-[80] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close the menu"
              onClick={() => setDrawer(false)}
              className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={spring}
              drag="x"
              dragConstraints={{ left: -320, right: 0 }}
              dragElastic={{ left: 0.2, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80 || info.velocity.x < -400) setDrawer(false);
              }}
              className="absolute inset-y-0 left-0 w-[86vw] max-w-[320px] border-r border-hairline bg-card shadow-modal"
            >
              {body(true)}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? RAIL : WIDE }}
        transition={spring}
        className="relative z-30 hidden shrink-0 border-r border-hairline bg-card md:block"
      >
        {body(false)}
      </motion.aside>

      <CommandPalette
        open={palette}
        onClose={() => setPalette(false)}
        counts={counts}
        collapsed={collapsed}
        onNavigate={navigate}
        onToggleSidebar={toggle}
      />
      <ShortcutsPanel open={shortcuts} onClose={() => setShortcuts(false)} />
      <GoHint show={goPending} />
    </>
  );
}
