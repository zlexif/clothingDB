import { Homepage } from '../components/site';

export default async function HomePage() {
  return <Homepage />;
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
