import '../styles.css';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
