import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import type { UserConfig } from 'vite';
import { type Config, defineConfig } from 'waku/config';

export default defineConfig({
  ...(process.env.WAKU_DIST_DIR ? { distDir: process.env.WAKU_DIST_DIR } : {}),
  vite: {
    plugins: [tailwindcss(), fumadocsMdx()],
    resolve: {
      tsconfigPaths: true,
      alias: [
        {
          find: /^fflate$/,
          replacement: fileURLToPath(new URL('./node_modules/fflate/esm/browser.js', import.meta.url)),
        },
      ],
    },
  } satisfies UserConfig as Config['vite'],
});
