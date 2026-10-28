import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './clothing';
import { CHANGELOG, DRAWABLE_INDEX, manifest, STATS } from './site-data';

describe('manifest', () => {
  it('covers every slot for both male and female', () => {
    for (const gender of ['male', 'female'] as const) {
      for (const c of CATEGORIES) expect(manifest.genders[gender][c.slug], `${gender}/${c.slug}`).toBeDefined();
    }
  });

  it('matches each entry to its slot kind and id', () => {
    for (const c of CATEGORIES) {
      const entry = manifest.genders.male[c.slug];
      expect(entry?.type).toBe(c.type);
      expect(entry?.id).toBe(c.id);
    }
  });

  it('has top 245 for male with ten colours', () => {
    expect(DRAWABLE_INDEX.male.tops?.[245]).toBe(10);
  });
});

describe('stats', () => {
  it('counts pictures for male and female', () => {
    expect(STATS.renders).toBeGreaterThan(0);
    expect(STATS.categories).toBe(CATEGORIES.length);
  });
});

describe('changelog', () => {
  it('gives every entry a unique id and at least one change', () => {
    expect(new Set(CHANGELOG.map((e) => e.id)).size).toBe(CHANGELOG.length);
    for (const e of CHANGELOG) expect(e.changes.length, e.id).toBeGreaterThan(0);
  });
});
