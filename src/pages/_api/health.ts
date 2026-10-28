export const GET = async (): Promise<Response> => {
  return Response.json({ ok: true, service: 'clothingDB' });
};

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
