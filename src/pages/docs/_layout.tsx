import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '../../components/docs/layout-options';
import { DocsProvider } from '../../components/docs/provider';
import { source } from '../../lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      <DocsLayout {...baseOptions()} tree={source.getPageTree()}>
        {children}
      </DocsLayout>
    </DocsProvider>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
