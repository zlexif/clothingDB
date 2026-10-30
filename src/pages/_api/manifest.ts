import manifestData from '../../lib/manifest-data.json';

export const GET = async (): Promise<Response> => {
  return Response.json(manifestData, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
