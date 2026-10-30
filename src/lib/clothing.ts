export const CDN_BASE = (import.meta.env?.WAKU_PUBLIC_CDN_BASE ?? 'https://cdn.auradevelopment.xyz/clothingdb').replace(
  /\/+$/,
  '',
);

export type PictureVariant = 'garment' | 'ped';

export type Gender = 'male' | 'female';
export type ItemType = 'component' | 'prop' | 'overlay';

export interface CategoryDef {
  slug: string;
  label: string;
  type: ItemType;
  id: number;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'masks', label: 'Masks', type: 'component', id: 1 },
  { slug: 'hair', label: 'Hair', type: 'component', id: 2 },
  { slug: 'torsos', label: 'Torsos', type: 'component', id: 3 },
  { slug: 'legs', label: 'Legs', type: 'component', id: 4 },
  { slug: 'bags', label: 'Bags', type: 'component', id: 5 },
  { slug: 'shoes', label: 'Shoes', type: 'component', id: 6 },
  { slug: 'accessories', label: 'Accessories', type: 'component', id: 7 },
  { slug: 'undershirts', label: 'Undershirts', type: 'component', id: 8 },
  { slug: 'armor', label: 'Armor', type: 'component', id: 9 },
  { slug: 'decals', label: 'Decals', type: 'component', id: 10 },
  { slug: 'tops', label: 'Tops / Jackets', type: 'component', id: 11 },
  { slug: 'hats', label: 'Hats', type: 'prop', id: 0 },
  { slug: 'glasses', label: 'Glasses', type: 'prop', id: 1 },
  { slug: 'ears', label: 'Ears', type: 'prop', id: 2 },
  { slug: 'watches', label: 'Watches', type: 'prop', id: 6 },
  { slug: 'bracelets', label: 'Bracelets', type: 'prop', id: 7 },
  { slug: 'blemishes', label: 'Blemishes', type: 'overlay', id: 0 },
  { slug: 'facial-hair', label: 'Facial Hair', type: 'overlay', id: 1 },
  { slug: 'eyebrows', label: 'Eyebrows', type: 'overlay', id: 2 },
  { slug: 'ageing', label: 'Ageing', type: 'overlay', id: 3 },
  { slug: 'makeup', label: 'Makeup', type: 'overlay', id: 4 },
  { slug: 'blush', label: 'Blush', type: 'overlay', id: 5 },
  { slug: 'complexion', label: 'Complexion', type: 'overlay', id: 6 },
  { slug: 'sun-damage', label: 'Sun Damage', type: 'overlay', id: 7 },
  { slug: 'lipstick', label: 'Lipstick', type: 'overlay', id: 8 },
  { slug: 'moles', label: 'Moles', type: 'overlay', id: 9 },
  { slug: 'chest-hair', label: 'Chest Hair', type: 'overlay', id: 10 },
  { slug: 'body-blemishes', label: 'Body Blemishes', type: 'overlay', id: 11 },
];

export const categoryBySlug = (slug: string): CategoryDef | undefined => CATEGORIES.find((c) => c.slug === slug);

export function imageUrl(
  gender: Gender,
  slug: string,
  drawable: number,
  texture = 0,
  variant: PictureVariant = 'garment',
): string {
  return `${CDN_BASE}/${variant}/${gender}/${slug}/${drawable}/${texture}.webp`;
}

export function itemsWithPictures(colours: readonly number[]): number[] {
  const out: number[] = [];
  colours.forEach((n, d) => {
    if (n > 0) out.push(d);
  });
  return out;
}

export interface ManifestEntry {
  type: ItemType;
  id: number;
  drawables: number[];
}

export type Manifest = {
  version: string;
  gameBuild: number;
  generatedAt: string;
  genders: Record<Gender, Record<string, ManifestEntry>>;
};

export function renderCount(manifest: Manifest, genders: Gender[] = ['male', 'female']): number {
  return genders.reduce(
    (n, g) => n + Object.values(manifest.genders[g]).reduce((a, e) => a + e.drawables.reduce((x, t) => x + t, 0), 0),
    0,
  );
}
