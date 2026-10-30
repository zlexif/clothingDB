import { Sidebar } from '../../components/shell';
import { CATEGORIES, itemsWithPictures } from '../../lib/clothing';
import { DRAWABLE_INDEX } from '../../lib/site-data';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.slug,
      itemsWithPictures(DRAWABLE_INDEX.male[c.slug] ?? []).length +
        itemsWithPictures(DRAWABLE_INDEX.female[c.slug] ?? []).length,
    ]),
  );
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas md:flex-row">
      <Sidebar counts={counts} />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
