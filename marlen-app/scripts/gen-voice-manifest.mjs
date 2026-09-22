import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const clips = JSON.parse(readFileSync(join(root, 'lib/voice-clips.json'), 'utf8'));
const urls = clips.map(c => `/voice/${c.id}.mp3`);
writeFileSync(join(root, 'public/voice/manifest.json'), `${JSON.stringify({ clips: urls }, null, 2)}\n`);
console.log(`${urls.length} clips → public/voice/manifest.json`);
