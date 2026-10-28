import { type Gender, type ItemType, imageUrl } from '../../../lib/clothing';

export type DrawableIndex = Record<Gender, Record<string, number[]>>;

export const wrap = 'mx-auto w-full max-w-page px-4 sm:px-8';

export const KINDS: { type: ItemType; label: string }[] = [
  { type: 'component', label: 'Components' },
  { type: 'prop', label: 'Props' },
  { type: 'overlay', label: 'Overlays' },
];

export const PICKS: Record<string, { gender: Gender; d: number[] }> = {
  masks: { gender: 'male', d: [8, 20, 60, 1, 15, 25] },
  hair: { gender: 'male', d: [15, 20, 50, 3, 25, 60] },
  torsos: { gender: 'male', d: [5, 15, 40, 1, 8, 12] },
  legs: { gender: 'male', d: [1, 15, 50, 3, 12, 40] },
  bags: { gender: 'male', d: [12, 39, 25, 1, 60, 50] },
  shoes: { gender: 'male', d: [12, 25, 1, 40, 60, 5] },
  accessories: { gender: 'male', d: [20, 40, 10, 7, 50, 55] },
  undershirts: { gender: 'male', d: [8, 20, 40, 1, 3, 25] },
  armor: { gender: 'male', d: [15, 20, 1, 5, 12, 60] },
  decals: { gender: 'male', d: [2, 6, 8, 12, 20, 30] },
  tops: { gender: 'male', d: [8, 20, 30, 1, 3, 60] },
  hats: { gender: 'male', d: [3, 30, 40, 1, 20, 12] },
  glasses: { gender: 'male', d: [5, 25, 40, 1, 12, 30] },
  ears: { gender: 'male', d: [3, 12, 30, 1, 5, 20] },
  watches: { gender: 'male', d: [3, 20, 40, 1, 8, 25] },
  bracelets: { gender: 'male', d: [5, 8, 1, 3, 12, 15] },
  'facial-hair': { gender: 'male', d: [3, 10, 12, 5, 8, 15] },
  eyebrows: { gender: 'male', d: [1, 5, 10, 15, 20, 30] },
  makeup: { gender: 'female', d: [20, 30, 70, 8, 12, 15] },
  blush: { gender: 'female', d: [10, 12, 15, 8, 20, 30] },
  lipstick: { gender: 'female', d: [1, 2, 3, 5, 8, 0] },
  'chest-hair': { gender: 'male', d: [2, 12, 1, 3, 5, 8] },
};
export const DEFAULT_PICK = { gender: 'male' as Gender, d: [1, 3, 5, 8, 10, 2] };

export const GROUPS: { type: ItemType; label: string }[] = [
  { type: 'component', label: 'Clothing' },
  { type: 'prop', label: 'Props' },
  { type: 'overlay', label: 'Face and body' },
];

export const POPULAR = ['tops', 'legs', 'shoes', 'hats', 'masks', 'glasses'];

export function slotThumb(slug: string) {
  const pick = PICKS[slug] ?? DEFAULT_PICK;
  return imageUrl(pick.gender, slug, pick.d[0], 0);
}
