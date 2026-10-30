import type { PageProps } from 'waku/router';
import { DirectoryApp } from '../../../components/directory';
import { categoryBySlug, type Manifest } from '../../../lib/clothing';
import manifestData from '../../../lib/manifest-data.json';

export default async function BrowseCategoryPage({ category }: PageProps<'/browse/[category]'>) {
  const cat = categoryBySlug(category);
  if (!cat) {
    return (
      <div className="p-8">
        <p className="text-body-sm text-fg-2">Unknown category: {category}</p>
      </div>
    );
  }
  return (
    <DirectoryApp
      manifest={(manifestData as Manifest | null) ?? null}
      initialGender="male"
      initialCategory={category}
    />
  );
}

export const getConfig = async () => {
  const m = manifestData as Manifest;
  const slugs = Object.keys(m.genders?.male ?? { tops: 1 });
  return { render: 'static', staticPaths: slugs } as const;
};
