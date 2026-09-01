#!/usr/bin/env node
/**
 * Genera public/voice/*.mp3
 *   node scripts/gen-voice-clips.mjs          → Elvira (Edge, sin clave)
 *   node scripts/gen-voice-clips.mjs --openai → nova (hace falta OPENAI_API_KEY)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clips = JSON.parse(readFileSync(resolve(root, 'lib/voice-clips.json'), 'utf8'));
const openai = process.argv.includes('--openai');
const outDir = resolve(root, 'public/voice');
mkdirSync(outDir, { recursive: true });

if (!openai) {
  const py = resolve(root, 'scripts/gen-voice-clips.py');
  const r = spawnSync('python3', [py], { stdio: 'inherit', cwd: root });
  process.exit(r.status ?? 1);
}

const ASK =
  'Habla en español de España. Eres una mujer joven, voz dulce, suave y cercana, como una recepcionista joven de un centro de estética. Tono un poco más agudo, nunca grave ni de locutora. Pregunta breve, entonación interrogativa al final, sin prisa y sin teatralidad.';
const SAY =
  'Habla en español de España. Eres una mujer joven, voz dulce, suave y cercana, como una recepcionista joven de un centro de estética. Tono un poco más agudo, nunca grave ni de locutora. Frases cortas, claras, naturales. Sin teatralidad.';

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  for (const name of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(root, name), 'utf8');
      for (const line of raw.split('\n')) {
        const m = line.match(/^OPENAI_API_KEY=(.*)$/);
        if (m) return m[1].trim().replace(/^["']|["']$/g, '');
      }
    } catch { /* */ }
  }
  return '';
}

async function speak(key, text, kind) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
      instructions: kind === 'ask' ? ASK : SAY,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

const key = loadKey();
if (!key) {
  console.error('Falta OPENAI_API_KEY. Sin clave: npm run voice:clips (Elvira).');
  process.exit(1);
}

for (const clip of clips) {
  const dest = resolve(outDir, `${clip.id}.mp3`);
  process.stdout.write(`${clip.id}… `);
  const buf = await speak(key, clip.text, clip.kind);
  writeFileSync(dest, buf);
  console.log(`${buf.length} bytes`);
}
console.log(`${clips.length} clips nova en public/voice`);
