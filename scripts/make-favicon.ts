import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LOGO_PIXELS } from '../src/components/ui/logo';

const OUT = fileURLToPath(new URL('../public/favicon.svg', import.meta.url));

const rects = LOGO_PIXELS.map(([x, y, c]) => `<rect x="${x}" y="${y + 1}" width="1" height="1" fill="${c}"/>`).join('');
await writeFile(
  OUT,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects}</svg>\n`,
);
console.log(`favicon.svg: ${LOGO_PIXELS.length} pixels`);
