import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { ArrowLeft, Camera, Github, History, LayoutGrid } from 'lucide-react';
import { REPO_URL } from '../../lib/site-data';
import { Logo } from '../ui/logo';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <Logo credit />,
      url: '/',
    },
    themeSwitch: { enabled: false },
    links: [
      { text: 'Back to the site', url: '/', icon: <ArrowLeft /> },
      { text: 'Directory', url: '/browse', icon: <LayoutGrid /> },
      { text: 'Creator Lab', url: '/creator', icon: <Camera /> },
      { text: 'Changelog', url: '/changelog', icon: <History /> },
      { text: 'GitHub', url: REPO_URL, icon: <Github />, external: true },
    ],
  };
}
