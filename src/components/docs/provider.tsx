'use client';

import { RootProvider } from 'fumadocs-ui/provider/waku';
import type { ReactNode } from 'react';

export function DocsProvider({ children }: { children: ReactNode }) {
  return <RootProvider theme={{ enabled: false }}>{children}</RootProvider>;
}
