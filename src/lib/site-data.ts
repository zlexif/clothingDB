import { CATEGORIES, type Manifest, renderCount } from './clothing';
import manifestData from './manifest-data.json';

export const manifest = manifestData as Manifest;

export const STATS = {
  renders: renderCount(manifest),
  categories: CATEGORIES.length,
  genders: 2,
};

export const DRAWABLE_INDEX = Object.fromEntries(
  (['male', 'female'] as const).map((g) => [
    g,
    Object.fromEntries(Object.entries(manifest.genders[g]).map(([slug, e]) => [slug, e.drawables])),
  ]),
) as Record<'male' | 'female', Record<string, number[]>>;

export const REPO_URL = 'https://github.com/zlexif/clothingDB';

export const PROJECTS_URL = 'https://github.com/zlexif?tab=repositories';

export const STORE_URL = 'https://store.auradevelopment.xyz';

export const AGENCY_URL = 'https://auradevelopment.xyz';

export const DISCORD_URL = 'https://discord.gg/zvR4ACaJvR';

export type ChangeKind = 'new' | 'improved' | 'fixed';
export type ChangeArea = 'Directory' | 'Creator Lab' | 'Pictures' | 'Site';

export interface ChangelogEntry {
  id: string;
  when: string;
  planned?: boolean;
  version?: string;
  areas: ChangeArea[];
  title: string;
  summary: string;
  changes: { kind: ChangeKind; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 'release',
    when: 'Oct 30, 2026',
    version: '1.0.0',
    areas: ['Site', 'Directory', 'Creator Lab', 'Pictures'],
    title: 'clothingDB is live',
    summary: `The first release: ${STATS.renders.toLocaleString()} pictures of ped clothing, a Directory to find them and a Creator Lab to take your own.`,
    changes: [
      {
        kind: 'new',
        text: `A picture of every item and colour across ${STATS.categories} slots, for the male and female ped, from game build ${manifest.gameBuild}.`,
      },
      {
        kind: 'new',
        text: 'Every picture at an address that never changes, ready to use in game UIs, websites or anywhere else.',
      },
      { kind: 'new', text: 'The Directory: browse every category, find items by number and see all of their colours.' },
      {
        kind: 'new',
        text: 'Creator Lab: dress the real ped in your browser and save see-through pictures, with or without the body.',
      },
      { kind: 'new', text: 'Photograph a whole range of items in every colour and get one ZIP back.' },
      { kind: 'new', text: 'Docs covering picture addresses, every slot and every part of the Creator Lab.' },
    ],
  },
];
