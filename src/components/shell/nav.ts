import { BookOpen, Camera, Github, History, Home, LayoutGrid, type LucideIcon } from 'lucide-react';
import { REPO_URL } from '../../lib/site-data';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  go?: string;
  hint?: string;
  external?: boolean;
  document?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: 'Explore',
    items: [
      {
        key: 'directory',
        label: 'Directory',
        href: '/browse',
        icon: LayoutGrid,
        go: 'd',
        hint: 'Every item, every colour',
      },
      {
        key: 'creator',
        label: 'Creator Lab',
        href: '/creator',
        icon: Camera,
        go: 'c',
        hint: 'Dress the ped, take pictures',
      },
    ],
  },
  {
    label: 'Learn',
    items: [
      {
        key: 'docs',
        label: 'Docs',
        href: '/docs',
        icon: BookOpen,
        go: 'o',
        hint: 'Addresses, slots, hosting',
        document: true,
      },
      { key: 'changelog', label: 'Changelog', href: '/changelog', icon: History, go: 'l', hint: 'What changed' },
    ],
  },
  {
    label: 'Project',
    items: [
      { key: 'home', label: 'Home', href: '/', icon: Home, go: 'h', hint: 'The homepage' },
      { key: 'github', label: 'GitHub', href: REPO_URL, icon: Github, hint: 'Source code', external: true },
    ],
  },
];

export const NAV_ITEMS = NAV.flatMap((g) => g.items);

export const isActive = (item: NavItem, path: string) =>
  !item.external && (item.href === '/' ? path === '/' : path === item.href || path.startsWith(`${item.href}/`));

export const CATEGORY_EVENT = 'clothingdb:category';

const RECENT_KEY = 'clothingdb:recent-categories';
const RECENT_MAX = 5;

export function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(slug: string): string[] {
  const next = [slug, ...readRecent().filter((s) => s !== slug)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}

export const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));
};
