import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const source = fileURLToPath(new URL('.', import.meta.url));
const destination = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(destination, { recursive: true });
for (const directory of ['game', 'screenshots']) {
  cpSync(resolve(source, directory), resolve(destination, directory), { recursive: true });
}

const dossier = buildDossier(destination, {
  game_max_bytes: 48 * 1024 * 1024,
  game_max_files: 993,
  game_path_max_bytes: 1000,
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
});

writeFileSync(resolve(destination, 'dossier.json'), dossier);
