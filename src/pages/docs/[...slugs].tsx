import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { PageProps } from 'waku/router';
import { unstable_notFound } from 'waku/router/server';
import { getMDXComponents } from '../../components/docs/mdx';
import { source } from '../../lib/source';

export default function Page({ slugs }: PageProps<'/docs/[...slugs]'>) {
  const page = source.getPage(slugs);
  if (!page) unstable_notFound();

  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc}>
      <title>{`${page.data.title} | clothingDB docs`}</title>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export async function getConfig() {
  const pages = source.generateParams().map((item) => item.slug);
  return {
    render: 'static' as const,
    staticPaths: pages,
  } as const;
}
