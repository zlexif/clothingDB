import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '../../../lib/source';

export const { GET } = createFromSource(source);

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
