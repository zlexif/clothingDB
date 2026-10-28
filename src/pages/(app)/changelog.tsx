import { ChangelogView } from '../../components/changelog/changelog-view';
import { CHANGELOG } from '../../lib/site-data';

export default async function ChangelogPage() {
  return <ChangelogView entries={CHANGELOG} />;
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
