import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = normalize(process.argv[2] ?? join(process.env.USERPROFILE ?? '.', 'clothingdb-peds'));
const port = Number(process.argv[3] ?? 3100);
const TYPES: Record<string, string> = {
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.json': 'application/json',
};

createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  const target = join(root, normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)));
  if (!target.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const s = await stat(target);
    if (!s.isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'content-type': TYPES[extname(target)] ?? 'application/octet-stream',
      'content-length': s.size,
      'cache-control': 'public, max-age=3600',
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
}).listen(port, () => console.log(`peds: serving ${root} on http://localhost:${port}`));
