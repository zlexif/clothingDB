import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  CDN_BASE,
  categoryBySlug,
  imageUrl,
  itemsWithPictures,
  type Manifest,
  renderCount,
} from './clothing';

describe('imageUrl', () => {
  it('builds a garment address by default', () => {
    expect(imageUrl('male', 'tops', 245, 0)).toBe(`${CDN_BASE}/garment/male/tops/245/0.webp`);
  });

  it('builds a worn address for the ped variant', () => {
    expect(imageUrl('female', 'shoes', 12, 3, 'ped')).toBe(`${CDN_BASE}/ped/female/shoes/12/3.webp`);
  });

  it('defaults the colour to 0', () => {
    expect(imageUrl('male', 'hats', 3)).toBe(`${CDN_BASE}/garment/male/hats/3/0.webp`);
  });

  it('has no trailing slash on the base', () => {
    expect(CDN_BASE.endsWith('/')).toBe(false);
  });
});

describe('itemsWithPictures', () => {
  it('skips items with no colours', () => {
    expect(itemsWithPictures([3, 0, 1, 0, 2])).toEqual([0, 2, 4]);
  });

  it('returns nothing for an empty slot', () => {
    expect(itemsWithPictures([])).toEqual([]);
  });
});

describe('categories', () => {
  it('has 28 slots with unique address names', () => {
    expect(CATEGORIES).toHaveLength(28);
    expect(new Set(CATEGORIES.map((c) => c.slug)).size).toBe(CATEGORIES.length);
  });

  it('keeps slot ids unique within each kind', () => {
    for (const type of ['component', 'prop', 'overlay'] as const) {
      const ids = CATEGORIES.filter((c) => c.type === type).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('finds a slot by its address name', () => {
    expect(categoryBySlug('tops')?.label).toBe('Tops / Jackets');
    expect(categoryBySlug('nope')).toBeUndefined();
  });
});

describe('renderCount', () => {
  const manifest: Manifest = {
    version: 'test',
    gameBuild: 1,
    generatedAt: '',
    genders: {
      male: { tops: { type: 'component', id: 11, drawables: [2, 0, 3] } },
      female: { hats: { type: 'prop', id: 0, drawables: [4] } },
    },
  };

  it('adds up every colour of every item', () => {
    expect(renderCount(manifest)).toBe(9);
  });

  it('can count one gender', () => {
    expect(renderCount(manifest, ['male'])).toBe(5);
  });
});
