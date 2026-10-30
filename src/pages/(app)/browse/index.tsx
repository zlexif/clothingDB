import { DirectoryApp } from '../../../components/directory';
import type { Manifest } from '../../../lib/clothing';
import manifestData from '../../../lib/manifest-data.json';

export default async function BrowseIndexPage() {
  return (
    <DirectoryApp manifest={(manifestData as Manifest | null) ?? null} initialGender="male" initialCategory="tops" />
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
