const DESCRIPTION =
  'Every GTA clothing picture for male and female, one address each. Free to use and source available, by Aura Development.';

export default async function RootElement({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed inline script, no user input
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        <title>clothingDB by Aura Development — FiveM ped clothing directory</title>
        <meta name="description" content={DESCRIPTION} />
        {import.meta.env.WAKU_PUBLIC_SITE_ENV === 'staging' && <meta name="robots" content="noindex, nofollow" />}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="clothingDB" />
        <meta property="og:title" content="clothingDB by Aura Development" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content={`${import.meta.env.WAKU_PUBLIC_SITE_URL ?? ''}/og.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..800;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
