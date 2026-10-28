import { RenderHarness } from '../components/studio/render-harness';

export default async function RenderPage() {
  return (
    <>
      <meta name="robots" content="noindex" />
      <RenderHarness />
    </>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
