import type { Gender } from '../clothing';

export const COMPONENT_SLOTS: Record<string, string> = {
  berd: 'masks',
  hair: 'hair',
  uppr: 'torsos',
  lowr: 'legs',
  hand: 'bags',
  feet: 'shoes',
  teef: 'accessories',
  accs: 'undershirts',
  task: 'armor',
  decl: 'decals',
  jbib: 'tops',
};

export interface ClothingFileName {
  stem: string;
  gender: Gender | null;
  component: string | null;
  slot: string | null;
  item: number | null;
  colour: number | null;
  prop: boolean;
}

export function parseClothingName(fileName: string): ClothingFileName {
  const lower = fileName.toLowerCase();
  const stem = lower.replace(/\.[a-z0-9]+$/, '');
  const base = stem.includes('^') ? stem.slice(stem.lastIndexOf('^') + 1) : stem;

  let gender: Gender | null = null;
  if (/mp_f_freemode_01|(^|[^a-z])female([^a-z]|$)/.test(lower)) gender = 'female';
  else if (/mp_m_freemode_01|(^|[^a-z])male([^a-z]|$)/.test(lower)) gender = 'male';

  const prop = /^p_[a-z]+_/.test(base);
  const texture = base.match(/^([a-z]{4})_diff_(\d{3})_([a-z])(?:_|$)/);
  const model = base.match(/^([a-z]{4})_(\d{3})(?:_|$)/);
  const match = texture ?? model;
  const component = match && match[1] in COMPONENT_SLOTS ? match[1] : null;

  return {
    stem: base,
    gender,
    component,
    slot: component ? COMPONENT_SLOTS[component] : null,
    item: match ? Number(match[2]) : null,
    colour: texture ? texture[3].charCodeAt(0) - 97 : null,
    prop,
  };
}
