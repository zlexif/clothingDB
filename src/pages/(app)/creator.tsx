import { CreatorLab } from '../../components/studio';

export default async function CreatorPage() {
  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <CreatorLab />
    </div>
  );
}

export const getConfig = async () => {
  return { render: 'dynamic' } as const;
};
